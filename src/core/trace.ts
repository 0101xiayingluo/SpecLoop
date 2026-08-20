import type { ReviewStatus, SpecProject, TraceNode, TraceNodeType } from './types'

export interface TraceNodeDetails {
  id: string
  type: TraceNodeType
  label: string
  description: string
  evidenceIds: string[]
  status?: ReviewStatus
}

export function buildTraceNodes(project: SpecProject): TraceNode[] {
  return [
    ...project.evidence.map((item) => ({ id: item.id, type: 'evidence' as const, label: item.quote })),
    ...project.problems.map((item) => ({ id: item.id, type: 'problem' as const, label: item.statement, status: item.status })),
    ...project.decisions.map((item) => ({ id: item.id, type: 'decision' as const, label: item.statement, status: item.status })),
    ...project.requirements.map((item) => ({ id: item.id, type: 'requirement' as const, label: item.title, status: item.status })),
    ...project.requirements.flatMap((requirement) => requirement.criteria.map((item) => ({
      id: item.id,
      type: 'criterion' as const,
      label: `Given ${item.given} / When ${item.when} / Then ${item.then}`,
      status: item.status,
    }))),
  ]
}

export function traceCoverage(project: SpecProject): { covered: number; total: number; percentage: number } {
  const total = project.requirements.reduce((sum, requirement) => sum + 1 + requirement.criteria.length, 0)
  const covered = project.requirements.reduce((sum, requirement) => {
    const requirementCovered = requirement.evidenceIds.length > 0 ? 1 : 0
    const criteriaCovered = requirement.criteria.filter((criterion) => criterion.evidenceIds.length > 0).length
    return sum + requirementCovered + criteriaCovered
  }, 0)
  return { covered, total, percentage: total === 0 ? 0 : Math.round((covered / total) * 100) }
}

export function traceNodeDetails(project: SpecProject, nodeId: string): TraceNodeDetails | null {
  const evidence = project.evidence.find((item) => item.id === nodeId)
  if (evidence) {
    const source = project.sources.find((item) => item.id === evidence.sourceId)
    return {
      id: evidence.id,
      type: 'evidence',
      label: source?.title ?? 'Source evidence',
      description: evidence.quote,
      evidenceIds: [evidence.id],
    }
  }

  const problem = project.problems.find((item) => item.id === nodeId)
  if (problem) return { ...problem, type: 'problem', label: 'User problem', description: problem.statement }

  const decision = project.decisions.find((item) => item.id === nodeId)
  if (decision) {
    return {
      id: decision.id,
      type: 'decision',
      label: 'Product decision',
      description: `${decision.statement}\n${decision.rationale}`,
      evidenceIds: decision.evidenceIds,
      status: decision.status,
    }
  }

  const requirement = project.requirements.find((item) => item.id === nodeId)
  if (requirement) {
    return {
      id: requirement.id,
      type: 'requirement',
      label: requirement.title,
      description: requirement.statement,
      evidenceIds: requirement.evidenceIds,
      status: requirement.status,
    }
  }

  for (const owner of project.requirements) {
    const criterion = owner.criteria.find((item) => item.id === nodeId)
    if (!criterion) continue
    return {
      id: criterion.id,
      type: 'criterion',
      label: `${owner.title} acceptance`,
      description: `Given ${criterion.given}\nWhen ${criterion.when}\nThen ${criterion.then}`,
      evidenceIds: criterion.evidenceIds,
      status: criterion.status,
    }
  }

  return null
}
