import { nowIso, stableId } from './id'
import type { Priority, ReviewStatus, SpecProject, WorkingPreferences } from './types'

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

