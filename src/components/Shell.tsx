import {
  BookOpenCheck,
  ClipboardCheck,
  FileStack,
  FlaskConical,
  GitBranch,
  MessageSquareText,
  PlayCircle,
  Plus,
  Settings2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { SpecProject } from '../core/types'

export type AppView = 'workspace' | 'requirements' | 'trace' | 'review' | 'evaluation' | 'demo' | 'portfolio'

interface ShellProps {
  project: SpecProject
  activeView: AppView
  onViewChange: (view: AppView) => void
  onNewProject: () => void
  onOpenPreferences: () => void
  providerStatus: 'checking' | 'available' | 'unavailable'
  children: ReactNode
}

const navigation = [
  { id: 'workspace' as const, label: 'Workspace', icon: MessageSquareText },
  { id: 'requirements' as const, label: 'Requirements', icon: FileStack },
  { id: 'trace' as const, label: 'Trace', icon: GitBranch },
  { id: 'review' as const, label: 'Review', icon: ClipboardCheck },
  { id: 'evaluation' as const, label: 'Evaluation', icon: FlaskConical },
  { id: 'demo' as const, label: 'Guided demo', icon: PlayCircle },
  { id: 'portfolio' as const, label: 'Case study', icon: BookOpenCheck },
]

const stages = [
  { id: 'intake', label: '材料' },
  { id: 'clarify', label: '澄清' },
  { id: 'draft', label: '需求' },
  { id: 'trace', label: '追踪' },
  { id: 'review', label: '评审' },
] as const

export function Shell({ project, activeView, onViewChange, onNewProject, onOpenPreferences, providerStatus, children }: ShellProps) {
  const activeStageIndex = stages.findIndex((stage) => stage.id === project.stage)

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
            return (
              <button
                key={item.id}
                className={activeView === item.id ? 'active' : ''}
                onClick={() => onViewChange(item.id)}
                title={item.label}
                aria-current={activeView === item.id ? 'page' : undefined}
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
            <span /> {project.preferences.reasonerMode === 'model'
              ? providerStatus === 'available' ? 'Model Reasoner' : 'Model unavailable'
              : 'Demo Reasoner'}
          </div>
        </header>
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  )
}
