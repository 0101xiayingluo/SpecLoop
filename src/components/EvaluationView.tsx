import { Activity, ArrowRight, Check, CheckCircle2, CircleAlert, Coins, Cpu, FileSearch, GitBranch, ListChecks, MessageSquareMore, Radar, Route, ShieldCheck, Target, Timer, UserCheck, X } from 'lucide-react'
import { traceCoverage } from '../core/trace'
import { evaluateDimensions, questionEfficiency, routingMetrics, type RoutingFixture } from '../core/evaluation'
import cases from '../../evals/cases.json'
import routingCases from '../../evals/routing-cases.json'
import repositoryBaseline from '../../evals/repository-baseline.json'
import type { SpecProject } from '../core/types'

interface EvaluationViewProps {
  project: SpecProject
  onReviewFailure: (failureId: string, status: 'accepted' | 'rejected') => void
}

function formatCost(value: number | null): string {
  if (value === null) return 'Not priced'
  if (value < 0.01) return `$${value.toFixed(6)}`
  return `$${value.toFixed(4)}`
}

function formatLatency(value: number): string {
  if (value < 1_000) return `${Math.round(value)} ms`
  return `${(value / 1_000).toFixed(2)} s`
}

export function EvaluationView({ project, onReviewFailure }: EvaluationViewProps) {
  const coverage = traceCoverage(project)
  const answered = project.questions.filter((item) => item.answer).length
  const accepted = project.requirements.filter((item) => item.status === 'accepted' || item.status === 'modified').length
  const criteriaComplete = project.requirements.flatMap((item) => item.criteria).filter((item) => item.given && item.when && item.then).length
  const criteriaTotal = project.requirements.reduce((sum, item) => sum + item.criteria.length, 0)
  const successfulRuns = project.agentRuns.filter((run) => run.status === 'succeeded')
  const pricedRuns = successfulRuns.filter((run) => run.estimatedCostUsd !== null)
  const totalTokens = successfulRuns.reduce((sum, run) => sum + run.totalTokens, 0)
  const totalCost = pricedRuns.reduce((sum, run) => sum + (run.estimatedCostUsd ?? 0), 0)
  const averageLatency = successfulRuns.length === 0
    ? 0
    : successfulRuns.reduce((sum, run) => sum + run.clientLatencyMs, 0) / successfulRuns.length
  const knownEvidenceIds = new Set(project.evidence.map((item) => item.id))
  const groundingPassed = project.evidence.length > 0
    && project.issues.every((item) => item.evidenceIds.every((id) => knownEvidenceIds.has(id)))
    && project.requirements.every((item) => item.evidenceIds.length > 0 && item.evidenceIds.every((id) => knownEvidenceIds.has(id)))
  const humanGatePassed = project.questions.length > 0 && answered === project.questions.length
  const feedbackCount = project.sources.filter((item) => item.kind === 'feedback').length
  const uniqueSources = project.sources.filter((source) => !source.duplicateOf)
  const pendingFailures = project.failureCases.filter((failure) => failure.status === 'pending-review')
  const dimensions = evaluateDimensions(project, cases)
  const routing = routingMetrics(routingCases as RoutingFixture[])
  const questionMetrics = questionEfficiency(project)

  const controlStages = [
    {
      icon: FileSearch,
      label: 'Evidence index',
      status: project.evidence.length > 0 ? 'passed' : 'waiting',
      detail: project.evidence.length > 0 ? `${project.evidence.length} grounded fragments` : 'Waiting for source material',
    },
    {
      icon: Cpu,
      label: 'Adaptive router',
      status: project.issues.length > 0 ? 'passed' : 'waiting',
      detail: project.analysisPlan ? `${project.analysisPlan.complexity} · ${project.analysisPlan.route} · ${project.analysisPlan.questionBudget}Q` : 'No route yet',
    },
    {
      icon: ShieldCheck,
      label: 'Grounding guard',
      status: groundingPassed ? 'passed' : project.evidence.length > 0 ? 'review' : 'waiting',
      detail: groundingPassed ? 'Schema and evidence links valid' : 'Evidence contract not complete',
    },
    {
      icon: UserCheck,
      label: 'Human gate',
      status: humanGatePassed ? 'passed' : project.questions.length > 0 ? 'review' : 'waiting',
      detail: project.questions.length > 0 ? `${answered}/${project.questions.length} decisions confirmed` : 'No decisions queued',
    },
    {
      icon: Radar,
      label: 'Change monitor',
      status: feedbackCount > 0 ? project.impacts.some((item) => item.status === 'open') ? 'review' : 'passed' : 'armed',
      detail: feedbackCount > 0 ? `${project.impacts.filter((item) => item.status === 'open').length} open impacts` : 'Armed for new feedback',
    },
  ] as const

  const checks = [
    { label: 'Every requirement has source evidence', pass: project.requirements.every((item) => item.evidenceIds.length > 0) },
    { label: 'Every acceptance criterion has source evidence', pass: project.requirements.every((item) => item.criteria.every((criterion) => criterion.evidenceIds.length > 0)) },
    { label: 'Clarification queue is capped at five', pass: project.questions.length <= 5 },
    { label: 'All selected clarification questions are resolved', pass: answered === project.questions.length },
    { label: 'No accepted node has unresolved change impact', pass: !project.impacts.some((impact) => impact.severity === 'high' && impact.status !== 'resolved') },
  ]

  return (
    <div className="evaluation-page">
      <div className="section-heading">
        <div><span className="eyebrow">Live quality report</span><h1>Evaluation</h1></div>
        <span className="evaluation-run">Current project · {cases.length + routingCases.length} labeled fixtures</span>
      </div>

      <div className="evaluation-metrics">
        <div><GitBranch size={18} /><span>Trace coverage</span><strong>{coverage.percentage}%</strong><small>{coverage.covered}/{coverage.total} output nodes</small></div>
        <div><MessageSquareMore size={18} /><span>Question efficiency</span><strong>{questionMetrics.averageInformationGain.toFixed(1)}</strong><small>IG/question · {questionMetrics.answered}/{questionMetrics.allocated} used</small></div>
        <div><Target size={18} /><span>Acceptance shape</span><strong>{criteriaTotal === 0 ? 0 : Math.round(criteriaComplete / criteriaTotal * 100)}%</strong><small>{criteriaComplete}/{criteriaTotal} complete</small></div>
        <div><ListChecks size={18} /><span>Human review</span><strong>{project.requirements.length === 0 ? 0 : Math.round(accepted / project.requirements.length * 100)}%</strong><small>{accepted}/{project.requirements.length} reviewed</small></div>
      </div>

      <section className="agent-control-panel">
        <div className="subsection-title">
          <div><FileSearch size={17} /><h2>Evidence acquisition pipeline</h2></div>
          <span>{uniqueSources.length}/{project.sources.length} unique sources · {new Set(project.sources.map((source) => source.provenance)).size} provenance types</span>
        </div>
        <div className="agent-metric-strip">
          <div><FileSearch size={17} /><span>Normalized fragments</span><strong>{project.evidence.length}</strong><small>cleaned, segmented, source-linked</small></div>
          <div><ListChecks size={17} /><span>Duplicate inputs</span><strong>{project.sources.filter((source) => source.duplicateOf).length}</strong><small>registered but excluded from analysis</small></div>
          <div><Cpu size={17} /><span>Complexity route</span><strong>{project.analysisPlan?.complexity ?? 'Pending'}</strong><small>{project.analysisPlan ? `${project.analysisPlan.requestedTier ?? 'legacy'} tier · ${project.analysisPlan.policyVersion ?? 'legacy'}` : 'awaiting evidence'}</small></div>
          <div><UserCheck size={17} /><span>Review policy</span><strong>{project.analysisPlan?.reviewRequired || project.modelSelfAssessment?.reviewRecommended ? 'Required' : 'Standard'}</strong><small>{project.modelSelfAssessment ? `${Math.round(project.modelSelfAssessment.confidence * 100)}% uncalibrated self-score` : `${project.analysisPlan?.reviewTriggers?.join(', ') || 'no hard trigger'}`}</small></div>
        </div>
      </section>

      <section className="routing-evaluation">
        <div className="subsection-title">
          <div><Route size={17} /><h2>Routing evaluation</h2></div>
          <span>{routing.correct}/{routing.count} labeled cases · policy {project.analysisPlan?.policyVersion ?? 'risk-floor-v2'}</span>
        </div>
        <div className="routing-summary">
          <div><span>Accuracy</span><strong>{Math.round(routing.accuracy * 100)}%</strong><small>legacy replay {routing.legacyCorrect}/{routing.count} → current {routing.correct}/{routing.count}</small></div>
          <div><span>Simple recall</span><strong>{Math.round(routing.recall.simple * 100)}%</strong><small>4 human-labeled fixtures</small></div>
          <div><span>Complex recall</span><strong>{Math.round(routing.recall.complex * 100)}%</strong><small>includes risk-floor regression</small></div>
          <div><span>High-risk recall</span><strong>{Math.round(routing.recall['high-risk'] * 100)}%</strong><small>two-conflict fixtures</small></div>
        </div>
        <div className="confusion-matrix" aria-label="Routing confusion matrix">
          <span className="matrix-axis">Expected ↓ / Predicted →</span><b>simple</b><b>complex</b><b>high-risk</b>
          {(['simple', 'complex', 'high-risk'] as const).map((expected) => (
            <div className="matrix-row" key={expected}>
              <strong>{expected}</strong>
              {(['simple', 'complex', 'high-risk'] as const).map((predicted) => <span className={expected === predicted ? 'diagonal' : ''} key={predicted}>{routing.matrix[expected][predicted]}</span>)}
            </div>
          ))}
        </div>
        <div className="routing-regression"><CircleAlert size={16} /><div><strong>Misroute fixed</strong><span><code>upload-failure-risk-floor-regression</code>: the v1 threshold replay scores 11/12 and sends this case to simple; v2 adds a complex-route risk floor, reaches 12/12, and keeps the case in CI.</span></div></div>
      </section>

      <section className="benchmark-contract">
        <div className="subsection-title">
          <div><Target size={17} /><h2>Baseline and release contract</h2></div>
          <span>{repositoryBaseline.measuredAt} · synthetic/repository scope</span>
        </div>
        <div className="benchmark-table">
          <div className="benchmark-row header"><span>Metric</span><span>Baseline</span><span>Current</span><span>Release gate</span><span>Evidence</span><span>Status</span></div>
          {repositoryBaseline.metrics.map((metric) => (
            <div className="benchmark-row" key={metric.key}>
              <strong>{metric.label}</strong><span>{metric.baseline}</span><span>{metric.current}</span><span>{metric.releaseGate}</span><small>{metric.evidence}</small><b className={`dimension-status ${metric.status}`}>{metric.status}</b>
            </div>
          ))}
        </div>
        <p className="benchmark-scope">{repositoryBaseline.scope}. Industry benchmark comparisons are intentionally omitted until an equivalent public task and protocol are available.</p>
      </section>

      <section className="agent-control-panel">
        <div className="subsection-title">
          <div><Activity size={17} /><h2>Agent control plane</h2></div>
          <span>Proposal → guardrails → human authority</span>
        </div>
        <div className="agent-control-track">
          {controlStages.map((stage, index) => {
            const Icon = stage.icon
            return (
              <div className={`agent-control-stage ${stage.status}`} key={stage.label}>
                <div className="agent-control-icon"><Icon size={17} /></div>
                <span>{stage.label}</span>
                <strong>{stage.status}</strong>
                <small>{stage.detail}</small>
                {index < controlStages.length - 1 ? <ArrowRight size={15} className="agent-control-arrow" /> : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="agent-observability">
        <div className="subsection-title">
          <div><Activity size={17} /><h2>LLM Agent observability</h2></div>
          <span>{successfulRuns.length}/{project.agentRuns.length} successful runs</span>
        </div>
        <div className="agent-metric-strip">
          <div><Cpu size={17} /><span>Live runs</span><strong>{project.agentRuns.length}</strong><small>OpenAI Responses API</small></div>
          <div><ListChecks size={17} /><span>Total tokens</span><strong>{totalTokens.toLocaleString()}</strong><small>successful runs only</small></div>
          <div><Coins size={17} /><span>Estimated cost</span><strong>{pricedRuns.length > 0 ? formatCost(totalCost) : 'Not priced'}</strong><small>{pricedRuns.length}/{successfulRuns.length} runs priced</small></div>
          <div><Timer size={17} /><span>Average latency</span><strong>{successfulRuns.length > 0 ? formatLatency(averageLatency) : 'No data'}</strong><small>browser to validated result</small></div>
        </div>

        <div className="agent-run-table">
          <div className="agent-run-row header">
            <span>Started</span><span>Model</span><span>Status</span><span>Token usage</span><span>Latency</span><span>Cost estimate</span><span>Request</span>
          </div>
          {project.agentRuns.length === 0 ? (
            <div className="agent-run-empty">No live model run has been recorded for this project.</div>
          ) : project.agentRuns.slice().reverse().map((run) => (
            <div className="agent-run-row" key={run.id}>
              <time>{new Date(run.startedAt).toLocaleString('zh-CN', { hour12: false })}</time>
              <strong>{run.model}</strong>
              <span className={`agent-run-status ${run.status}`}>{run.status}</span>
              <span>{run.totalTokens.toLocaleString()}<small>{run.inputTokens.toLocaleString()} in · {run.cachedInputTokens.toLocaleString()} cached · {run.outputTokens.toLocaleString()} out</small></span>
              <span>{formatLatency(run.clientLatencyMs)}<small>{formatLatency(run.serverLatencyMs)} server</small></span>
              <span>{formatCost(run.estimatedCostUsd)}<small>{run.pricingConfigured ? 'configured rates' : 'rates unavailable'}</small></span>
              <code title={run.requestId ?? run.id}>{run.requestId ?? run.id}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="quality-gates">
        <div className="subsection-title"><div><h2>Quality gates</h2></div><span>{checks.filter((item) => item.pass).length}/{checks.length} passing</span></div>
        {checks.map((check) => (
          <div className="quality-row" key={check.label}>
            {check.pass ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
            <span>{check.label}</span>
            <strong>{check.pass ? 'PASS' : 'REVIEW'}</strong>
          </div>
        ))}
      </section>

      <section className="failure-pool">
        <div className="subsection-title"><div><CircleAlert size={17} /><h2>Reviewed failure loop</h2></div><span>{pendingFailures.length} pending · {project.failureCases.filter((item) => item.status === 'accepted').length} regression assets</span></div>
        {project.failureCases.length === 0 ? (
          <div className="agent-run-empty">Provider failures, grounding rejections, and human corrections will enter this review queue.</div>
        ) : project.failureCases.slice().reverse().map((failure) => (
          <div className="failure-row" key={failure.id}>
            <div><strong>{failure.dimension} · {failure.rootCause ?? 'legacy'}</strong><span>{failure.summary}</span><small>{failure.workflowStage ?? 'unknown stage'} · fingerprint {failure.fingerprint ?? failure.id} · {failure.evidenceIds.length} evidence IDs · {failure.status}</small></div>
            {failure.status === 'pending-review' ? <div className="failure-actions">
              <button className="icon-button" title="Accept as regression asset" onClick={() => onReviewFailure(failure.id, 'accepted')}><Check size={15} /></button>
              <button className="icon-button" title="Reject sample" onClick={() => onReviewFailure(failure.id, 'rejected')}><X size={15} /></button>
            </div> : <span className={`agent-run-status ${failure.status === 'accepted' ? 'succeeded' : 'failed'}`}>{failure.status}</span>}
          </div>
        ))}
      </section>

      <section className="evaluation-matrix">
        <div className="subsection-title"><div><Target size={17} /><h2>Six-dimensional evaluation</h2></div><span>fixture metrics and live project gates stay separate</span></div>
        {dimensions.map((dimension) => (
          <div className="dimension-row" key={dimension.key}>
            <span>{dimension.label}</span><strong>{dimension.result}</strong><small>{dimension.basis}</small><b className={`dimension-status ${dimension.status}`}>{dimension.status}</b>
          </div>
        ))}
      </section>

      <section className="evaluation-audit">
        <div className="subsection-title"><div><h2>Agent event log</h2></div><span>{project.audit.length} events</span></div>
        <div className="audit-table">
          <div className="audit-row header"><span>Time</span><span>Event</span><span>Detail</span></div>
          {project.audit.slice().reverse().map((event) => (
            <div className="audit-row" key={event.id}>
              <time>{new Date(event.at).toLocaleString('zh-CN', { hour12: false })}</time>
              <code>{event.action}</code>
              <span>{event.detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
