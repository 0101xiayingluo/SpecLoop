import { CheckCircle2, CircleAlert, GitBranch, ListChecks, MessageSquareMore, Target } from 'lucide-react'
import { traceCoverage } from '../core/trace'
import cases from '../../evals/cases.json'
import type { SpecProject } from '../core/types'

interface EvaluationViewProps {
  project: SpecProject
}

export function EvaluationView({ project }: EvaluationViewProps) {
  const coverage = traceCoverage(project)
  const answered = project.questions.filter((item) => item.answer).length
  const accepted = project.requirements.filter((item) => item.status === 'accepted' || item.status === 'modified').length
  const criteriaComplete = project.requirements.flatMap((item) => item.criteria).filter((item) => item.given && item.when && item.then).length
  const criteriaTotal = project.requirements.reduce((sum, item) => sum + item.criteria.length, 0)

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
