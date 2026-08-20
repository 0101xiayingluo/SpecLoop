import { useEffect, useState } from 'react'
import { ClarifyView } from './components/ClarifyView'
import { EvaluationView } from './components/EvaluationView'
import { IntakeView } from './components/IntakeView'
import { PreferencesPanel } from './components/PreferencesPanel'
import { RequirementsView } from './components/RequirementsView'
import { ReviewView } from './components/ReviewView'
import { Shell, type AppView } from './components/Shell'
import { TraceView } from './components/TraceView'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './core/reasoner'
import { clearProject, loadProject, saveProject } from './core/persistence'
import { markAllRequirements, resolveImpact, updateAcceptanceCriterion, updatePreferences, updateRequirement } from './core/projectActions'
import { DEMO_SOURCE } from './core/sample'
import { createProject, transition } from './core/stateMachine'
import type { Priority, ReviewStatus, SourceKind, SpecProject, WorkingPreferences } from './core/types'

function initialView(project: SpecProject): AppView {
  if (project.stage === 'draft') return 'requirements'
  if (project.stage === 'trace') return 'trace'
  if (project.stage === 'review') return 'review'
  return 'workspace'
}

export default function App() {
  const [project, setProject] = useState<SpecProject>(() => loadProject() ?? createProject())
  const [activeView, setActiveView] = useState<AppView>(() => initialView(loadProject() ?? createProject()))
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    saveProject(project)
  }, [project])

  const withErrorBoundary = (action: () => void) => {
    try {
      setError('')
      action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unexpected workflow error')
    }
  }

  const analyze = (title: string, content: string, kind: SourceKind) => {
    withErrorBoundary(() => {
      setProject((current) => analyzeMaterial(current, title, content, kind))
      setActiveView('workspace')
    })
  }

  const loadDemo = () => {
    withErrorBoundary(() => {
      const demo = analyzeMaterial(createProject('Course project requirements'), 'Course project discussion', DEMO_SOURCE, 'markdown')
      setProject(demo)
      setActiveView('workspace')
    })
  }

  const answer = (questionId: string, optionId: string, customAnswer?: string) => {
    withErrorBoundary(() => setProject((current) => answerQuestion(current, questionId, optionId, customAnswer)))
  }

  const synthesize = () => {
    withErrorBoundary(() => {
      setProject((current) => synthesizeProject(current))
      setActiveView('requirements')
    })
  }

  const openTrace = () => {
    withErrorBoundary(() => {
      setProject((current) => current.stage === 'draft' ? transition(current, 'trace') : current)
      setActiveView('trace')
    })
  }

  const openReview = () => {
    withErrorBoundary(() => {
      setProject((current) => {
        if (current.stage === 'draft') return transition(transition(current, 'trace'), 'review')
        if (current.stage === 'trace') return transition(current, 'review')
        return current
      })
      setActiveView('review')
    })
  }

  const changeView = (view: AppView) => {
    if (view === 'trace') {
      openTrace()
      return
    }
    if (view === 'review') {
      openReview()
      return
    }
    setActiveView(view)
  }

  const reset = () => {
    if (project.sources.length > 0 && !window.confirm('Start a new project? The current local project will be removed.')) return
    clearProject()
    setProject(createProject())
    setActiveView('workspace')
    setError('')
  }

  const updateRequirementItem = (
    requirementId: string,
    update: { title?: string; statement?: string; priority?: Priority; status?: ReviewStatus },
  ) => setProject((current) => updateRequirement(current, requirementId, update))

  const updateCriterion = (
    requirementId: string,
    criterionId: string,
    update: { given?: string; when?: string; then?: string },
  ) => setProject((current) => updateAcceptanceCriterion(current, requirementId, criterionId, update))

  const updateWorkingPreferences = (change: Partial<Omit<WorkingPreferences, 'updatedAt'>>) => {
    setProject((current) => updatePreferences(current, change))
  }

  let content
  if (activeView === 'requirements') {
    content = <RequirementsView project={project} onUpdate={updateRequirementItem} onUpdateCriterion={updateCriterion} onOpenTrace={openTrace} />
  } else if (activeView === 'trace') {
    content = <TraceView project={project} onOpenReview={openReview} />
  } else if (activeView === 'review') {
    content = (
      <ReviewView
        project={project}
        onAddFeedback={(title, value) => setProject((current) => addFeedback(current, title, value))}
        onAcceptAll={() => setProject((current) => markAllRequirements(current, 'accepted'))}
        onResolveImpact={(impactId) => setProject((current) => resolveImpact(current, impactId))}
      />
    )
  } else if (activeView === 'evaluation') {
    content = <EvaluationView project={project} />
  } else if (project.stage === 'intake') {
    content = <IntakeView sources={project.sources} onAnalyze={analyze} onLoadDemo={loadDemo} />
  } else if (project.stage === 'clarify') {
    content = <ClarifyView project={project} onAnswer={answer} onSynthesize={synthesize} />
  } else {
    content = <RequirementsView project={project} onUpdate={updateRequirementItem} onUpdateCriterion={updateCriterion} onOpenTrace={openTrace} />
  }

  return (
    <Shell
      project={project}
      activeView={activeView}
      onViewChange={changeView}
      onNewProject={reset}
      onOpenPreferences={() => setPreferencesOpen(true)}
    >
      {error ? <div className="global-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div> : null}
      {content}
      <PreferencesPanel
        open={preferencesOpen}
        preferences={project.preferences}
        onClose={() => setPreferencesOpen(false)}
        onChange={updateWorkingPreferences}
      />
    </Shell>
  )
}
