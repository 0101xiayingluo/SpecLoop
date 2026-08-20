export type WorkflowStage = 'intake' | 'clarify' | 'draft' | 'trace' | 'review'

export type SourceKind = 'paste' | 'text' | 'markdown' | 'json' | 'pdf' | 'docx' | 'feedback'
export type SignalKind = 'fact' | 'constraint' | 'conflict' | 'assumption' | 'feedback'
export type IssueKind = 'conflict' | 'missing' | 'assumption'
export type Severity = 'high' | 'medium' | 'low'
export type ReviewStatus = 'proposed' | 'accepted' | 'modified' | 'at-risk'
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type TraceNodeType = 'evidence' | 'problem' | 'decision' | 'requirement' | 'criterion'

export interface SourceMaterial {
  id: string
  title: string
  kind: SourceKind
  content: string
  createdAt: string
}

export interface EvidenceFragment {
  id: string
  sourceId: string
  quote: string
  lineStart: number
  lineEnd: number
  signal: SignalKind
}

export interface RequirementIssue {
  id: string
  kind: IssueKind
  title: string
  description: string
  severity: Severity
  evidenceIds: string[]
  resolved: boolean
}

export interface ClarificationOption {
  id: string
  label: string
  value: string
}

export interface ClarificationQuestion {
  id: string
  prompt: string
  why: string
  informationGain: number
  issueIds: string[]
  options: ClarificationOption[]
  recommendationId?: string
  answer?: string
  answerLabel?: string
  answeredAt?: string
}

export interface UserProblem {
  id: string
  statement: string
  evidenceIds: string[]
  status: ReviewStatus
}

export interface ProductDecision {
  id: string
  statement: string
  rationale: string
  evidenceIds: string[]
  questionId?: string
  status: ReviewStatus
  revision: number
}

export interface AcceptanceCriterion {
  id: string
  given: string
  when: string
  then: string
  evidenceIds: string[]
  status: ReviewStatus
}

export interface RequirementItem {
  id: string
  title: string
  statement: string
  priority: Priority
  status: ReviewStatus
  problemIds: string[]
  decisionIds: string[]
  evidenceIds: string[]
  criteria: AcceptanceCriterion[]
}

export type TraceRelation =
  | 'supports'
  | 'reveals'
  | 'resolves'
  | 'defines'
  | 'verifies'
  | 'challenges'

export interface TraceEdge {
  id: string
  from: string
  to: string
  relation: TraceRelation
}

export interface WorkingPreferences {
  reasonerMode: 'demo' | 'model'
  priorityMode: 'risk-first' | 'value-first' | 'effort-first'
  writingStyle: 'concise' | 'balanced' | 'detailed'
  riskTolerance: 'low' | 'medium' | 'high'
  updatedAt: string
}

export interface ImpactFinding {
  id: string
  severity: Severity
  status: 'open' | 'resolved'
  feedbackEvidenceIds: string[]
  affectedNodeIds: string[]
  explanation: string
  resolvedAt?: string
}

export interface AuditEvent {
  id: string
  at: string
  action: string
  detail: string
}

export interface SpecProject {
  id: string
  name: string
  stage: WorkflowStage
  createdAt: string
  updatedAt: string
  sources: SourceMaterial[]
  evidence: EvidenceFragment[]
  issues: RequirementIssue[]
  questions: ClarificationQuestion[]
  currentQuestionIndex: number
  problems: UserProblem[]
  decisions: ProductDecision[]
  requirements: RequirementItem[]
  edges: TraceEdge[]
  preferences: WorkingPreferences
  impacts: ImpactFinding[]
  audit: AuditEvent[]
}

export interface TraceNode {
  id: string
  type: TraceNodeType
  label: string
  status?: ReviewStatus
}
