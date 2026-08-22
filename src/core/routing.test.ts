import { describe, expect, it } from 'vitest'
import { analyzeMaterial, answerQuestion } from './reasoner'
import { DEMO_SOURCE } from './sample'
import { createProject } from './stateMachine'

describe('adaptive analysis routing', () => {
  it('uses one clarification slot for low-complexity material', () => {
    const project = analyzeMaterial(createProject('Simple'), 'Interview', '参与者可以查看证据原文和行号。', 'paste', 'user-interview')

    expect(project.analysisPlan).toMatchObject({ complexity: 'simple', route: 'deterministic', questionBudget: 1 })
    expect(project.questions.length).toBeLessThanOrEqual(1)
  })

  it('routes high-risk material to model assistance with a five-question ceiling', () => {
    const project = analyzeMaterial(createProject('High risk'), 'Discussion', DEMO_SOURCE, 'markdown', 'meeting')

    expect(project.analysisPlan).toMatchObject({ complexity: 'high-risk', route: 'model-assisted', questionBudget: 5, reviewRequired: true })
    expect(project.questions).toHaveLength(5)
  })

  it('applies a complex risk floor to a single high-severity missing condition', () => {
    const project = analyzeMaterial(createProject('Risk floor'), 'Upload request', '用户需要上传 PDF 文档。')

    expect(project.analysisPlan).toMatchObject({
      policyVersion: 'risk-floor-v2',
      complexity: 'complex',
      requestedTier: 'small',
      reviewRequired: true,
      reviewTriggers: ['high-severity'],
    })
  })

  it('stops below-threshold questions after blocking risks are resolved', () => {
    let project = analyzeMaterial(createProject('Early stop'), 'Discussion', DEMO_SOURCE, 'markdown', 'meeting')
    for (const original of project.questions) {
      const current = project.questions.find((item) => item.id === original.id)
      if (current && !current.answer && !current.skippedAt) {
        project = answerQuestion(project, current.id, current.recommendationId ?? current.options[0].id)
      }
    }

    expect(project.analysisPlan?.earlyStop).toMatchObject({ triggered: true, minInformationGain: 7 })
    expect(project.questions.filter((item) => item.skippedAt)).toHaveLength(1)
    expect(project.audit.some((item) => item.action === 'clarification.early-stopped')).toBe(true)
  })
})
