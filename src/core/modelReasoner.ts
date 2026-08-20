import { z } from 'zod'
import { nowIso, stableId } from './id'
import type { ClarificationQuestion, RequirementIssue, SpecProject } from './types'

const MAX_QUESTIONS = 5

const ModelIssueSchema = z.object({
  key: z.string().min(1).max(80),
  kind: z.enum(['conflict', 'missing', 'assumption']),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(600),
  severity: z.enum(['high', 'medium', 'low']),
  evidenceIds: z.array(z.string().min(1)).min(1).max(6),
})

const ModelQuestionSchema = z.object({
  key: z.string().min(1).max(80),
  prompt: z.string().min(1).max(280),
  why: z.string().min(1).max(400),
  informationGain: z.number().min(0).max(100),
  issueKeys: z.array(z.string().min(1)).min(1).max(4),
  options: z.array(z.object({
    label: z.string().min(1).max(120),
    value: z.string().min(1).max(400),
  })).min(2).max(4),
  recommendationIndex: z.number().int().min(0).max(3),
})

const ModelAnalysisSchema = z.object({
  issues: z.array(ModelIssueSchema).max(16),
  questions: z.array(ModelQuestionSchema).max(10),
})

export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>

function normalizeModelAnalysis(project: SpecProject, payload: unknown): Pick<SpecProject, 'evidence' | 'issues' | 'questions'> {
  const analysis = ModelAnalysisSchema.parse(payload)
  const validEvidenceIds = new Set(project.evidence.map((item) => item.id))
  const issuesByKey = new Map<string, RequirementIssue>()

  for (const candidate of analysis.issues) {
    if (candidate.evidenceIds.some((id) => !validEvidenceIds.has(id))) {
      throw new Error(`Model referenced unknown evidence in issue: ${candidate.key}`)
    }
    const issue: RequirementIssue = {
      id: stableId('issue', `model:${candidate.key}:${candidate.evidenceIds.join(':')}`),
      kind: candidate.kind,
      title: candidate.title,
      description: candidate.description,
      severity: candidate.severity,
      evidenceIds: [...new Set(candidate.evidenceIds)],
      resolved: false,
    }
    issuesByKey.set(candidate.key, issue)
  }

  const questions = analysis.questions
    .map((candidate): ClarificationQuestion | null => {
      const issueIds = candidate.issueKeys.map((key) => issuesByKey.get(key)?.id).filter((id): id is string => Boolean(id))
      if (issueIds.length === 0 || candidate.recommendationIndex >= candidate.options.length) return null
      const options = candidate.options.map((option, index) => ({
        id: String.fromCharCode(65 + index),
        label: option.label,
        value: option.value,
      }))
      return {
        id: stableId('question', `model:${candidate.key}:${issueIds.join(':')}`),
        prompt: candidate.prompt,
        why: candidate.why,
        informationGain: candidate.informationGain,
        issueIds: [...new Set(issueIds)],
        options,
        recommendationId: options[candidate.recommendationIndex]?.id,
      }
    })
    .filter((question): question is ClarificationQuestion => Boolean(question))
    .sort((left, right) => right.informationGain - left.informationGain)
    .slice(0, MAX_QUESTIONS)

  const issueSignal = new Map<string, 'conflict' | 'assumption' | 'constraint'>()
  for (const issue of issuesByKey.values()) {
    const signal = issue.kind === 'conflict' ? 'conflict' : issue.kind === 'assumption' ? 'assumption' : 'constraint'
    issue.evidenceIds.forEach((id) => issueSignal.set(id, signal))
  }

  return {
    evidence: project.evidence.map((item) => ({ ...item, signal: issueSignal.get(item.id) ?? item.signal })),
    issues: [...issuesByKey.values()],
    questions,
  }
}

export async function enhanceAnalysisWithModel(
  project: SpecProject,
  request: typeof fetch = fetch,
): Promise<SpecProject> {
  const response = await request('/api/reason', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      evidence: project.evidence.map((item) => ({ id: item.id, quote: item.quote, line: item.lineStart })),
      preferences: project.preferences,
      maxQuestions: MAX_QUESTIONS,
    }),
  })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Model provider returned ${response.status}`)
  }

  const normalized = normalizeModelAnalysis(project, await response.json())
  const at = nowIso()
  return {
    ...project,
    ...normalized,
    currentQuestionIndex: 0,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `model-analysis:${project.id}:${at}`),
        at,
        action: 'model.analysis.completed',
        detail: `${normalized.issues.length} issues, ${normalized.questions.length} validated questions`,
      },
    ],
  }
}

export function recordModelFallback(project: SpecProject, reason: string): SpecProject {
  const at = nowIso()
  return {
    ...project,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `model-fallback:${project.id}:${at}`),
        at,
        action: 'model.analysis.fallback',
        detail: reason.slice(0, 240),
      },
    ],
  }
}
