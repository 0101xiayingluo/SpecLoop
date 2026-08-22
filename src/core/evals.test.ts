import { describe, expect, it } from 'vitest'
import cases from '../../evals/cases.json'
import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'
import { conflictMetrics, evaluateDimensions } from './evaluation'

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
    const { precision, recall } = conflictMetrics(cases)

    expect(precision).toBe(1)
    expect(recall).toBe(1)
  })

  it('reports six separate quality dimensions without inventing live model data', () => {
    const project = analyzeMaterial(createProject('Dimensions'), 'Notes', '用户需要上传 PDF。开发说首版只支持粘贴，上传以后再做。')
    const dimensions = evaluateDimensions(project, cases)

    expect(dimensions.map((item) => item.key)).toEqual([
      'conflict-quality', 'grounding', 'trace-faithfulness', 'question-efficiency', 'change-selectivity', 'telemetry',
    ])
    expect(dimensions.find((item) => item.key === 'telemetry')).toMatchObject({ status: 'waiting', result: 'Awaiting live run' })
  })
})
