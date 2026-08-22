import { ArrowRight, CheckCircle2, GitBranch, Play, Radar, Route, ShieldCheck } from 'lucide-react'
import type { SpecProject } from '../core/types'

interface DemoViewProps {
  project: SpecProject
  onRunDemo: () => void
  onOpenRequirements: () => void
  onOpenTrace: () => void
  onOpenReview: () => void
  onTestChange: () => void
  onOpenEvaluation: () => void
}

export function DemoView({ project, onRunDemo, onOpenRequirements, onOpenTrace, onOpenReview, onTestChange, onOpenEvaluation }: DemoViewProps) {
  const ready = project.requirements.length > 0
  const answered = project.questions.filter((item) => item.answer).length
  const skipped = project.questions.filter((item) => item.skippedAt).length
  const citations = project.requirements.reduce((sum, item) => sum + item.evidenceIds.length + item.criteria.reduce((count, criterion) => count + criterion.evidenceIds.length, 0), 0)
  const atRisk = project.requirements.filter((item) => item.status === 'at-risk').length + project.decisions.filter((item) => item.status === 'at-risk').length

  return (
    <div className="demo-page">
      <div className="section-heading demo-heading">
        <div><span className="eyebrow">90-second product proof</span><h1>Guided demo</h1></div>
        <button className="primary-button" onClick={onRunDemo}><Play size={16} fill="currentColor" /> {ready ? 'Reset demo' : 'Run scenario'}</button>
      </div>

      <section className="demo-scenario">
        <div><span>Scenario</span><strong>Course project scope dispute</strong></div>
        <p>Product, engineering and teaching staff disagree about upload support, export scope and decision authority. The Agent must preserve the conflict, ask only consequential questions and produce acceptance-ready output.</p>
      </section>

      <div className="demo-checkpoints">
        <article className={ready ? 'complete' : ''}>
          <div className="demo-step-number">01</div>
          <Route size={20} />
          <h2>Acquire and route</h2>
          <p>Normalize source evidence, preserve provenance and route by deterministic complexity.</p>
          <strong>{ready ? `${project.evidence.length} fragments · ${project.analysisPlan?.complexity ?? 'unscored'} → ${project.analysisPlan?.requestedTier ?? 'legacy'}` : 'Waiting for scenario'}</strong>
          {ready ? <button className="text-button" onClick={onOpenRequirements}>Inspect outputs <ArrowRight size={14} /></button> : null}
        </article>
        <article className={ready ? 'complete' : ''}>
          <div className="demo-step-number">02</div>
          <ShieldCheck size={20} />
          <h2>Guard decisions</h2>
          <p>Use adaptive question budgets and require a human decision before synthesis can continue.</p>
          <strong>{ready ? `${answered}/${project.analysisPlan?.questionBudget ?? 5} answered · ${skipped} stopped early` : 'State guard inactive'}</strong>
          {ready ? <button className="text-button" onClick={onOpenRequirements}>Review requirements <ArrowRight size={14} /></button> : null}
        </article>
        <article className={ready ? 'complete' : ''}>
          <div className="demo-step-number">03</div>
          <GitBranch size={20} />
          <h2>Prove provenance</h2>
          <p>Trace requirements and Given/When/Then criteria back to source text and line numbers.</p>
          <strong>{ready ? `${citations} evidence links` : 'Trace not generated'}</strong>
          {ready ? <button className="text-button" onClick={onOpenTrace}>Open trace graph <ArrowRight size={14} /></button> : null}
        </article>
        <article className={ready ? 'complete' : ''}>
          <div className="demo-step-number">04</div>
          <Radar size={20} />
          <h2>Monitor change</h2>
          <p>Inject a changed acceptance rule and mark only related decisions and requirements at risk.</p>
          <strong>{ready ? `${atRisk} nodes currently at risk` : 'Change monitor inactive'}</strong>
          {ready ? <button className="text-button" onClick={atRisk > 0 ? onOpenReview : onTestChange}>{atRisk > 0 ? 'Inspect impact' : 'Inject PDF requirement'} <ArrowRight size={14} /></button> : null}
        </article>
      </div>

      <section className="demo-proof-bar">
        <CheckCircle2 size={18} />
        <div><strong>{ready ? 'Demo state is reproducible and review-gated' : 'No model key required for this proof'}</strong><span>{ready ? 'The same evidence, routing policy and answers produce the same auditable workflow.' : 'Run the scenario to populate every product surface.'}</span></div>
        <button className="secondary-button" onClick={onOpenEvaluation} disabled={!ready}>View evaluation</button>
      </section>
    </div>
  )
}
