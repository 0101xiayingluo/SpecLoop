import { z } from 'zod'
import type { SpecProject } from './types'

const STORAGE_KEY = 'specloop.project.v1'

const StoredProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: z.enum(['intake', 'clarify', 'draft', 'trace', 'review']),
  sources: z.array(z.unknown()),
  evidence: z.array(z.unknown()),
  requirements: z.array(z.unknown()),
}).passthrough()

export function loadProject(): SpecProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    const result = StoredProjectSchema.safeParse(parsed)
    return result.success ? result.data as SpecProject : null
  } catch {
    return null
  }
}

export function saveProject(project: SpecProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
}

export function clearProject(): void {
  localStorage.removeItem(STORAGE_KEY)
}

