import { ArrowRight, BrainCircuit, Braces, CheckCircle2, CircleDashed, Database, GitBranch, PlayCircle, Route, ShieldCheck, Sparkles, TimerReset } from 'lucide-react'
import { MODEL_BOUNDARIES } from '../core/modelPolicy'

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
          <div><b>48</b> automated tests <i /> <b>1 / 3 / 5</b> adaptive question ceiling</div>
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
          <div><BrainCircuit size={17} /><span>Model strategy</span><strong>Adaptive</strong><small>none / small / large tier by business risk</small></div>
          <div><ShieldCheck size={17} /><span>Reliability</span><strong>Guarded</strong><small>fallback, schema and citations</small></div>
          <div><TimerReset size={17} /><span>Observability</span><strong>Run-level</strong><small>tokens, cost, latency, request ID</small></div>
          <div><GitBranch size={17} /><span>Learning loop</span><strong>Review-gated</strong><small>failures become regression assets after approval</small></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-contracts">
        <div className="portfolio-section-title"><span>03</span><div><small>Field-level architecture</small><h2>Product claims map to inspectable state</h2></div></div>
        <div className="decision-table">
          <div className="decision-row header"><span>Question</span><span>Concrete fields</span><span>What they prove</span></div>
          <div className="decision-row"><strong>How is routing decided?</strong><span><code>analysisPlan.signals</code> · <code>requestedTier</code> · <code>policyVersion</code></span><span>Deterministic score, risk floor and model tier are persisted per project.</span></div>
          <div className="decision-row"><strong>Where is Agent state?</strong><span><code>SpecProject.stage</code> · <code>questions[]</code> · <code>audit[]</code></span><span>A bounded single-Agent state machine, stored locally and replayable without hidden Agent messages.</span></div>
          <div className="decision-row"><strong>How is a bad case located?</strong><span><code>workflowStage</code> · <code>rootCause</code> · <code>fingerprint</code> · <code>relatedRunId</code></span><span>Failure samples link evidence IDs, observed/expected output and provider telemetry.</span></div>
          <div className="decision-row"><strong>How is quality measured?</strong><span><code>routing confusion matrix</code> · <code>IG/question</code> · <code>TP/FP/FN</code></span><span>Labeled fixtures and explicit formulas stay separate from unmeasured business outcomes.</span></div>
        </div>
        <div className="portfolio-contract-note"><Braces size={16} /><span>The MVP intentionally has no inter-Agent communication. Adding multiple Agents would increase coordination state without improving the current evidence-to-decision contract.</span></div>
      </section>

      <section className="portfolio-band portfolio-decisions">
        <div className="portfolio-section-title"><span>04</span><div><small>PM × AI trade-offs</small><h2>Each technical choice answers a product risk</h2></div></div>
        <div className="decision-table">
          <div className="decision-row header"><span>Business risk</span><span>Product decision</span><span>Engineering proof</span></div>
          <div className="decision-row"><strong>Hallucinated rationale</strong><span>Every output cites supplied evidence</span><span>Evidence ID allowlist + trace graph</span></div>
          <div className="decision-row"><strong>Misleading source authority</strong><span>Judge claims by directness and corroboration, not source labels</span><span>Provenance stays inspectable; emotional intensity never raises factual trust automatically</span></div>
          <div className="decision-row"><strong>Question fatigue</strong><span>Match clarification depth to ambiguity</span><span>Information gain + adaptive 1 / 3 / 5 ceiling</span></div>
          <div className="decision-row"><strong>Silent requirement drift</strong><span>Preserve and challenge old decisions</span><span><code>at-risk</code> state + impact edges</span></div>
          <div className="decision-row"><strong>Noisy learning signal</strong><span>Never auto-train on raw feedback</span><span>Human-reviewed failure and negative-sample pool</span></div>
          <div className="decision-row"><strong>Uncontrolled AI spend</strong><span>Route by risk and expose economics</span><span>Model tiers + usage, cost and latency telemetry</span></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-model-boundary">
        <div className="portfolio-section-title"><span>05</span><div><small>Model capability boundary</small><h2>Model price changes the mapping, not the safety contract</h2></div></div>
        <div className="model-boundary-table">
          <div className="model-boundary-row header"><span>Route</span><span>Primary</span><span>Fallback</span><span>Trigger</span><span>Product shape</span></div>
          {MODEL_BOUNDARIES.map((boundary) => (
            <div className="model-boundary-row" key={boundary.complexity}>
              <strong>{boundary.complexity}</strong><span>{boundary.primary}</span><span>{boundary.fallback}</span><span>{boundary.hardTriggers.join(' · ')}</span><small>{boundary.productShape}</small>
            </div>
          ))}
        </div>
        <div className="model-policy-notes">
          <p><strong>If the flagship price drops 80%</strong><span>Re-run quality, latency and cost evals. The small/large split may collapse, but high-risk human authority and grounding gates remain.</span></p>
          <p><strong>If the hosted provider is unavailable</strong><span>Simple stays deterministic; complex falls back to reviewable baseline; high-risk becomes direct manual review with an evidence index.</span></p>
        </div>
      </section>

      <section className="portfolio-band portfolio-business">
        <div className="portfolio-section-title"><span>06</span><div><small>Business hypothesis</small><h2>Optimize accepted decisions, not model calls</h2></div></div>
        <div className="business-case-grid">
          <div><span>Core hypothesis</span><p>Evidence-linked clarification reduces requirement-caused reopening during delivery enough to outweigh model and review cost.</p></div>
          <div><span>Pilot north star</span><p><code>rework-free delivery rate</code> = accepted packages not reopened for requirement ambiguity / accepted packages reaching delivery.</p></div>
          <div><span>Unit economics</span><p><code>net value</code> = avoided rework hours × loaded hourly cost − model cost − human review cost.</p></div>
        </div>
        <div className="business-metric-table">
          <div className="business-metric-row header"><span>Metric role</span><span>Metric</span><span>Current status</span><span>Pilot decision rule</span></div>
          <div className="business-metric-row"><strong>North star</strong><span>Rework-free delivery rate</span><span>Not measured</span><span>Compare against the same team’s manual baseline</span></div>
          <div className="business-metric-row"><strong>Leading</strong><span>Median clarification questions · time to accepted package</span><span>Question budget instrumented</span><span>Median questions ≤ 3; measure review time in pilot</span></div>
          <div className="business-metric-row"><strong>Guardrail</strong><span>Human takeover · fallback · cost per accepted package</span><span>Telemetry schema ready</span><span>Report distributions before setting cost/takeover targets</span></div>
        </div>
      </section>

      <section className="portfolio-band portfolio-evidence">
        <div className="portfolio-section-title"><span>07</span><div><small>Evidence, not theatre</small><h2>Measured claims stay separate from targets</h2></div></div>
        <div className="evidence-columns">
          <div>
            <h3><CheckCircle2 size={17} /> Verified in repository</h3>
            <p>48 automated tests, 5/5 repeated regression runs, 100% demo trace coverage, routing confusion matrix, deterministic fallback and three export formats.</p>
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
