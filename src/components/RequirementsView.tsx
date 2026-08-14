import { ArrowRight, Check, ChevronRight, FileText, Pencil, Quote, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Priority, RequirementItem, ReviewStatus, SpecProject } from '../core/types'

interface RequirementsViewProps {
  project: SpecProject
  onUpdate: (requirementId: string, update: { title?: string; statement?: string; priority?: Priority; status?: ReviewStatus }) => void
  onOpenTrace: () => void
}

function statusLabel(status: ReviewStatus): string {
  if (status === 'at-risk') return 'At risk'
  return status[0].toUpperCase() + status.slice(1)
}

export function RequirementsView({ project, onUpdate, onOpenTrace }: RequirementsViewProps) {
  const [selectedId, setSelectedId] = useState(project.requirements[0]?.id ?? '')
  const [editing, setEditing] = useState(false)
  const selected = useMemo(
    () => project.requirements.find((item) => item.id === selectedId) ?? project.requirements[0],
    [project.requirements, selectedId],
  )
  const [draftTitle, setDraftTitle] = useState(selected?.title ?? '')
  const [draftStatement, setDraftStatement] = useState(selected?.statement ?? '')

  useEffect(() => {
    setDraftTitle(selected?.title ?? '')
    setDraftStatement(selected?.statement ?? '')
    setEditing(false)
  }, [selected?.id, selected?.statement, selected?.title])

  const saveEdit = () => {
    if (!selected) return
    onUpdate(selected.id, { title: draftTitle.trim(), statement: draftStatement.trim(), status: 'modified' })
    setEditing(false)
  }

  const accepted = project.requirements.filter((item) => item.status === 'accepted' || item.status === 'modified').length

  return (
    <div className="requirements-layout">
      <section className="requirements-table-panel">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">Generated specification</span>
            <h1>Requirements</h1>
          </div>
          <div className="heading-actions">
            <span className="review-progress">{accepted}/{project.requirements.length} reviewed</span>
            <button className="primary-button" onClick={onOpenTrace}>Open trace <ArrowRight size={16} /></button>
          </div>
        </div>

        <div className="requirement-table" role="table" aria-label="Requirements">
          <div className="requirement-row header" role="row">
            <span>ID</span><span>Requirement</span><span>Priority</span><span>Status</span><span>Evidence</span><span />
          </div>
          {project.requirements.map((requirement) => (
            <button
              className={`requirement-row ${selected?.id === requirement.id ? 'selected' : ''}`}
              key={requirement.id}
              onClick={() => setSelectedId(requirement.id)}
              role="row"
            >
              <code>{requirement.id.replace('req-', 'R-').toUpperCase()}</code>
              <span><strong>{requirement.title}</strong><small>{requirement.statement}</small></span>
              <span className={`priority ${requirement.priority.toLowerCase()}`}>{requirement.priority}</span>
              <span className={`status-label ${requirement.status}`}>{statusLabel(requirement.status)}</span>
              <span className="evidence-count"><Quote size={14} /> {requirement.evidenceIds.length}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <aside className="requirement-inspector">
          <div className="inspector-header">
            <div>
              <span className="eyebrow">{selected.id}</span>
              {editing ? <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} /> : <h2>{selected.title}</h2>}
            </div>
            <button className="icon-button" onClick={() => setEditing(!editing)} title={editing ? 'Cancel edit' : 'Edit requirement'}>
              {editing ? <X size={17} /> : <Pencil size={17} />}
            </button>
          </div>

          <div className="inspector-section">
            <span className="field-label">Requirement</span>
            {editing ? <textarea value={draftStatement} onChange={(event) => setDraftStatement(event.target.value)} /> : <p>{selected.statement}</p>}
          </div>

          <div className="inspector-grid">
            <label>
              <span className="field-label">Priority</span>
              <select value={selected.priority} onChange={(event) => onUpdate(selected.id, { priority: event.target.value as Priority })}>
                {(['P0', 'P1', 'P2', 'P3'] as const).map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </label>
            <div>
              <span className="field-label">Status</span>
              <span className={`status-label ${selected.status}`}>{statusLabel(selected.status)}</span>
            </div>
          </div>

          <div className="inspector-section">
            <span className="field-label">Acceptance criteria</span>
            {selected.criteria.map((criterion) => (
              <div className="criterion-block" key={criterion.id}>
                <p><b>Given</b> {criterion.given}</p>
                <p><b>When</b> {criterion.when}</p>
                <p><b>Then</b> {criterion.then}</p>
              </div>
            ))}
          </div>

          <div className="inspector-section evidence-section">
            <span className="field-label">Source evidence</span>
            {selected.evidenceIds.map((id) => {
              const evidence = project.evidence.find((item) => item.id === id)
              const source = evidence ? project.sources.find((item) => item.id === evidence.sourceId) : undefined
              return evidence ? (
                <blockquote key={id}>
                  <Quote size={14} />
                  <p>{evidence.quote}</p>
                  <cite><FileText size={13} /> {source?.title} · line {evidence.lineStart}</cite>
                </blockquote>
              ) : null
            })}
          </div>

          <div className="inspector-actions">
            {editing ? (
              <button className="primary-button" onClick={saveEdit}>Save changes</button>
            ) : (
              <button
                className={selected.status === 'accepted' ? 'accepted-button' : 'primary-button'}
                onClick={() => onUpdate(selected.id, { status: selected.status === 'accepted' ? 'proposed' : 'accepted' })}
              >
                <Check size={16} /> {selected.status === 'accepted' ? 'Accepted' : 'Accept requirement'}
              </button>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  )
}

