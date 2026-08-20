import { ArrowRight, BrainCircuit, CheckCircle2, CircleDashed, GitBranch, PlayCircle, ShieldCheck, Sparkles, TimerReset } from 'lucide-react'

interface PortfolioViewProps {
  onRunDemo: () => void
  onOpenDemo: () => void
  onOpenEvaluation: () => void
}

const controlSteps = [
  { icon: BrainCircuit, label: 'Proposal', detail: 'Responses API structured output' },
  { icon: ShieldCheck, label: 'Grounding', detail: 'Schema + evidence ID allowlist' },
  { icon: GitBranch, label: 'State guard', detail: 'Bounded workflow transitions' },
  { icon: CheckCircle2, label: 'Human gate', detail: 'Accept or modify before publish' },
]

export function PortfolioView({ onRunDemo, onOpenDemo, onOpenEvaluation }: PortfolioViewProps) {
  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div className="portfolio-hero-copy">
          <span className="eyebrow">AI product case · 2026</span>
          <h1>SpecLoop</h1>
          <p>Evidence-driven requirements clarification and acceptance for teams that cannot afford to lose the reasoning behind a product decision.</p>
          <div className="portfolio-actions">
            <button className="primary-button" onClick={onRunDemo}><Sparkles size={16} /> Run the product</button>
            <button className="secondary-button" onClick={onOpenDemo}><PlayCircle size={16} /> Guided demo</button>
          </div>
        </div>
        <div className="portfolio-proof" aria-label="Project proof points">
          <span>Evidence → decision → acceptance</span>
          <strong>100%</strong>
          <p>trace coverage on the reproducible demo dataset</p>
          <div><b>31</b> automated checks <i /> <b>≤5</b> clarification questions</div>
        </div>
      </section>

      <section className="portfolio-band portfolio-brief">
        <div className="portfolio-section-title"><span>01</span><div><small>Product judgment</small><h2>Turn ambiguity into reviewable decisions</h2></div></div>
        <div className="portfolio-brief-grid">
          <article><span>Problem</span><p>Meeting summaries flatten contradictions and produce requirements that cannot explain where they came from.</p></article>
          <article><span>Product bet</span><p>Users value fewer, higher-impact questions and explicit evidence links more than a longer AI-generated document.</p></article>
          <article><span>Scope decision</span><p>A bounded single-agent state machine keeps human authority visible and makes every transition testable.</p></article>
        </div>
      </section>

      <section className="portfolio-band portfolio-control">
        <div className="portfolio-section-title"><span>02</span><div><small>AI system design</small><h2>A controlled Agent, not an opaque completion</h2></div></div>
        <div className="control-plane-visual">
          {controlSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <div className="control-step" key={step.label}>
                <div className="control-step-icon"><Icon size={19} /></div>
                <span>{step.label}</span>
                <p>{step.detail}</p>
                {index < controlSteps.length - 1 ? <ArrowRight className="control-arrow" size={17} /> : null}
              </div>
            )
          })}
        </div>
        <div className="portfolio-tech-row">
          <div><BrainCircuit size={17} /><span>Real LLM</span><strong>Responses API</strong><small>server-side key, structured output</small></div>
          <div><ShieldCheck size={17} /><span>Reliability</span><strong>Guarded</strong><small>fallback, schema and citations</small></div>
          <div><TimerReset size={17} /><span>Observability</span><strong>Run-level</strong><small>tokens, cost, latency, request ID</small></div>
          <div><GitBranch size={17} /><span>Business memory</span><strong>Impact-aware</strong><small>new feedback challenges old decisions</small></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-decisions">
        <div className="portfolio-section-title"><span>03</span><div><small>PM × AI trade-offs</small><h2>Each technical choice answers a product risk</h2></div></div>
        <div className="decision-table">
          <div className="decision-row header"><span>Business risk</span><span>Product decision</span><span>Engineering proof</span></div>
          <div className="decision-row"><strong>Hallucinated rationale</strong><span>Every output cites supplied evidence</span><span>Evidence ID allowlist + trace graph</span></div>
          <div className="decision-row"><strong>Question fatigue</strong><span>Ask only what changes scope or acceptance</span><span>Information-gain ranking + five-question cap</span></div>
          <div className="decision-row"><strong>Silent requirement drift</strong><span>Preserve and challenge old decisions</span><span><code>at-risk</code> state + impact edges</span></div>
          <div className="decision-row"><strong>Uncontrolled AI spend</strong><span>Make model economics visible</span><span>Usage-based cost and latency telemetry</span></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-evidence">
        <div className="portfolio-section-title"><span>04</span><div><small>Evidence, not theatre</small><h2>Measured claims stay separate from targets</h2></div></div>
        <div className="evidence-columns">
          <div>
            <h3><CheckCircle2 size={17} /> Verified in repository</h3>
            <p>31 automated checks, 100% demo trace coverage, deterministic fallback, protected model boundary and three export formats.</p>
          </div>
          <div>
            <h3><CircleDashed size={17} /> Next validation</h3>
            <p>Real-user question utility, open-domain accuracy, live P50/P95 latency, per-document cost and provider fallback rate.</p>
          </div>
        </div>
        <button className="text-button portfolio-evaluation-link" onClick={onOpenEvaluation}>Open live evaluation <ArrowRight size={15} /></button>
      </section>
    </div>
  )
}
