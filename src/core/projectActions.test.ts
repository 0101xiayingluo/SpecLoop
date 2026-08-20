import { describe, expect, it } from 'vitest'
import { updateAcceptanceCriterion } from './projectActions'
import { analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_SOURCE } from './sample'
import { createProject } from './stateMachine'

function synthesizedDemo() {
  let project = analyzeMaterial(createProject('Editable acceptance'), 'Demo source', DEMO_SOURCE, 'markdown')
  for (const question of project.questions) {
    project = answerQuestion(project, question.id, question.recommendationId ?? question.options[0].id)
  }
  return synthesizeProject(project)
}

describe('project actions', () => {
  it('updates a complete acceptance criterion and records the edit', () => {
    const project = synthesizedDemo()
    const requirement = project.requirements[0]
    const criterion = requirement.criteria[0]
    const updated = updateAcceptanceCriterion(project, requirement.id, criterion.id, {
      given: '用户已经添加一份讨论材料',
      when: '用户保存修改后的验收标准',
      then: '系统保留修改内容和对应来源证据',
    })
    const saved = updated.requirements[0].criteria[0]

    expect(saved.given).toContain('讨论材料')
    expect(saved.status).toBe('modified')
    expect(updated.requirements[0].status).toBe('modified')
    expect(updated.audit.at(-1)?.action).toBe('acceptance-criterion.updated')
  })

  it('rejects an incomplete acceptance criterion', () => {
    const project = synthesizedDemo()
    const requirement = project.requirements[0]
    const criterion = requirement.criteria[0]

    expect(() => updateAcceptanceCriterion(project, requirement.id, criterion.id, { then: '  ' }))
      .toThrow('Given, When, and Then are all required')
  })
})
