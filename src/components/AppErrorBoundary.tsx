import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearProject } from '../core/persistence'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  failed: boolean
  detail: string
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false, detail: '' }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { failed: true, detail: error.message || 'Unexpected application error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SpecLoop render failure', error, info.componentStack)
  }

  private resetProject = () => {
    try {
      clearProject()
      window.location.reload()
    } catch (error) {
      this.setState({
        failed: true,
        detail: error instanceof Error ? error.message : 'Browser storage could not be cleared',
      })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="runtime-fallback">
        <TriangleAlert size={28} />
        <span className="eyebrow">Recovery mode</span>
        <h1>SpecLoop could not open this saved project</h1>
        <p>{this.state.detail}</p>
        <button className="primary-button" onClick={this.resetProject}>
          <RotateCcw size={16} /> Reset local project
        </button>
      </main>
    )
  }
}
