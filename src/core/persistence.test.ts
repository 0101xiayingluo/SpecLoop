import { describe, expect, it } from 'vitest'
import { normalizeStoredProject } from './persistence'

describe('project persistence migration', () => {
  it('adds defaults required by newer releases to an older project', () => {
    const migrated = normalizeStoredProject({
      id: 'project-old',
      name: 'Older project',
      stage: 'review',
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
      sources: [],
      evidence: [],
      requirements: [],
      preferences: {
        priorityMode: 'risk-first',
        writingStyle: 'concise',
        riskTolerance: 'low',
      },
      impacts: [{
        id: 'impact-old',
        severity: 'high',
        feedbackEvidenceIds: [],
        affectedNodeIds: [],
        explanation: 'Legacy impact',
      }],
    })

    expect(migrated?.preferences.reasonerMode).toBe('demo')
    expect(migrated?.impacts[0].status).toBe('open')
    expect(migrated?.questions).toEqual([])
    expect(migrated?.agentRuns).toEqual([])
    expect(migrated?.audit).toEqual([])
  })

  it('rejects malformed local data instead of crashing the app', () => {
    expect(normalizeStoredProject({ id: 123, stage: 'unknown' })).toBeNull()
  })
})
