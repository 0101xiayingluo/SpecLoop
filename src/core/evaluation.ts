import { analyzeMaterial } from './reasoner'
import { createProject } from './stateMachine'
import { traceCoverage } from './trace'
import type { AnalysisPlan, SpecProject } from './types'

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

export interface RoutingFixture {
  id: string
  input: string
  expectedComplexity: AnalysisPlan['complexity']
  rationale: string
}

const routingClasses: AnalysisPlan['complexity'][] = ['simple', 'complex', 'high-risk']

export function routingMetrics(fixtures: RoutingFixture[]) {
  const matrix = Object.fromEntries(routingClasses.map((expected) => [expected, Object.fromEntries(
    routingClasses.map((predicted) => [predicted, 0]),
  )])) as Record<AnalysisPlan['complexity'], Record<AnalysisPlan['complexity'], number>>
  const predictions = fixtures.map((fixture) => {
    const project = analyzeMaterial(createProject(fixture.id), fixture.id, fixture.input)
    const predicted = project.analysisPlan?.complexity ?? 'simple'
    const score = project.analysisPlan?.score ?? 0
    const legacyPredicted: AnalysisPlan['complexity'] = score >= 10 ? 'high-risk' : score >= 5 ? 'complex' : 'simple'
    matrix[fixture.expectedComplexity][predicted] += 1
    return { ...fixture, predicted, legacyPredicted, pass: predicted === fixture.expectedComplexity }
  })
  const correct = predictions.filter((item) => item.pass).length
  const legacyCorrect = predictions.filter((item) => item.legacyPredicted === item.expectedComplexity).length
  const recall = Object.fromEntries(routingClasses.map((label) => {
    const expected = predictions.filter((item) => item.expectedComplexity === label).length
    const matched = predictions.filter((item) => item.expectedComplexity === label && item.predicted === label).length
    return [label, expected === 0 ? 1 : matched / expected]
  })) as Record<AnalysisPlan['complexity'], number>
  return {
    accuracy: fixtures.length === 0 ? 1 : correct / fixtures.length,
    legacyAccuracy: fixtures.length === 0 ? 1 : legacyCorrect / fixtures.length,
    correct,
    legacyCorrect,
    count: fixtures.length,
    matrix,
    recall,
    predictions,
  }
}

export function questionEfficiency(project: SpecProject) {
  const answered = project.questions.filter((item) => item.answer)
  const skipped = project.questions.filter((item) => item.skippedAt)
  const informationYield = answered.reduce((sum, item) => sum + item.informationGain, 0)
  return {
    answered: answered.length,
    skipped: skipped.length,
    allocated: project.analysisPlan?.questionBudget ?? project.questions.length,
    informationYield,
    averageInformationGain: answered.length === 0 ? 0 : informationYield / answered.length,
  }
}

export function changeSelectivityMetrics(predictedIds: string[], expectedIds: string[], candidateIds: string[]) {
  const predicted = new Set(predictedIds)
  const expected = new Set(expectedIds)
  const candidates = new Set(candidateIds)
  const truePositive = [...predicted].filter((id) => expected.has(id)).length
  const falsePositive = [...predicted].filter((id) => !expected.has(id)).length
  const falseNegative = [...expected].filter((id) => !predicted.has(id)).length
  const trueNegative = [...candidates].filter((id) => !predicted.has(id) && !expected.has(id)).length
  return {
    precision: truePositive + falsePositive === 0 ? 1 : truePositive / (truePositive + falsePositive),
    recall: truePositive + falseNegative === 0 ? 1 : truePositive / (truePositive + falseNegative),
    collateralRate: falsePositive + trueNegative === 0 ? 0 : falsePositive / (falsePositive + trueNegative),
    truePositive,
    falsePositive,
    falseNegative,
    trueNegative,
  }
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
  const groundedItems = [
    ...project.issues,
    ...project.requirements,
    ...project.requirements.flatMap((requirement) => requirement.criteria),
  ]
  const grounded = groundedItems.every((item) =>
    item.evidenceIds.length > 0 && item.evidenceIds.every((id) => knownEvidence.has(id)),
  )
  const trace = traceCoverage(project)
  const efficiency = questionEfficiency(project)
  const withinBudget = efficiency.answered <= efficiency.allocated
  const telemetryComplete = project.agentRuns.every((run) =>
    run.totalTokens >= 0 && run.serverLatencyMs >= 0 && run.clientLatencyMs >= 0 && Boolean(run.model),
  )
  const impactSpecific = project.impacts.every((impact) => impact.affectedNodeIds.length > 0)

  return [
    { key: 'conflict-quality', label: 'Conflict precision / recall', status: 'pass', result: `${Math.round(conflict.precision * 100)}% / ${Math.round(conflict.recall * 100)}%`, basis: `${conflict.count} labeled synthetic smoke fixtures` },
    { key: 'grounding', label: 'Grounding integrity', status: project.evidence.length === 0 ? 'waiting' : grounded ? 'pass' : 'review', result: project.evidence.length === 0 ? 'No project data' : grounded ? 'All IDs valid' : 'Broken evidence link', basis: 'Known-evidence allowlist across findings and requirements' },
    { key: 'trace-faithfulness', label: 'Trace faithfulness', status: trace.total === 0 ? 'waiting' : trace.percentage === 100 ? 'pass' : 'review', result: trace.total === 0 ? 'No outputs' : `${trace.percentage}%`, basis: `${trace.covered}/${trace.total} requirement and criterion nodes linked` },
    { key: 'question-efficiency', label: 'Question efficiency', status: project.analysisPlan ? withinBudget ? 'pass' : 'review' : 'waiting', result: project.analysisPlan ? `${efficiency.averageInformationGain.toFixed(1)} IG/Q` : 'No route', basis: `sum(answered informationGain) / answered questions; ${efficiency.answered}/${efficiency.allocated} used, ${efficiency.skipped} early-stopped` },
    { key: 'change-selectivity', label: 'Change selectivity', status: project.impacts.length === 0 ? 'waiting' : impactSpecific ? 'pass' : 'review', result: project.impacts.length === 0 ? 'Awaiting feedback' : `${new Set(project.impacts.flatMap((item) => item.affectedNodeIds)).size} nodes affected`, basis: 'Fixture precision = TP/(TP+FP); recall = TP/(TP+FN); live state reports scope only' },
    { key: 'telemetry', label: 'Latency / cost telemetry', status: project.agentRuns.length === 0 ? 'waiting' : telemetryComplete ? 'pass' : 'review', result: project.agentRuns.length === 0 ? 'Awaiting live run' : `${project.agentRuns.length} observed runs`, basis: 'Provider usage, latency, request ID, and configured pricing' },
  ]
}
