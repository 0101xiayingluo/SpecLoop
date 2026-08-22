import { ArrowRight, BrainCircuit, CheckCircle2, CircleDashed, Database, GitBranch, PlayCircle, Route, ShieldCheck, Sparkles, TimerReset } from 'lucide-react'

interface PortfolioViewProps {
  onRunDemo: () => void
  onOpenDemo: () => void
  onOpenEvaluation: () => void
}

const controlSteps = [
  { icon: Database, label: 'Evidence', detail: 'Provenance, normalization, deduplication' },
  { icon: Route, label: 'Router', detail: 'Simple / complex / high-risk policy' },
  { icon: BrainCircuit, label: 'Proposal', detail: 'Structured model output + self-assessment' },
  { icon: ShieldCheck, label: 'Grounding', detail: 'Schema + evidence ID allowlist' },
  { icon: CheckCircle2, label: 'Human gate', detail: 'Accept or modify before publish' },
]

export function PortfolioView({ onRunDemo, onOpenDemo, onOpenEvaluation }: PortfolioViewProps) {
  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div className="portfolio-hero-copy">
          <span className="eyebrow">AI product case · 2026</span>
          <h1>SpecLoop</h1>
          <p>An evidence-driven requirements Agent that turns noisy discussions into reviewable product decisions, traceable requirements and testable acceptance criteria.</p>
          <div className="portfolio-actions">
            <button className="primary-button" onClick={onRunDemo}><Sparkles size={16} /> Run the product</button>
            <button className="secondary-button" onClick={onOpenDemo}><PlayCircle size={16} /> Guided demo</button>
          </div>
        </div>
        <div className="portfolio-proof" aria-label="Project proof points">
          <span>Evidence → decision → acceptance</span>
          <strong>100%</strong>
          <p>trace coverage on the reproducible demo dataset</p>
          <div><b>40</b> automated tests <i /> <b>1 / 3 / 5</b> adaptive question budget</div>
        </div>
      </section>

      <section className="portfolio-band portfolio-brief">
        <div className="portfolio-section-title"><span>01</span><div><small>Product judgment</small><h2>Turn ambiguity into reviewable decisions</h2></div></div>
        <div className="portfolio-brief-grid">
          <article><span>Problem</span><p>Meeting summaries flatten contradictions and produce requirements that cannot explain where they came from.</p></article>
          <article><span>Product bet</span><p>Users need fewer consequential questions and explicit evidence links more than a longer AI-generated PRD.</p></article>
          <article><span>Architecture judgment</span><p>A bounded single-Agent state machine preserves human authority; complexity routing adds intelligence without theatrical multi-Agent overhead.</p></article>
        </div>
      </section>

      <section className="portfolio-band portfolio-control">
        <div className="portfolio-section-title"><span>02</span><div><small>AI-native system design</small><h2>Evidence pipeline → adaptive route → guarded decision</h2></div></div>
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
          <div><BrainCircuit size={17} /><span>Model strategy</span><strong>Adaptive</strong><small>small / large model route by business risk</small></div>
          <div><ShieldCheck size={17} /><span>Reliability</span><strong>Guarded</strong><small>fallback, schema and citations</small></div>
          <div><TimerReset size={17} /><span>Observability</span><strong>Run-level</strong><small>tokens, cost, latency, request ID</small></div>
          <div><GitBranch size={17} /><span>Learning loop</span><strong>Review-gated</strong><small>failures become regression assets after approval</small></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-decisions">
        <div className="portfolio-section-title"><span>03</span><div><small>PM × AI trade-offs</small><h2>Each technical choice answers a product risk</h2></div></div>
        <div className="decision-table">
          <div className="decision-row header"><span>Business risk</span><span>Product decision</span><span>Engineering proof</span></div>
          <div className="decision-row"><strong>Hallucinated rationale</strong><span>Every output cites supplied evidence</span><span>Evidence ID allowlist + trace graph</span></div>
          <div className="decision-row"><strong>Question fatigue</strong><span>Match clarification depth to ambiguity</span><span>Information gain + adaptive 1 / 3 / 5 budget</span></div>
          <div className="decision-row"><strong>Silent requirement drift</strong><span>Preserve and challenge old decisions</span><span><code>at-risk</code> state + impact edges</span></div>
          <div className="decision-row"><strong>Noisy learning signal</strong><span>Never auto-train on raw feedback</span><span>Human-reviewed failure and negative-sample pool</span></div>
          <div className="decision-row"><strong>Uncontrolled AI spend</strong><span>Route by risk and expose economics</span><span>Model tiers + usage, cost and latency telemetry</span></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-evidence">
        <div className="portfolio-section-title"><span>04</span><div><small>Evidence, not theatre</small><h2>Measured claims stay separate from targets</h2></div></div>
        <div className="evidence-columns">
          <div>
            <h3><CheckCircle2 size={17} /> Verified in repository</h3>
            <p>40 automated tests, 100% demo trace coverage, six-dimensional evaluation, deterministic fallback, protected model boundary and three export formats.</p>
          </div>
          <div>
            <h3><CircleDashed size={17} /> Next validation</h3>
            <p>Real-user question utility, open-domain accuracy, live P50/P95 latency, per-document cost and reviewed failure recurrence rate.</p>
          </div>
        </div>
        <button className="text-button portfolio-evaluation-link" onClick={onOpenEvaluation}>Open live evaluation <ArrowRight size={15} /></button>
      </section>
    </div>
  )
}
