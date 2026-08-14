import type { SpecProject, TraceNode } from './types'

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

