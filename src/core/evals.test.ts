import { describe, expect, it } from 'vitest'
import cases from '../../evals/cases.json'
import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'

describe('conflict evaluation fixtures', () => {
  for (const fixture of cases) {
    it(fixture.id, () => {
      const project = analyzeMaterial(createProject(fixture.id), fixture.id, fixture.input)
      expect(project.issues.some((issue) => issue.title === fixture.expectedConflict)).toBe(true)
      expect(project.questions.length).toBeLessThanOrEqual(5)
    })
  }
})

