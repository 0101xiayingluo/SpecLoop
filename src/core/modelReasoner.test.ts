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
      analysis: {
        issues: [{
          key: 'scope',
          kind: 'conflict',
          title: '材料范围冲突',
          description: '上传与仅粘贴不能同时成立。',
          severity: 'high',
          evidenceIds: [evidenceId],
        }],
        questions,
        selfAssessment: { confidence: 0.72, reviewRecommended: true, unresolvedRisks: ['Review authority is unclear.'] },
      },
      run: {
        id: 'resp-test',
        provider: 'openai',
        model: 'gpt-test',
        status: 'succeeded',
        startedAt: '2026-08-20T00:00:00.000Z',
        completedAt: '2026-08-20T00:00:01.000Z',
        requestId: 'req-test',
        inputTokens: 1_000,
        cachedInputTokens: 200,
        outputTokens: 250,
        reasoningTokens: 40,
        totalTokens: 1_250,
        serverLatencyMs: 900,
        clientLatencyMs: 0,
        estimatedCostUsd: 0.00125,
        pricingConfigured: true,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    const enhanced = await enhanceAnalysisWithModel(project, request)

    expect(project.analysisPlan).toMatchObject({ complexity: 'complex', questionBudget: 3 })
    expect(enhanced.questions).toHaveLength(project.analysisPlan?.questionBudget ?? 5)
    expect(enhanced.issues[0].evidenceIds).toEqual([evidenceId])
    expect(enhanced.agentRuns[0]).toMatchObject({
      id: 'resp-test',
      totalTokens: 1_250,
      estimatedCostUsd: 0.00125,
    })
    expect(enhanced.agentRuns[0].clientLatencyMs).toBeGreaterThanOrEqual(0)
    expect(enhanced.audit.at(-1)?.action).toBe('model.analysis.completed')
  })

  it('rejects model output that invents evidence ids', async () => {
    const project = analyzedProject()
    const request = vi.fn(async () => new Response(JSON.stringify({
      analysis: {
        issues: [{
          key: 'invented',
          kind: 'assumption',
          title: 'Unsupported claim',
          description: 'This evidence does not exist.',
          severity: 'high',
          evidenceIds: ['ev-invented'],
        }],
        questions: [],
        selfAssessment: { confidence: 0.4, reviewRecommended: true, unresolvedRisks: ['Citation is unsupported.'] },
      },
      run: {
        id: 'resp-invented',
        provider: 'openai',
        model: 'gpt-test',
        status: 'succeeded',
        startedAt: '2026-08-20T00:00:00.000Z',
        completedAt: '2026-08-20T00:00:01.000Z',
        inputTokens: 100,
        cachedInputTokens: 0,
        outputTokens: 20,
        reasoningTokens: 0,
        totalTokens: 120,
        serverLatencyMs: 800,
        clientLatencyMs: 0,
        estimatedCostUsd: null,
        pricingConfigured: false,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await expect(enhanceAnalysisWithModel(project, request)).rejects.toMatchObject({
      message: expect.stringContaining('unknown evidence'),
      run: { id: 'resp-invented', status: 'failed', totalTokens: 120 },
    })
  })

  it('exposes failed provider telemetry for deterministic fallback auditing', async () => {
    const project = analyzedProject()
    const request = vi.fn(async () => new Response(JSON.stringify({
      error: 'Model request failed',
      detail: 'Rate limit exceeded',
      run: {
        id: 'run-failed',
        provider: 'openai',
        model: 'gpt-test',
        status: 'failed',
        startedAt: '2026-08-20T00:00:00.000Z',
        completedAt: '2026-08-20T00:00:01.000Z',
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        serverLatencyMs: 700,
        clientLatencyMs: 0,
        estimatedCostUsd: null,
        pricingConfigured: false,
        error: 'Rate limit exceeded',
      },
    }), { status: 429, headers: { 'Content-Type': 'application/json' } }))

    await expect(enhanceAnalysisWithModel(project, request)).rejects.toMatchObject({
      message: 'Model request failed: Rate limit exceeded',
      run: { id: 'run-failed', status: 'failed' },
    })
  })
})
