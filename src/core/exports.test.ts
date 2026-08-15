import { describe, expect, it } from 'vitest'
import { exportGithubIssues, exportPrd, exportUserStories } from './exports'
import { analyzeMaterial, answerQuestion, synthesizeProject } from './reasoner'
import { DEMO_SOURCE } from './sample'
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
})
