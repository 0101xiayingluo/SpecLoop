import { describe, expect, it, vi } from 'vitest'
import { enhanceAnalysisWithModel } from './modelReasoner'
import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'

function analyzedProject() {
  return analyzeMaterial(
    createProject('Model boundary'),
    'Notes',
    '产品要求上传 PDF。开发认为首版只支持粘贴文本，上传以后再做。',
  )
}

describe('model reasoner boundary', () => {
  it('validates model output, preserves evidence ids, and caps questions', async () => {
    const project = analyzedProject()
    const evidenceId = project.evidence[0].id
    const questions = Array.from({ length: 7 }, (_, index) => ({
      key: `q${index}`,
      prompt: `应该采用哪一个范围 ${index}？`,
      why: '该选择会改变实现范围。',
      informationGain: 100 - index,
      issueKeys: ['scope'],
      options: [
        { label: '支持上传', value: '首版支持上传。' },
        { label: '只粘贴', value: '首版只支持粘贴。' },
      ],
      recommendationIndex: 0,
    }))
    const request = vi.fn(async () => new Response(JSON.stringify({
      issues: [{
        key: 'scope',
        kind: 'conflict',
        title: '材料范围冲突',
        description: '上传与仅粘贴不能同时成立。',
        severity: 'high',
        evidenceIds: [evidenceId],
      }],
      questions,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const enhanced = await enhanceAnalysisWithModel(project, request)

    expect(enhanced.questions).toHaveLength(5)
    expect(enhanced.issues[0].evidenceIds).toEqual([evidenceId])
    expect(enhanced.audit.at(-1)?.action).toBe('model.analysis.completed')
  })

  it('rejects model output that invents evidence ids', async () => {
    const project = analyzedProject()
    const request = vi.fn(async () => new Response(JSON.stringify({
      issues: [{
        key: 'invented',
        kind: 'assumption',
        title: 'Unsupported claim',
        description: 'This evidence does not exist.',
        severity: 'high',
        evidenceIds: ['ev-invented'],
      }],
      questions: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(enhanceAnalysisWithModel(project, request)).rejects.toThrow('unknown evidence')
  })
})
