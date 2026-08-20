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

export function markAllRequirements(project: SpecProject, status: ReviewStatus): SpecProject {
  return project.requirements.reduce(
    (current, requirement) => updateRequirement(current, requirement.id, { status }),
    project,
  )
}
