import { describe, expect, it } from 'vitest'
import cases from '../../evals/cases.json'
import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'

describe('conflict evaluation fixtures', () => {
  for (const fixture of cases) {
    it(fixture.id, () => {
      const project = analyzeMaterial(createProject(fixture.id), fixture.id, fixture.input)
      const conflicts = project.issues.filter((issue) => issue.kind === 'conflict')
      if (fixture.expectedConflict) {
        expect(conflicts.some((issue) => issue.title === fixture.expectedConflict)).toBe(true)
      } else {
        expect(conflicts).toHaveLength(0)
      }
      expect(project.questions.length).toBeLessThanOrEqual(5)
    })
  }

  it('reports perfect binary precision and recall on the labeled smoke set', () => {
    let truePositive = 0
    let falsePositive = 0
    let falseNegative = 0
    for (const fixture of cases) {
      const project = analyzeMaterial(createProject(fixture.id), fixture.id, fixture.input)
      const predicted = project.issues.some((issue) => issue.kind === 'conflict')
      const expected = Boolean(fixture.expectedConflict)
      if (predicted && expected) truePositive += 1
      if (predicted && !expected) falsePositive += 1
      if (!predicted && expected) falseNegative += 1
    }
    const precision = truePositive / (truePositive + falsePositive)
    const recall = truePositive / (truePositive + falseNegative)

    expect(precision).toBe(1)
    expect(recall).toBe(1)
  })
})
