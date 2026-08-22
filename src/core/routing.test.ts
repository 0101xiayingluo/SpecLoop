import { describe, expect, it } from 'vitest'
import { analyzeMaterial } from './reasoner'
import { DEMO_SOURCE } from './sample'
import { createProject } from './stateMachine'

describe('adaptive analysis routing', () => {
  it('uses one clarification slot for low-complexity material', () => {
    const project = analyzeMaterial(createProject('Simple'), 'Interview', '用户需要查看需求来源。', 'paste', 'user-interview')

    expect(project.analysisPlan).toMatchObject({ complexity: 'simple', route: 'deterministic', questionBudget: 1 })
    expect(project.questions.length).toBeLessThanOrEqual(1)
  })

  it('routes high-risk material to model assistance with a five-question ceiling', () => {
    const project = analyzeMaterial(createProject('High risk'), 'Discussion', DEMO_SOURCE, 'markdown', 'meeting')

    expect(project.analysisPlan).toMatchObject({ complexity: 'high-risk', route: 'model-assisted', questionBudget: 5, reviewRequired: true })
    expect(project.questions).toHaveLength(5)
  })
})
