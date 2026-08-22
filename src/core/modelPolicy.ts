import type { AnalysisPlan } from './types'

export type ExecutionMode = 'deterministic' | 'model-assisted' | 'deterministic-review' | 'model-assisted-review' | 'manual-review'

export interface RuntimeQualitySignals {
  providerAvailable: boolean
  schemaValid: boolean
  groundingIntegrity: number
  traceFaithfulness: number
}

export interface ModelBoundary {
  complexity: AnalysisPlan['complexity']
  primary: string
  fallback: string
  hardTriggers: string[]
  productShape: string
}

export const MODEL_BOUNDARIES: ModelBoundary[] = [
  {
    complexity: 'simple',
    primary: 'Deterministic baseline; no model call',
    fallback: 'Same synchronous workflow',
    hardTriggers: ['No high-severity finding', 'No explicit conflict'],
    productShape: 'Immediate one-question ceiling with zero marginal model tokens',
  },
  {
    complexity: 'complex',
    primary: 'Configured small tier (OPENAI_MODEL_SMALL)',
    fallback: 'Deterministic findings + human review',
    hardTriggers: ['Provider unavailable', 'Schema invalid', 'Unknown evidence ID'],
    productShape: 'Keep the workflow usable, label the fallback, and require confirmation',
  },
  {
    complexity: 'high-risk',
    primary: 'Configured large tier + mandatory human gate',
    fallback: 'Deterministic evidence index + direct manual review',
    hardTriggers: ['Any guard failure', 'Grounding < 100%', 'Trace faithfulness < 100%'],
    productShape: 'Block autonomous progression; AI may organize evidence but cannot approve',
  },
]

export function decideExecutionMode(
  complexity: AnalysisPlan['complexity'],
  signals: RuntimeQualitySignals,
): ExecutionMode {
  if (complexity === 'simple') return 'deterministic'
  const guardsPass = signals.providerAvailable
    && signals.schemaValid
    && signals.groundingIntegrity === 1
    && signals.traceFaithfulness === 1
  if (!guardsPass) return complexity === 'high-risk' ? 'manual-review' : 'deterministic-review'
  return complexity === 'high-risk' ? 'model-assisted-review' : 'model-assisted'
}
