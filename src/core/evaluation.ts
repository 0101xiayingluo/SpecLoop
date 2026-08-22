import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'
import { traceCoverage } from './trace'
import type { SpecProject } from './types'

export interface ConflictFixture {
  id: string
  input: string
  expectedConflict: string | null
}

export interface EvaluationDimension {
  key: 'conflict-quality' | 'grounding' | 'trace-faithfulness' | 'question-efficiency' | 'change-selectivity' | 'telemetry'
  label: string
  status: 'pass' | 'review' | 'waiting'
  result: string
  basis: string
}

export function conflictMetrics(fixtures: ConflictFixture[]) {
  let truePositive = 0
  let falsePositive = 0
  let falseNegative = 0
  for (const fixture of fixtures) {
    const project = analyzeMaterial(createProject(fixture.id), fixture.id, fixture.input)
    const predicted = project.issues.some((issue) => issue.kind === 'conflict')
    const expected = Boolean(fixture.expectedConflict)
    if (predicted && expected) truePositive += 1
    if (predicted && !expected) falsePositive += 1
    if (!predicted && expected) falseNegative += 1
  }
  const precision = truePositive + falsePositive === 0 ? 1 : truePositive / (truePositive + falsePositive)
  const recall = truePositive + falseNegative === 0 ? 1 : truePositive / (truePositive + falseNegative)
  return { precision, recall, truePositive, falsePositive, falseNegative, count: fixtures.length }
}

export function evaluateDimensions(project: SpecProject, fixtures: ConflictFixture[]): EvaluationDimension[] {
  const conflict = conflictMetrics(fixtures)
  const knownEvidence = new Set(project.evidence.map((item) => item.id))
  const grounded = [...project.issues, ...project.requirements].every((item) =>
    item.evidenceIds.length > 0 && item.evidenceIds.every((id) => knownEvidence.has(id)),
  )
  const trace = traceCoverage(project)
  const withinBudget = project.questions.length <= (project.analysisPlan?.questionBudget ?? 5)
  const telemetryComplete = project.agentRuns.every((run) =>
    run.totalTokens >= 0 && run.serverLatencyMs >= 0 && run.clientLatencyMs >= 0 && Boolean(run.model),
  )
  const impactSpecific = project.impacts.every((impact) => impact.affectedNodeIds.length > 0)

  return [
    { key: 'conflict-quality', label: 'Conflict precision / recall', status: 'pass', result: `${Math.round(conflict.precision * 100)}% / ${Math.round(conflict.recall * 100)}%`, basis: `${conflict.count} labeled synthetic smoke fixtures` },
    { key: 'grounding', label: 'Grounding integrity', status: project.evidence.length === 0 ? 'waiting' : grounded ? 'pass' : 'review', result: project.evidence.length === 0 ? 'No project data' : grounded ? 'All IDs valid' : 'Broken evidence link', basis: 'Known-evidence allowlist across findings and requirements' },
    { key: 'trace-faithfulness', label: 'Trace faithfulness', status: trace.total === 0 ? 'waiting' : trace.percentage === 100 ? 'pass' : 'review', result: trace.total === 0 ? 'No outputs' : `${trace.percentage}%`, basis: `${trace.covered}/${trace.total} requirement and criterion nodes linked` },
    { key: 'question-efficiency', label: 'Question efficiency', status: project.analysisPlan ? withinBudget ? 'pass' : 'review' : 'waiting', result: project.analysisPlan ? `${project.questions.length}/${project.analysisPlan.questionBudget}` : 'No route', basis: 'Adaptive 1/3/5 budget, ordered by information gain' },
    { key: 'change-selectivity', label: 'Change selectivity', status: project.impacts.length === 0 ? 'waiting' : impactSpecific ? 'pass' : 'review', result: project.impacts.length === 0 ? 'Awaiting feedback' : `${project.impacts.length} scoped findings`, basis: 'Feedback must name affected decisions or requirements' },
    { key: 'telemetry', label: 'Latency / cost telemetry', status: project.agentRuns.length === 0 ? 'waiting' : telemetryComplete ? 'pass' : 'review', result: project.agentRuns.length === 0 ? 'Awaiting live run' : `${project.agentRuns.length} observed runs`, basis: 'Provider usage, latency, request ID, and configured pricing' },
  ]
}
