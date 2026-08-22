import { describe, expect, it } from 'vitest'
import { resolveImpact, reviewFailureCase, updateAcceptanceCriterion, updateRequirementDraft } from './projectActions'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_FEEDBACK, DEMO_SOURCE } from './sample'
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

  it('saves requirement text and acceptance criteria as one transaction', () => {
    const project = synthesizedDemo()
    const requirement = project.requirements[0]
    const criterion = requirement.criteria[0]
    const updated = updateRequirementDraft(project, requirement.id, {
      title: '可编辑的需求标题',
      statement: '系统必须一次保存完整需求草稿。',
      criteria: [{
        id: criterion.id,
        given: '用户正在编辑需求',
        when: '用户点击保存',
        then: '标题、正文和验收标准同时更新',
      }],
    })
    const saved = updated.requirements[0]

    expect(saved.title).toBe('可编辑的需求标题')
    expect(saved.statement).toContain('完整需求草稿')
    expect(saved.criteria[0].then).toContain('同时更新')
    expect(saved.status).toBe('modified')
    expect(updated.audit.at(-1)?.action).toBe('requirement.draft.updated')
    expect(updated.failureCases.at(-1)).toMatchObject({ dimension: 'human-correction', status: 'pending-review' })
  })

  it('requires human review before a correction becomes a regression asset', () => {
    const project = synthesizedDemo()
    const requirement = project.requirements[0]
    const corrected = updateRequirementDraft(project, requirement.id, {
      title: `${requirement.title} corrected`,
      statement: requirement.statement,
      criteria: requirement.criteria.map((criterion) => ({ id: criterion.id, given: criterion.given, when: criterion.when, then: criterion.then })),
    })
    const failure = corrected.failureCases.at(-1)!
    const reviewed = reviewFailureCase(corrected, failure.id, 'accepted')

    expect(reviewed.failureCases.at(-1)).toMatchObject({ status: 'accepted' })
    expect(reviewed.audit.at(-1)?.action).toBe('failure-case.reviewed')
  })

  it('closes a reviewed impact and clears its affected node risk', () => {
    const impacted = addFeedback(synthesizedDemo(), 'Changed upload constraint', DEMO_FEEDBACK)
    const finding = impacted.impacts[0]
    const resolved = resolveImpact(impacted, finding.id)
    const affectedIds = new Set(finding.affectedNodeIds)

    expect(resolved.impacts.find((item) => item.id === finding.id)?.status).toBe('resolved')
    expect(resolved.decisions.filter((item) => affectedIds.has(item.id)).every((item) => item.status !== 'at-risk')).toBe(true)
    expect(resolved.requirements.filter((item) => affectedIds.has(item.id)).every((item) => item.status !== 'at-risk')).toBe(true)
    expect(resolved.audit.at(-1)?.action).toBe('impact.resolved')
  })
})
