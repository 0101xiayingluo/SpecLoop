import { describe, expect, it } from 'vitest'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_FEEDBACK, DEMO_SOURCE } from './sample'
import { createProject } from './stateMachine'
import { traceCoverage } from './trace'

function answeredDemo() {
  let project = analyzeMaterial(createProject('Demo'), 'Demo source', DEMO_SOURCE, 'markdown')
  for (const question of project.questions) {
    const optionId = question.prompt.includes('材料导入范围') ? 'B' : question.recommendationId ?? question.options[0].id
    project = answerQuestion(project, question.id, optionId)
  }
  return project
}

describe('demo reasoner', () => {
  it('finds conflicts and asks only the highest-value questions', () => {
    const project = analyzeMaterial(createProject('Demo'), 'Demo source', DEMO_SOURCE, 'markdown')

    expect(project.issues.filter((issue) => issue.kind === 'conflict')).toHaveLength(2)
    expect(project.questions).toHaveLength(5)
    expect(project.questions[0].prompt).toContain('材料导入范围冲突')
    expect(new Set(project.questions.map((question) => question.prompt)).size).toBe(project.questions.length)
    expect(project.questions.some((question) => question.prompt.includes('材料无法解析'))).toBe(true)
    expect(project.questions.some((question) => question.prompt.includes('最终接受权'))).toBe(true)
  })

  it('generates fully sourced requirements and acceptance criteria', () => {
    const project = synthesizeProject(answeredDemo())
    const coverage = traceCoverage(project)

    expect(project.requirements).toHaveLength(7)
    expect(project.requirements.every((requirement) => requirement.evidenceIds.length > 0)).toBe(true)
    expect(project.requirements.every((requirement) => requirement.criteria.every((criterion) => criterion.evidenceIds.length > 0))).toBe(true)
    expect(coverage.percentage).toBe(100)
  })

  it('flags only feedback-related decisions and requirements', () => {
    const synthesized = synthesizeProject(answeredDemo())
    const impacted = addFeedback(synthesized, 'New acceptance feedback', DEMO_FEEDBACK)
    const affectedIds = new Set(impacted.impacts.flatMap((impact) => impact.affectedNodeIds))
    const pasteDecision = impacted.decisions.find((decision) => decision.statement.includes('只支持粘贴文本'))
    const authorityDecision = impacted.decisions.find((decision) => decision.statement.includes('项目负责人'))
    const intakeRequirement = impacted.requirements.find((requirement) => requirement.title === '导入需求材料')

    expect(pasteDecision && affectedIds.has(pasteDecision.id)).toBe(true)
    expect(authorityDecision && affectedIds.has(authorityDecision.id)).toBe(false)
    expect(intakeRequirement && affectedIds.has(intakeRequirement.id)).toBe(true)
    expect(impacted.impacts.every((impact) => impact.severity === 'high')).toBe(true)
  })

  it('registers duplicate feedback without generating evidence-free impacts', () => {
    const synthesized = synthesizeProject(answeredDemo())
    const once = addFeedback(synthesized, 'New acceptance feedback', DEMO_FEEDBACK)
    const twice = addFeedback(once, 'Repeated acceptance feedback', DEMO_FEEDBACK)

    expect(twice.sources.at(-1)?.duplicateOf).toBe(once.sources.at(-1)?.id)
    expect(twice.impacts).toHaveLength(once.impacts.length)
    expect(twice.audit.at(-1)?.action).toBe('feedback.duplicate-skipped')
  })
})
