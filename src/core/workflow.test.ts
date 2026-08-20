import { describe, expect, it } from 'vitest'
import { exportGithubIssues, exportPrd, exportUserStories } from './exports'
import { markAllRequirements, resolveImpact, updateAcceptanceCriterion, updateRequirement } from './projectActions'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_FEEDBACK, DEMO_SOURCE } from './sample'
import { createProject, transition } from './stateMachine'
import { traceCoverage } from './trace'

describe('complete SpecLoop workflow', () => {
  it('runs intake through review, feedback resolution, and export', () => {
    let project = analyzeMaterial(createProject('End-to-end demo'), 'Discussion', DEMO_SOURCE, 'markdown')
    for (const question of project.questions) {
      project = answerQuestion(project, question.id, question.recommendationId ?? question.options[0].id)
    }
    project = synthesizeProject(project)
    project = updateRequirement(project, project.requirements[0].id, { priority: 'P0', status: 'accepted' })
    project = updateAcceptanceCriterion(project, project.requirements[0].id, project.requirements[0].criteria[0].id, {
      given: '用户已准备讨论材料',
      when: '用户提交材料并确认需求',
      then: '系统保留可回溯的需求和验收结果',
    })
    project = transition(project, 'trace')
    project = transition(project, 'review')
    project = addFeedback(project, 'New course constraint', DEMO_FEEDBACK)

    expect(project.stage).toBe('review')
    expect(project.impacts.length).toBeGreaterThan(0)
    expect(project.requirements.some((item) => item.status === 'at-risk')).toBe(true)

    for (const impact of project.impacts) project = resolveImpact(project, impact.id)
    project = markAllRequirements(project, 'accepted')
    const outputs = [exportPrd(project), exportUserStories(project), exportGithubIssues(project)]

    expect(traceCoverage(project).percentage).toBe(100)
    expect(project.requirements.every((item) => item.status === 'accepted')).toBe(true)
    expect(outputs.every((output) => output.toLowerCase().includes('evidence') && output.includes('Given'))).toBe(true)
  })
})
