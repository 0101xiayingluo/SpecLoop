import { describe, expect, it } from 'vitest'
import { analyzeMaterial, synthesizeProject } from './reasoner'
import { createProject, transition } from './stateMachine'

describe('workflow state machine', () => {
  it('rejects transitions that bypass required artifacts', () => {
    const project = createProject('Guarded')
    expect(() => transition(project, 'clarify')).toThrow('Invalid workflow transition')
  })

  it('does not synthesize while clarification answers are missing', () => {
    const project = analyzeMaterial(createProject('Guarded'), 'Notes', '用户需要导入文件，并保存原始证据。')
    expect(() => synthesizeProject(project)).toThrow('All queued clarification questions must be answered')
  })
})

