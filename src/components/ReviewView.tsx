import { AlertTriangle, Check, Download, FileDown, Github, Plus, Quote, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import { DEMO_FEEDBACK } from '../core/sample'
import { downloadMarkdown, exportGithubIssues, exportPrd, exportUserStories } from '../core/exports'
import type { SpecProject } from '../core/types'

interface ReviewViewProps {
  project: SpecProject
  onAddFeedback: (title: string, content: string) => void
  onAcceptAll: () => void
}

export function ReviewView({ project, onAddFeedback, onAcceptAll }: ReviewViewProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const accepted = project.requirements.filter((item) => item.status === 'accepted' || item.status === 'modified').length
  const atRisk = project.requirements.filter((item) => item.status === 'at-risk').length + project.decisions.filter((item) => item.status === 'at-risk').length

  const submitFeedback = () => {
    if (!feedback.trim()) return
    onAddFeedback(`Feedback ${project.sources.filter((source) => source.kind === 'feedback').length + 1}`, feedback.trim())
    setFeedback('')
    setFeedbackOpen(false)
  }

  return (
    <div className="review-layout">
      <section className="review-main">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Human review gate</span>
            <h1>Requirement package</h1>
          </div>
          <button className="secondary-button" onClick={() => setFeedbackOpen(true)}><Plus size={16} /> Add feedback</button>
        </div>

        <div className="review-metrics">
          <div><span>Requirements</span><strong>{project.requirements.length}</strong><small>{accepted} accepted</small></div>
          <div><span>Decisions</span><strong>{project.decisions.length}</strong><small>{project.questions.length} questions</small></div>
          <div><span>Trace links</span><strong>{project.edges.length}</strong><small>{project.evidence.length} evidence nodes</small></div>
          <div className={atRisk > 0 ? 'risk' : ''}><span>At risk</span><strong>{atRisk}</strong><small>{project.impacts.length} impact findings</small></div>
        </div>

        {project.impacts.length > 0 ? (
          <div className="impact-section">
            <div className="subsection-title"><div><ShieldAlert size={18} /><h2>Change impact</h2></div><span>{project.impacts.length} findings</span></div>
            <div className="impact-list">
              {project.impacts.map((impact) => (
                <div key={impact.id} className="impact-row">
                  <span className={`severity-badge ${impact.severity}`}>{impact.severity}</span>
                  <p>{impact.explanation}</p>
                  <code>{impact.affectedNodeIds[0]}</code>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="impact-empty"><Check size={18} /><span>No unresolved feedback impact</span></div>
        )}

        <div className="review-requirements">
          <div className="subsection-title"><div><h2>Review queue</h2></div><span>{project.requirements.length - accepted} pending</span></div>
          {project.requirements.map((requirement) => (
            <div className="review-row" key={requirement.id}>
              <span className={`priority ${requirement.priority.toLowerCase()}`}>{requirement.priority}</span>
              <div><strong>{requirement.title}</strong><p>{requirement.statement}</p></div>
              <span className={`status-label ${requirement.status}`}>{requirement.status}</span>
              <span className="evidence-count"><Quote size={14} /> {requirement.evidenceIds.length}</span>
            </div>
          ))}
        </div>

        <div className="review-footer">
          <div><strong>{accepted === project.requirements.length ? 'Package accepted' : 'Review required'}</strong><span>Accepted and modified items count as reviewed.</span></div>
          <button className="primary-button" onClick={onAcceptAll} disabled={atRisk > 0}><Check size={16} /> Accept package</button>
        </div>
      </section>

      <aside className="export-panel">
        <div className="panel-title"><h2>Export</h2><FileDown size={17} /></div>
        <button onClick={() => downloadMarkdown('specloop-prd.md', exportPrd(project))}>
          <Download size={17} /><span><strong>PRD</strong><small>Requirements and decisions</small></span>
        </button>
        <button onClick={() => downloadMarkdown('specloop-user-stories.md', exportUserStories(project))}>
          <Download size={17} /><span><strong>User stories</strong><small>Story and acceptance format</small></span>
        </button>
        <button onClick={() => downloadMarkdown('specloop-github-issues.md', exportGithubIssues(project))}>
          <Github size={17} /><span><strong>GitHub Issues</strong><small>Issue-ready Markdown</small></span>
        </button>

        <div className="audit-preview">
          <span className="field-label">Recent activity</span>
          {project.audit.slice(-5).reverse().map((event) => (
            <div key={event.id}><i /><span><strong>{event.action}</strong><small>{new Date(event.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</small></span></div>
          ))}
        </div>
      </aside>

      {feedbackOpen ? (
        <div className="drawer-backdrop" onMouseDown={() => setFeedbackOpen(false)}>
          <aside className="drawer feedback-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div><span className="eyebrow">Change analysis</span><h2>Add feedback</h2></div>
              <button className="icon-button" onClick={() => setFeedbackOpen(false)} title="Close"><X size={18} /></button>
            </div>
            <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Paste new feedback or a changed constraint…" />
            <button className="text-button demo-feedback" onClick={() => setFeedback(DEMO_FEEDBACK)}><AlertTriangle size={15} /> Use demo change</button>
            <div className="drawer-actions"><button className="primary-button" onClick={submitFeedback} disabled={!feedback.trim()}>Analyze impact</button></div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}

