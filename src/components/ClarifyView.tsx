import { ArrowRight, Check, Quote, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ClarificationQuestion, RequirementIssue, SpecProject } from '../core/types'

interface ClarifyViewProps {
  project: SpecProject
  onAnswer: (questionId: string, optionId: string, customAnswer?: string) => void
  onSynthesize: () => void
}

function IssueRow({ issue, active }: { issue: RequirementIssue; active: boolean }) {
  return (
    <li className={active ? 'active' : ''}>
      <span className={`severity-dot ${issue.severity}`} />
      <div>
        <strong>{issue.title}</strong>
        <span>{issue.kind} · {issue.severity}</span>
      </div>
      {issue.resolved ? <Check size={15} /> : null}
    </li>
  )
}

function QuestionPanel({
  question,
  index,
  total,
  onAnswer,
}: {
  question: ClarificationQuestion
  index: number
  total: number
  onAnswer: (questionId: string, optionId: string, customAnswer?: string) => void
}) {
  const [selected, setSelected] = useState(question.answer ? 'saved' : '')
  const [custom, setCustom] = useState('')
  useEffect(() => { setSelected(question.answer ? 'saved' : ''); setCustom('') }, [question.id, question.answer])

  return (
    <div className="question-panel">
      <div className="question-meta">
        <span>Question {index + 1} of {total}</span>
        <strong>Information gain {question.informationGain}</strong>
      </div>
      <h1>{question.prompt}</h1>
      <p className="why-line">{question.why}</p>

      <div className="question-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            className={selected === option.id ? 'selected' : ''}
            onClick={() => setSelected(option.id)}
          >
            <span>{option.id}</span>
            <div>
              <strong>{option.label}</strong>
              <small>{option.value}</small>
            </div>
            {question.recommendationId === option.id ? <em>Recommended</em> : null}
          </button>
        ))}
        <label className={selected === 'custom' ? 'custom-option selected' : 'custom-option'}>
          <input type="radio" checked={selected === 'custom'} onChange={() => setSelected('custom')} />
          <span>Custom</span>
          <input value={custom} onFocus={() => setSelected('custom')} onChange={(event) => setCustom(event.target.value)} placeholder="Write a short decision" />
        </label>
      </div>

      <div className="question-actions">
        <span>Highest-impact unresolved item</span>
        <button
          className="primary-button"
          disabled={!selected || selected === 'saved' || (selected === 'custom' && !custom.trim())}
          onClick={() => onAnswer(question.id, selected, selected === 'custom' ? custom : undefined)}
        >
          Save decision <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function ClarifyView({ project, onAnswer, onSynthesize }: ClarifyViewProps) {
  const current = project.questions[project.currentQuestionIndex]
  const activeIssueIds = new Set(current?.issueIds ?? [])
  const resolvedCount = project.questions.filter((item) => item.answer).length
  const complete = project.questions.every((item) => Boolean(item.answer))

  return (
    <div className="clarify-layout">
      <aside className="issue-rail">
        <div className="panel-title">
          <h2>Analysis findings</h2>
          <span>{project.issues.length}</span>
        </div>
        <div className="finding-summary">
          <div><strong>{project.issues.filter((item) => item.kind === 'conflict').length}</strong><span>Conflicts</span></div>
          <div><strong>{project.issues.filter((item) => item.kind === 'missing').length}</strong><span>Missing</span></div>
          <div><strong>{project.issues.filter((item) => item.kind === 'assumption').length}</strong><span>Assumptions</span></div>
        </div>
        <ul className="issue-list">
          {project.issues.map((issue) => <IssueRow key={issue.id} issue={issue} active={activeIssueIds.has(issue.id)} />)}
        </ul>
      </aside>

      <section className="clarification-work">
        <div className="evidence-strip">
          <Quote size={15} />
          {current ? project.issues.filter((issue) => current.issueIds.includes(issue.id)).flatMap((issue) => issue.evidenceIds).slice(0, 2).map((id) => {
            const evidence = project.evidence.find((item) => item.id === id)
            return evidence ? <span key={id}>“{evidence.quote}”</span> : null
          }) : <span>All queued questions are resolved.</span>}
        </div>

        {current ? (
          <QuestionPanel question={current} index={project.currentQuestionIndex} total={project.questions.length} onAnswer={onAnswer} />
        ) : (
          <div className="clarification-complete">
            <div className="complete-icon"><Check size={24} /></div>
            <span className="eyebrow">Clarification complete</span>
            <h1>{resolvedCount} decisions recorded</h1>
            <p>All selected high-impact ambiguities have an explicit decision.</p>
            <button className="primary-button" onClick={onSynthesize}>Generate requirements <ArrowRight size={16} /></button>
          </div>
        )}

        {!complete && project.questions.length === 0 ? (
          <div className="clarification-complete">
            <TriangleAlert size={24} />
            <h1>No blocking questions</h1>
            <button className="primary-button" onClick={onSynthesize}>Generate requirements <ArrowRight size={16} /></button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

