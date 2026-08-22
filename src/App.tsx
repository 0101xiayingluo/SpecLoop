import { useEffect, useState } from 'react'
import { ClarifyView } from './components/ClarifyView'
import { DemoView } from './components/DemoView'
import { EmptyStageView } from './components/EmptyStageView'
import { EvaluationView } from './components/EvaluationView'
import { IntakeView } from './components/IntakeView'
import { PortfolioView } from './components/PortfolioView'
import { PreferencesPanel } from './components/PreferencesPanel'
import { RequirementsView } from './components/RequirementsView'
import { ReviewView } from './components/ReviewView'
import { Shell, type AppView } from './components/Shell'
import { TraceView } from './components/TraceView'
import { addFeedback, analyzeMaterial, answerQuestion, synthesizeProject } from './core/reasoner'
import { clearProject, loadProject, saveProject } from './core/persistence'
import { enhanceAnalysisWithModel, ModelProviderError, recordModelFallback } from './core/modelReasoner'
import { agentApiUrl } from './core/api'
import { markAllRequirements, resolveImpact, reviewFailureCase, updatePreferences, updateRequirement, updateRequirementDraft } from './core/projectActions'
import { DEMO_SOURCE } from './core/sample'
import { createProject, transition } from './core/stateMachine'
import type { EvidenceProvenance, Priority, ReviewStatus, SourceKind, SpecProject, WorkingPreferences } from './core/types'

function initialView(project: SpecProject): AppView {
  if (project.stage === 'draft') return 'requirements'
  if (project.stage === 'trace') return 'trace'
  if (project.stage === 'review') return 'review'
  return 'workspace'
}

export default function App() {
  const [project, setProject] = useState<SpecProject>(() => loadProject() ?? createProject())
  const [activeView, setActiveView] = useState<AppView>(() => initialView(project))
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [providerStatus, setProviderStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')

  useEffect(() => {
    let errorTimer: number | undefined
    try {
      saveProject(project)
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'Browser storage is unavailable'
      errorTimer = window.setTimeout(() => setError(`Project could not be saved locally. ${detail}`), 0)
    }
    return () => window.clearTimeout(errorTimer)
  }, [project])

  useEffect(() => {
    let active = true
    void fetch(agentApiUrl('/api/health'))
      .then(async (response) => response.ok ? response.json() as Promise<{ available?: boolean }> : { available: false })
      .then((result) => {
        if (active) setProviderStatus(result.available ? 'available' : 'unavailable')
      })
      .catch(() => {
        if (active) setProviderStatus('unavailable')
      })
    return () => { active = false }
  }, [])

  const withErrorBoundary = (action: () => void) => {
    try {
      setError('')
      action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unexpected workflow error')
    }
  }

  const analyze = async (title: string, content: string, kind: SourceKind, provenance: EvidenceProvenance) => {
    setError('')
    setAnalyzing(true)
    try {
      const baseline = analyzeMaterial(project, title, content, kind, provenance)
      if (project.preferences.reasonerMode === 'model' && baseline.analysisPlan?.route === 'model-assisted') {
        try {
          setProject(await enhanceAnalysisWithModel(baseline))
        } catch (reason) {
          const message = reason instanceof Error ? reason.message : 'Model provider unavailable'
          setProject(recordModelFallback(baseline, message, reason instanceof ModelProviderError ? reason.run : undefined))
          setError(`Model provider unavailable; deterministic fallback used. ${message}`)
        }
      } else {
        setProject(baseline)
      }
      setActiveView('workspace')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unexpected analysis error')
    } finally {
      setAnalyzing(false)
    }
  }

  const loadDemo = () => {
    withErrorBoundary(() => {
      const demo = analyzeMaterial(createProject('Course project requirements'), 'Course project discussion', DEMO_SOURCE, 'markdown')
      setProject(demo)
      setActiveView('workspace')
    })
  }

  const runFullDemo = () => {
    withErrorBoundary(() => {
      let demo = analyzeMaterial(createProject('Course project requirements'), 'Course project discussion', DEMO_SOURCE, 'markdown')
      for (const question of demo.questions) {
        demo = answerQuestion(demo, question.id, question.recommendationId ?? question.options[0].id)
      }
      setProject(synthesizeProject(demo))
      setActiveView('requirements')
    })
  }

  const answer = (questionId: string, optionId: string, customAnswer?: string) => {
    withErrorBoundary(() => setProject(answerQuestion(project, questionId, optionId, customAnswer)))
  }

  const answerRecommendations = () => {
    withErrorBoundary(() => setProject(project.questions.reduce((next, question) => (
      answerQuestion(next, question.id, question.recommendationId ?? question.options[0].id)
    ), project)))
  }

  const synthesize = () => {
    withErrorBoundary(() => {
      setProject(synthesizeProject(project))
      setActiveView('requirements')
    })
  }

  const openTrace = () => {
    withErrorBoundary(() => {
      setProject(project.stage === 'draft' ? transition(project, 'trace') : project)
      setActiveView('trace')
    })
  }

  const openReview = () => {
    withErrorBoundary(() => {
      const reviewed = project.stage === 'draft'
        ? transition(transition(project, 'trace'), 'review')
        : project.stage === 'trace' ? transition(project, 'review') : project
      setProject(reviewed)
      setActiveView('review')
    })
  }

  const changeView = (view: AppView) => {
    if (!['workspace', 'demo', 'portfolio'].includes(view) && project.requirements.length === 0) {
      setActiveView(view)
      return
    }
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
    withErrorBoundary(() => {
      clearProject()
      setProject(createProject())
      setActiveView('workspace')
    })
  }

  const updateRequirementItem = (
    requirementId: string,
    update: { title?: string; statement?: string; priority?: Priority; status?: ReviewStatus },
  ) => withErrorBoundary(() => setProject(updateRequirement(project, requirementId, update)))

  const saveRequirementDraft = (
    requirementId: string,
    update: { title: string; statement: string; criteria: Array<{ id: string; given: string; when: string; then: string }> },
  ) => withErrorBoundary(() => setProject(updateRequirementDraft(project, requirementId, update)))

  const updateWorkingPreferences = (change: Partial<Omit<WorkingPreferences, 'updatedAt'>>) => {
    withErrorBoundary(() => setProject(updatePreferences(project, change)))
  }

  let content
  if (activeView === 'portfolio') {
    content = (
      <PortfolioView
        onRunDemo={runFullDemo}
        onOpenDemo={() => setActiveView('demo')}
        onOpenEvaluation={() => setActiveView('evaluation')}
      />
    )
  } else if (activeView === 'demo') {
    content = (
      <DemoView
        project={project}
        onRunDemo={runFullDemo}
        onOpenRequirements={() => setActiveView('requirements')}
        onOpenTrace={openTrace}
        onOpenReview={openReview}
        onOpenEvaluation={() => setActiveView('evaluation')}
      />
    )
  } else if (activeView !== 'workspace' && project.requirements.length === 0) {
    content = (
      <EmptyStageView
        view={activeView}
        onBack={() => setActiveView('workspace')}
        onRunFullDemo={runFullDemo}
      />
    )
  } else if (activeView === 'requirements') {
    content = <RequirementsView project={project} onUpdate={updateRequirementItem} onSaveDraft={saveRequirementDraft} onOpenTrace={openTrace} />
  } else if (activeView === 'trace') {
    content = <TraceView project={project} onOpenReview={openReview} />
  } else if (activeView === 'review') {
    content = (
      <ReviewView
        project={project}
        onAddFeedback={(title, value) => withErrorBoundary(() => setProject(addFeedback(project, title, value)))}
        onAcceptAll={() => withErrorBoundary(() => setProject(markAllRequirements(project, 'accepted')))}
        onResolveImpact={(impactId) => withErrorBoundary(() => setProject(resolveImpact(project, impactId)))}
      />
    )
  } else if (activeView === 'evaluation') {
    content = <EvaluationView project={project} onReviewFailure={(failureId, status) => withErrorBoundary(() => setProject(reviewFailureCase(project, failureId, status)))} />
  } else if (project.stage === 'intake') {
    content = <IntakeView sources={project.sources} analyzing={analyzing} reasonerMode={project.preferences.reasonerMode ?? 'demo'} onAnalyze={analyze} onLoadDemo={loadDemo} onRunFullDemo={runFullDemo} />
  } else if (project.stage === 'clarify') {
    content = <ClarifyView project={project} onAnswer={answer} onAnswerRecommendations={answerRecommendations} onSynthesize={synthesize} />
  } else {
    content = <RequirementsView project={project} onUpdate={updateRequirementItem} onSaveDraft={saveRequirementDraft} onOpenTrace={openTrace} />
  }

  return (
    <Shell
      project={project}
      activeView={activeView}
      onViewChange={changeView}
      onNewProject={reset}
      onOpenPreferences={() => setPreferencesOpen(true)}
      providerStatus={providerStatus}
    >
      {error ? <div className="global-error" role="alert">{error}<button onClick={() => setError('')}>Dismiss</button></div> : null}
      {content}
      <PreferencesPanel
        open={preferencesOpen}
        preferences={project.preferences}
        providerStatus={providerStatus}
        onClose={() => setPreferencesOpen(false)}
        onChange={updateWorkingPreferences}
      />
    </Shell>
  )
}
