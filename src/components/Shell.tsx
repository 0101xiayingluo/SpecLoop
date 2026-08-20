import {
  ClipboardCheck,
  FileStack,
  FlaskConical,
  GitBranch,
  MessageSquareText,
  Plus,
  Settings2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { SpecProject } from '../core/types'

export type AppView = 'workspace' | 'requirements' | 'trace' | 'review' | 'evaluation'

interface ShellProps {
  project: SpecProject
  activeView: AppView
  onViewChange: (view: AppView) => void
  onNewProject: () => void
  onOpenPreferences: () => void
  children: ReactNode
}

const navigation = [
  { id: 'workspace' as const, label: 'Workspace', icon: MessageSquareText },
  { id: 'requirements' as const, label: 'Requirements', icon: FileStack },
  { id: 'trace' as const, label: 'Trace', icon: GitBranch },
  { id: 'review' as const, label: 'Review', icon: ClipboardCheck },
  { id: 'evaluation' as const, label: 'Evaluation', icon: FlaskConical },
]

const stages = [
  { id: 'intake', label: '材料' },
  { id: 'clarify', label: '澄清' },
  { id: 'draft', label: '需求' },
  { id: 'trace', label: '追踪' },
  { id: 'review', label: '评审' },
] as const

export function Shell({ project, activeView, onViewChange, onNewProject, onOpenPreferences, children }: ShellProps) {
  const activeStageIndex = stages.findIndex((stage) => stage.id === project.stage)
  const hasDraft = project.requirements.length > 0

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img src={`${import.meta.env.BASE_URL}specloop-mark.svg`} alt="" width="34" height="34" />
          <div>
            <strong>SpecLoop</strong>
            <span>Evidence workspace</span>
          </div>
        </div>

        <button className="new-project-button" onClick={onNewProject}>
          <Plus size={16} />
          New project
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon
            const disabled = item.id !== 'workspace' && !hasDraft
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'active' : ''}
                onClick={() => onViewChange(item.id)}
                disabled={disabled}
                title={disabled ? 'Generate requirements first' : item.label}
              >
                <Icon size={17} />
                {item.label}
                {item.id === 'review' && project.impacts.length > 0 ? <span className="nav-count">{project.impacts.length}</span> : null}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="project-mini">
          <span>Active project</span>
          <strong title={project.name}>{project.name}</strong>
          <small>{project.sources.length} sources · {project.requirements.length} requirements</small>
        </div>
        <button className="settings-button" onClick={onOpenPreferences} title="Working preferences">
          <Settings2 size={17} />
          Preferences
        </button>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="project-heading">
            <span>Projects /</span>
            <strong>{project.name}</strong>
          </div>
          <ol className="stage-track" aria-label="Workflow progress">
            {stages.map((stage, index) => (
              <li key={stage.id} className={index < activeStageIndex ? 'complete' : index === activeStageIndex ? 'current' : ''}>
                <span>{index + 1}</span>
                {stage.label}
              </li>
            ))}
          </ol>
          <div className={`mode-badge ${project.preferences.reasonerMode === 'model' ? 'model' : ''}`}>
            <span /> {project.preferences.reasonerMode === 'model' ? 'Model Reasoner' : 'Demo Reasoner'}
          </div>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  )
}
