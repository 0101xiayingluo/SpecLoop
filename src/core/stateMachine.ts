import type { SpecProject, WorkflowStage } from './types'
import { nowIso, stableId } from './id'

const allowedTransitions: Record<WorkflowStage, WorkflowStage[]> = {
  intake: ['clarify'],
  clarify: ['draft', 'intake'],
  draft: ['trace', 'clarify'],
  trace: ['review', 'draft'],
  review: ['trace', 'clarify'],
}

export function canTransition(project: SpecProject, next: WorkflowStage): boolean {
  if (!allowedTransitions[project.stage].includes(next)) return false
  if (next === 'clarify') return project.evidence.length > 0
  if (next === 'draft') return project.questions.every((question) => Boolean(question.answer || question.skippedAt))
  if (next === 'trace') return project.requirements.length > 0
  if (next === 'review') {
    const knownEvidenceIds = new Set(project.evidence.map((item) => item.id))
    const linksKnownEvidence = (evidenceIds: string[]) =>
      evidenceIds.length > 0 && evidenceIds.every((id) => knownEvidenceIds.has(id))
    return project.requirements.every(
      (requirement) => linksKnownEvidence(requirement.evidenceIds)
        && requirement.criteria.every((criterion) => linksKnownEvidence(criterion.evidenceIds)),
    )
  }
  return true
}

export function transition(project: SpecProject, next: WorkflowStage): SpecProject {
  if (!canTransition(project, next)) {
    throw new Error(`Invalid workflow transition: ${project.stage} -> ${next}`)
  }
  const at = nowIso()
  return {
    ...project,
    stage: next,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `${project.id}:${project.stage}:${next}:${at}`),
        at,
        action: 'stage.transitioned',
        detail: `${project.stage} -> ${next}`,
      },
    ],
  }
}

export function createProject(name = 'Untitled specification'): SpecProject {
  const at = nowIso()
  return {
    id: stableId('project', `${name}:${at}`),
    name,
    stage: 'intake',
    createdAt: at,
    updatedAt: at,
    sources: [],
    evidence: [],
    issues: [],
    questions: [],
    currentQuestionIndex: 0,
    problems: [],
    decisions: [],
    requirements: [],
    edges: [],
    preferences: {
      reasonerMode: 'demo',
      priorityMode: 'risk-first',
      writingStyle: 'concise',
      riskTolerance: 'low',
      updatedAt: at,
    },
    impacts: [],
    agentRuns: [],
    failureCases: [],
    audit: [
      {
        id: stableId('audit', `${name}:${at}`),
        at,
        action: 'project.created',
        detail: name,
      },
    ],
  }
}
