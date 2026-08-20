import { z } from 'zod'
import type { SpecProject } from './types'

const STORAGE_KEY = 'specloop.project.v1'

const PreferencesSchema = z.object({
  reasonerMode: z.enum(['demo', 'model']).optional(),
  priorityMode: z.enum(['risk-first', 'value-first', 'effort-first']).optional(),
  writingStyle: z.enum(['concise', 'balanced', 'detailed']).optional(),
  riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
  updatedAt: z.string().optional(),
}).optional()

const ImpactSchema = z.object({
  id: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  status: z.enum(['open', 'resolved']).optional(),
  feedbackEvidenceIds: z.array(z.string()),
  affectedNodeIds: z.array(z.string()),
  explanation: z.string(),
  resolvedAt: z.string().optional(),
}).passthrough()

const AgentRunSchema = z.object({
  id: z.string(),
  provider: z.literal('openai'),
  model: z.string(),
  status: z.enum(['succeeded', 'failed']),
  startedAt: z.string(),
  completedAt: z.string(),
  requestId: z.string().optional(),
  inputTokens: z.number().nonnegative(),
  cachedInputTokens: z.number().nonnegative(),
  outputTokens: z.number().nonnegative(),
  reasoningTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  serverLatencyMs: z.number().nonnegative(),
  clientLatencyMs: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative().nullable(),
  pricingConfigured: z.boolean(),
  error: z.string().optional(),
}).passthrough()

const StoredProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: z.enum(['intake', 'clarify', 'draft', 'trace', 'review']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  sources: z.array(z.unknown()),
  evidence: z.array(z.unknown()),
  issues: z.array(z.unknown()).optional(),
  questions: z.array(z.unknown()).optional(),
  currentQuestionIndex: z.number().int().nonnegative().optional(),
  problems: z.array(z.unknown()).optional(),
  decisions: z.array(z.unknown()).optional(),
  requirements: z.array(z.unknown()),
  edges: z.array(z.unknown()).optional(),
  preferences: PreferencesSchema,
  impacts: z.array(ImpactSchema).optional(),
  agentRuns: z.array(AgentRunSchema).optional(),
  audit: z.array(z.unknown()).optional(),
}).passthrough()

export function normalizeStoredProject(value: unknown): SpecProject | null {
  const result = StoredProjectSchema.safeParse(value)
  if (!result.success) return null
  const data = result.data
  const timestamp = data.updatedAt ?? data.createdAt ?? new Date().toISOString()

  return {
    id: data.id,
    name: data.name,
    stage: data.stage,
    createdAt: data.createdAt ?? timestamp,
    updatedAt: timestamp,
    sources: data.sources as SpecProject['sources'],
    evidence: data.evidence as SpecProject['evidence'],
    issues: (data.issues ?? []) as SpecProject['issues'],
    questions: (data.questions ?? []) as SpecProject['questions'],
    currentQuestionIndex: data.currentQuestionIndex ?? 0,
    problems: (data.problems ?? []) as SpecProject['problems'],
    decisions: (data.decisions ?? []) as SpecProject['decisions'],
    requirements: data.requirements as SpecProject['requirements'],
    edges: (data.edges ?? []) as SpecProject['edges'],
    preferences: {
      reasonerMode: data.preferences?.reasonerMode ?? 'demo',
      priorityMode: data.preferences?.priorityMode ?? 'risk-first',
      writingStyle: data.preferences?.writingStyle ?? 'concise',
      riskTolerance: data.preferences?.riskTolerance ?? 'low',
      updatedAt: data.preferences?.updatedAt ?? timestamp,
    },
    impacts: (data.impacts ?? []).map((impact) => ({ ...impact, status: impact.status ?? 'open' })),
    agentRuns: data.agentRuns ?? [],
    audit: (data.audit ?? []) as SpecProject['audit'],
  }
}

export function loadProject(): SpecProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeStoredProject(JSON.parse(raw) as unknown)
  } catch {
    return null
  }
}

export function saveProject(project: SpecProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
}

export function clearProject(): void {
  localStorage.removeItem(STORAGE_KEY)
}
