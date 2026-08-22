import { nowIso, stableId } from './id'
import type { AcceptanceCriterion, Priority, ReviewStatus, SpecProject, WorkingPreferences } from './types'

export function updateRequirement(
  project: SpecProject,
  requirementId: string,
  update: { title?: string; statement?: string; priority?: Priority; status?: ReviewStatus },
): SpecProject {
  const at = nowIso()
  return {
    ...project,
    requirements: project.requirements.map((item) => item.id === requirementId ? { ...item, ...update } : item),
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `requirement:${requirementId}:${JSON.stringify(update)}:${at}`),
        at,
        action: 'requirement.updated',
        detail: `${requirementId}: ${Object.keys(update).join(', ')}`,
      },
    ],
  }
}

export function updateAcceptanceCriterion(
  project: SpecProject,
  requirementId: string,
  criterionId: string,
  update: Partial<Pick<AcceptanceCriterion, 'given' | 'when' | 'then'>>,
): SpecProject {
  const requirement = project.requirements.find((item) => item.id === requirementId)
  const criterion = requirement?.criteria.find((item) => item.id === criterionId)
  if (!criterion) throw new Error(`Unknown acceptance criterion: ${criterionId}`)

  const next = {
    given: update.given?.trim() ?? criterion.given,
    when: update.when?.trim() ?? criterion.when,
    then: update.then?.trim() ?? criterion.then,
  }
  if (!next.given || !next.when || !next.then) {
    throw new Error('Given, When, and Then are all required')
  }

  const at = nowIso()
  return {
    ...project,
    requirements: project.requirements.map((item) => item.id === requirementId ? {
      ...item,
      status: 'modified',
      criteria: item.criteria.map((candidate) => candidate.id === criterionId ? {
        ...candidate,
        ...next,
        status: 'modified',
      } : candidate),
    } : item),
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `criterion:${criterionId}:${JSON.stringify(next)}:${at}`),
        at,
        action: 'acceptance-criterion.updated',
        detail: `${requirementId}/${criterionId}: Given, When, Then`,
      },
    ],
  }
}

interface RequirementDraftUpdate {
  title: string
  statement: string
  criteria: Array<Pick<AcceptanceCriterion, 'id' | 'given' | 'when' | 'then'>>
}

export function updateRequirementDraft(
  project: SpecProject,
  requirementId: string,
  update: RequirementDraftUpdate,
): SpecProject {
  const requirement = project.requirements.find((item) => item.id === requirementId)
  if (!requirement) throw new Error(`Unknown requirement: ${requirementId}`)

  const title = update.title.trim()
  const statement = update.statement.trim()
  const criteria = new Map(update.criteria.map((criterion) => [criterion.id, {
    given: criterion.given.trim(),
    when: criterion.when.trim(),
    then: criterion.then.trim(),
  }]))
  if (!title || !statement || requirement.criteria.some((criterion) => {
    const next = criteria.get(criterion.id)
    return !next?.given || !next.when || !next.then
  })) {
    throw new Error('Title, requirement, and every Given / When / Then field are required')
  }

  const at = nowIso()
  const observed = `${requirement.title}\n${requirement.statement}\n${requirement.criteria.map((criterion) => `${criterion.given} | ${criterion.when} | ${criterion.then}`).join('\n')}`
  const expected = `${title}\n${statement}\n${requirement.criteria.map((criterion) => {
    const next = criteria.get(criterion.id)
    return `${next?.given} | ${next?.when} | ${next?.then}`
  }).join('\n')}`
  const changed = observed !== expected
  return {
    ...project,
    requirements: project.requirements.map((item) => item.id === requirementId ? {
      ...item,
      title,
      statement,
      status: 'modified',
      criteria: item.criteria.map((criterion) => ({
        ...criterion,
        ...criteria.get(criterion.id),
        status: 'modified',
      })),
    } : item),
    failureCases: changed ? [...project.failureCases, {
      id: stableId('failure', `human-correction:${requirementId}:${at}`),
      createdAt: at,
      status: 'pending-review' as const,
      dimension: 'human-correction' as const,
      summary: `Human corrected generated requirement: ${requirement.title}`,
      evidenceIds: requirement.evidenceIds,
      observed,
      expected,
    }] : project.failureCases,
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `requirement-draft:${requirementId}:${at}`),
        at,
        action: 'requirement.draft.updated',
        detail: `${requirementId}: title, statement, ${requirement.criteria.length} acceptance criteria`,
      },
    ],
  }
}

export function reviewFailureCase(project: SpecProject, failureId: string, status: 'accepted' | 'rejected'): SpecProject {
  const failure = project.failureCases.find((item) => item.id === failureId)
  if (!failure) throw new Error(`Unknown failure case: ${failureId}`)
  const at = nowIso()
  return {
    ...project,
    failureCases: project.failureCases.map((item) => item.id === failureId ? { ...item, status, reviewedAt: at } : item),
    updatedAt: at,
    audit: [...project.audit, {
      id: stableId('audit', `failure:${failureId}:${status}:${at}`),
      at,
      action: 'failure-case.reviewed',
      detail: `${failure.dimension}: ${status}; ${failure.summary}`,
    }],
  }
}

export function updatePreferences(project: SpecProject, preferences: Partial<Omit<WorkingPreferences, 'updatedAt'>>): SpecProject {
  const at = nowIso()
  return {
    ...project,
    preferences: { ...project.preferences, ...preferences, updatedAt: at },
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `preferences:${JSON.stringify(preferences)}:${at}`),
        at,
        action: 'preferences.updated',
        detail: JSON.stringify(preferences),
      },
    ],
  }
}

export function resolveImpact(project: SpecProject, impactId: string): SpecProject {
  const impact = project.impacts.find((item) => item.id === impactId)
  if (!impact) throw new Error(`Unknown impact finding: ${impactId}`)
  if (impact.status === 'resolved') return project

  const at = nowIso()
  const impacts = project.impacts.map((item) => item.id === impactId ? { ...item, status: 'resolved' as const, resolvedAt: at } : item)
  const stillAtRisk = new Set(impacts
    .filter((item) => item.status !== 'resolved')
    .flatMap((item) => item.affectedNodeIds))
  const resolvedNodeIds = new Set(impact.affectedNodeIds)

  return {
    ...project,
    impacts,
    decisions: project.decisions.map((item) =>
      resolvedNodeIds.has(item.id) && !stillAtRisk.has(item.id) ? { ...item, status: 'accepted' as const } : item,
    ),
    requirements: project.requirements.map((item) =>
      resolvedNodeIds.has(item.id) && !stillAtRisk.has(item.id) ? { ...item, status: 'accepted' as const } : item,
    ),
    updatedAt: at,
    audit: [
      ...project.audit,
      {
        id: stableId('audit', `impact:${impactId}:resolved:${at}`),
        at,
        action: 'impact.resolved',
        detail: `${impactId}: current decision or requirement confirmed`,
      },
    ],
  }
}

export function markAllRequirements(project: SpecProject, status: ReviewStatus): SpecProject {
  return project.requirements.reduce(
    (current, requirement) => updateRequirement(current, requirement.id, { status }),
    project,
  )
}
