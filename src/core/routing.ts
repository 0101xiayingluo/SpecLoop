import { nowIso } from './id'
import type { AnalysisPlan, EvidenceFragment, RequirementIssue } from './types'

export function planAnalysis(evidence: EvidenceFragment[], issues: RequirementIssue[]): AnalysisPlan {
  const conflicts = issues.filter((issue) => issue.kind === 'conflict').length
  const assumptions = issues.filter((issue) => issue.kind === 'assumption').length
  const highSeverity = issues.filter((issue) => issue.severity === 'high').length
  const score = conflicts * 3 + highSeverity * 2 + assumptions + (evidence.length >= 12 ? 2 : 0)
  const complexity = score >= 10 ? 'high-risk' : score >= 5 ? 'complex' : 'simple'
  const reasons = [
    conflicts > 0 ? `${conflicts} contradictory scope signal${conflicts === 1 ? '' : 's'}` : '',
    highSeverity > 0 ? `${highSeverity} high-severity issue${highSeverity === 1 ? '' : 's'}` : '',
    assumptions > 0 ? `${assumptions} unverified assumption${assumptions === 1 ? '' : 's'}` : '',
    evidence.length >= 12 ? 'longer evidence set' : '',
  ].filter(Boolean)

  return {
    complexity,
    route: complexity === 'simple' ? 'deterministic' : 'model-assisted',
    questionBudget: complexity === 'high-risk' ? 5 : complexity === 'complex' ? 3 : 1,
    reviewRequired: complexity === 'high-risk' || highSeverity > 0,
    score,
    reasons: reasons.length > 0 ? reasons : ['low ambiguity and no high-severity conflict'],
    decidedAt: nowIso(),
  }
}
