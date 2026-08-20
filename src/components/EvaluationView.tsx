import { Activity, CheckCircle2, CircleAlert, Coins, Cpu, GitBranch, ListChecks, MessageSquareMore, Target, Timer } from 'lucide-react'
import { traceCoverage } from '../core/trace'
import cases from '../../evals/cases.json'
import type { SpecProject } from '../core/types'

interface EvaluationViewProps {
  project: SpecProject
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

export function EvaluationView({ project }: EvaluationViewProps) {
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
        <span className="evaluation-run">Current project · {cases.length} regression fixtures</span>
      </div>

      <div className="evaluation-metrics">
        <div><GitBranch size={18} /><span>Trace coverage</span><strong>{coverage.percentage}%</strong><small>{coverage.covered}/{coverage.total} output nodes</small></div>
        <div><MessageSquareMore size={18} /><span>Question efficiency</span><strong>{project.questions.length}</strong><small>{answered} answered · cap 5</small></div>
        <div><Target size={18} /><span>Acceptance shape</span><strong>{criteriaTotal === 0 ? 0 : Math.round(criteriaComplete / criteriaTotal * 100)}%</strong><small>{criteriaComplete}/{criteriaTotal} complete</small></div>
        <div><ListChecks size={18} /><span>Human review</span><strong>{project.requirements.length === 0 ? 0 : Math.round(accepted / project.requirements.length * 100)}%</strong><small>{accepted}/{project.requirements.length} reviewed</small></div>
      </div>

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
