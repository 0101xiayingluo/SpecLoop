import { ArrowLeft, ClipboardCheck, FileStack, FlaskConical, GitBranch, Play } from 'lucide-react'
interface EmptyStageViewProps {
  view: 'requirements' | 'trace' | 'review' | 'evaluation'
  onBack: () => void
  onRunFullDemo: () => void
}

const emptyState = {
  requirements: {
    icon: FileStack,
    eyebrow: 'Requirements',
    title: 'No requirements generated yet',
    detail: 'Add source material and finish clarification before reviewing the generated requirement set.',
  },
  trace: {
    icon: GitBranch,
    eyebrow: 'Trace',
    title: 'No trace nodes available yet',
    detail: 'The evidence graph appears after requirements and acceptance criteria have been generated.',
  },
  review: {
    icon: ClipboardCheck,
    eyebrow: 'Review',
    title: 'No requirement package to review',
    detail: 'Generate a requirement package before accepting decisions, analyzing feedback, or exporting files.',
  },
  evaluation: {
    icon: FlaskConical,
    eyebrow: 'Evaluation',
    title: 'No project results to evaluate',
    detail: 'Quality gates and trace coverage become available after the first requirement package is generated.',
  },
} as const

export function EmptyStageView({ view, onBack, onRunFullDemo }: EmptyStageViewProps) {
  const state = emptyState[view]
  const Icon = state.icon

  return (
    <section className="stage-empty" aria-live="polite">
      <div className="stage-empty-icon"><Icon size={24} /></div>
      <span className="eyebrow">{state.eyebrow}</span>
      <h1>{state.title}</h1>
      <p>{state.detail}</p>
      <div className="stage-empty-actions">
        <button className="primary-button" onClick={onRunFullDemo}>
          <Play size={15} fill="currentColor" /> Run full demo
        </button>
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={15} /> Back to workspace
        </button>
      </div>
    </section>
  )
}
