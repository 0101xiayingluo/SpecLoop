import { nowIso } from './id'
import type { AnalysisPlan, EvidenceFragment, RequirementIssue } from './types'

export const ROUTING_POLICY_VERSION = 'risk-floor-v2'
export const MIN_INFORMATION_GAIN = 7

export function planAnalysis(evidence: EvidenceFragment[], issues: RequirementIssue[]): AnalysisPlan {
  const conflicts = issues.filter((issue) => issue.kind === 'conflict').length
  const assumptions = issues.filter((issue) => issue.kind === 'assumption').length
  const highSeverity = issues.filter((issue) => issue.severity === 'high').length
  const score = conflicts * 3 + highSeverity * 2 + assumptions + (evidence.length >= 12 ? 2 : 0)
  const complexity = score >= 10 || conflicts >= 2 || highSeverity >= 3
    ? 'high-risk'
    : score >= 5 || highSeverity > 0 ? 'complex' : 'simple'
  const reviewTriggers: AnalysisPlan['reviewTriggers'] = [
    ...(highSeverity > 0 ? ['high-severity' as const] : []),
    ...(complexity === 'high-risk' ? ['high-risk-route' as const] : []),
  ]
  const reasons = [
    conflicts > 0 ? `${conflicts} contradictory scope signal${conflicts === 1 ? '' : 's'}` : '',
    highSeverity > 0 ? `${highSeverity} high-severity issue${highSeverity === 1 ? '' : 's'}` : '',
    assumptions > 0 ? `${assumptions} unverified assumption${assumptions === 1 ? '' : 's'}` : '',
    evidence.length >= 12 ? 'longer evidence set' : '',
  ].filter(Boolean)

  return {
    policyVersion: ROUTING_POLICY_VERSION,
    complexity,
    route: complexity === 'simple' ? 'deterministic' : 'model-assisted',
    requestedTier: complexity === 'simple' ? 'none' : complexity === 'complex' ? 'small' : 'large',
    questionBudget: complexity === 'high-risk' ? 5 : complexity === 'complex' ? 3 : 1,
    reviewRequired: reviewTriggers.length > 0,
    reviewTriggers,
    score,
    signals: { evidenceCount: evidence.length, conflicts, highSeverity, assumptions },
    earlyStop: {
      minInformationGain: MIN_INFORMATION_GAIN,
      triggered: false,
      skippedQuestionIds: [],
    },
    reasons: reasons.length > 0 ? reasons : ['low ambiguity and no high-severity conflict'],
    decidedAt: nowIso(),
  }
}
