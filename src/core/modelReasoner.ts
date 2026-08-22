import { z } from 'zod'
import { nowIso, stableId } from './id'
import { agentApiUrl } from './api'
import type { AgentRun, ClarificationQuestion, RequirementIssue, SpecProject } from './types'

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
  selfAssessment: z.object({
    confidence: z.number().min(0).max(1),
    reviewRecommended: z.boolean(),
    unresolvedRisks: z.array(z.string().min(1).max(240)).max(6),
  }),
})

const AgentRunSchema = z.object({
  id: z.string().min(1),
  provider: z.literal('openai'),
  model: z.string().min(1),
  status: z.enum(['succeeded', 'failed']),
  startedAt: z.string().min(1),
  completedAt: z.string().min(1),
  requestId: z.string().min(1).optional(),
  inputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  serverLatencyMs: z.number().nonnegative(),
  clientLatencyMs: z.number().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  pricingConfigured: z.boolean(),
  error: z.string().max(800).optional(),
})

const ModelReasonerEnvelopeSchema = z.object({
  analysis: z.unknown(),
  run: AgentRunSchema,
})

const ModelErrorResponseSchema = z.object({
  error: z.string().optional(),
  detail: z.string().optional(),
  run: AgentRunSchema.optional(),
})

export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>

export class ModelProviderError extends Error {
  run?: AgentRun

  constructor(message: string, run?: AgentRun) {
    super(message)
    this.name = 'ModelProviderError'
    this.run = run
  }
}

function normalizeModelAnalysis(project: SpecProject, payload: unknown): Pick<SpecProject, 'evidence' | 'issues' | 'questions' | 'modelSelfAssessment'> {
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
    .slice(0, Math.min(MAX_QUESTIONS, project.analysisPlan?.questionBudget ?? MAX_QUESTIONS))

  const issueSignal = new Map<string, 'conflict' | 'assumption' | 'constraint'>()
  for (const issue of issuesByKey.values()) {
    const signal = issue.kind === 'conflict' ? 'conflict' : issue.kind === 'assumption' ? 'assumption' : 'constraint'
    issue.evidenceIds.forEach((id) => issueSignal.set(id, signal))
  }

  return {
    evidence: project.evidence.map((item) => ({ ...item, signal: issueSignal.get(item.id) ?? item.signal })),
    issues: [...issuesByKey.values()],
    questions,
    modelSelfAssessment: analysis.selfAssessment,
  }
}

export async function enhanceAnalysisWithModel(
  project: SpecProject,
  request: typeof fetch = fetch,
): Promise<SpecProject> {
  const startedAt = new Date().toISOString()
  const clientStart = performance.now()
  let response: Response
  try {
    response = await request(agentApiUrl('/api/reason'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence: project.evidence.map((item) => ({ id: item.id, quote: item.quote, line: item.lineStart })),
        preferences: project.preferences,
        maxQuestions: Math.min(MAX_QUESTIONS, project.analysisPlan?.questionBudget ?? MAX_QUESTIONS),
        routing: {
          complexity: project.analysisPlan?.complexity ?? 'complex',
          requestedTier: project.analysisPlan?.complexity === 'high-risk' ? 'large' : 'small',
          reviewRequired: project.analysisPlan?.reviewRequired ?? true,
        },
      }),
    })
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Model provider request failed'
    const completedAt = new Date().toISOString()
    throw new ModelProviderError(message, {
      id: stableId('run', `network:${project.id}:${startedAt}`),
      provider: 'openai',
      model: 'unavailable',
      status: 'failed',
      startedAt,
      completedAt,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      serverLatencyMs: 0,
      clientLatencyMs: Math.round(performance.now() - clientStart),
      estimatedCostUsd: null,
      pricingConfigured: false,
      error: message.slice(0, 800),
    })
  }

  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const parsed = ModelErrorResponseSchema.safeParse(payload)
    const message = parsed.success
      ? [parsed.data.error, parsed.data.detail].filter(Boolean).join(': ')
      : `Model provider returned ${response.status}`
    const run = parsed.success && parsed.data.run ? {
      ...parsed.data.run,
      clientLatencyMs: Math.round(performance.now() - clientStart),
    } : undefined
    throw new ModelProviderError(message || `Model provider returned ${response.status}`, run)
  }

  const result = ModelReasonerEnvelopeSchema.parse(payload)
  const run: AgentRun = {
    ...result.run,
    clientLatencyMs: Math.round(performance.now() - clientStart),
  }
  let normalized: Pick<SpecProject, 'evidence' | 'issues' | 'questions' | 'modelSelfAssessment'>
  try {
    normalized = normalizeModelAnalysis(project, result.analysis)
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Model response failed validation'
    throw new ModelProviderError(`Model response rejected: ${message}`, {
      ...run,
      status: 'failed',
      error: message.slice(0, 800),
    })
  }
  const at = nowIso()
  return {
    ...project,
    ...normalized,
    agentRuns: [...project.agentRuns, run],
    currentQuestionIndex: 0,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `model-analysis:${project.id}:${at}`),
        at,
        action: 'model.analysis.completed',
        detail: `${run.model}: ${run.totalTokens} tokens, ${run.clientLatencyMs} ms, ${normalized.issues.length} issues, ${normalized.questions.length} validated questions; self-confidence ${Math.round((normalized.modelSelfAssessment?.confidence ?? 0) * 100)}%`,
      },
    ],
  }
}

export function recordModelFallback(project: SpecProject, reason: string, run?: AgentRun): SpecProject {
  const at = nowIso()
  const dimension = /evidence|ground/i.test(reason) ? 'grounding' as const : /schema|valid/i.test(reason) ? 'schema' as const : 'provider' as const
  return {
    ...project,
    agentRuns: run ? [...project.agentRuns, run] : project.agentRuns,
    failureCases: [...project.failureCases, {
      id: stableId('failure', `${dimension}:${project.id}:${at}`),
      createdAt: at,
      status: 'pending-review',
      dimension,
      summary: 'Model path failed and deterministic baseline was retained',
      evidenceIds: project.evidence.map((item) => item.id),
      observed: reason.slice(0, 800),
      expected: 'Return schema-valid, evidence-grounded analysis within the adaptive question budget.',
    }],
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
