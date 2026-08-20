import { describe, expect, it } from 'vitest'
import { exportGithubIssues, exportPrd, exportUserStories } from './exports'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_FEEDBACK, DEMO_SOURCE } from './sample'
import { createProject } from './stateMachine'

function buildProject() {
  let project = analyzeMaterial(createProject('Export demo'), 'Evidence notes', DEMO_SOURCE)
  for (const question of project.questions) {
    project = answerQuestion(project, question.id, question.recommendationId ?? question.options[0].id)
  }
  return synthesizeProject(project)
}

describe('Markdown exports', () => {
  it('keeps acceptance criteria and source references in every format', () => {
    const project = buildProject()
    for (const output of [exportPrd(project), exportUserStories(project), exportGithubIssues(project)]) {
      expect(output).toContain('Given')
      expect(output).toContain('When')
      expect(output).toContain('Then')
      expect(output).toContain('Evidence')
      expect(output).toContain('Evidence notes')
    }
  })

  it('includes feedback impact and affected nodes in the PRD', () => {
    const project = addFeedback(buildProject(), 'Changed upload constraint', DEMO_FEEDBACK)
    const output = exportPrd(project)

    expect(output).toContain('## Change impact')
    expect(output).toContain('老师新增要求')
    expect(output).toContain(project.impacts[0].affectedNodeIds[0])
  })
})
