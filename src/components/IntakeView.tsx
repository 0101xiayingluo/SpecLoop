import { FileText, LoaderCircle, Play, Sparkles, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { parseFile } from '../core/files'
import type { SourceKind, SourceMaterial } from '../core/types'

interface IntakeViewProps {
  sources: SourceMaterial[]
  analyzing: boolean
  reasonerMode: 'demo' | 'model'
  onAnalyze: (title: string, content: string, kind: SourceKind) => void | Promise<void>
  onLoadDemo: () => void
  onRunFullDemo: () => void
}

export function IntakeView({ sources, analyzing, reasonerMode, onAnalyze, onLoadDemo, onRunFullDemo }: IntakeViewProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [kind, setKind] = useState<SourceKind>('paste')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const parsed = await parseFile(file)
      setTitle(parsed.title)
      setContent(parsed.content)
      setKind(parsed.kind)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'File parsing failed')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    if (!content.trim()) return
    void onAnalyze(title.trim() || 'Pasted discussion', content.trim(), kind)
  }

  return (
    <div className="intake-layout">
      <section className="intake-editor">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Source intake</span>
            <h1>Add discussion material</h1>
          </div>
          <div className="heading-actions">
            <button className="secondary-button" onClick={onLoadDemo}>
              <Sparkles size={16} /> Load demo
            </button>
            <button className="text-button" onClick={onRunFullDemo}>
              <Play size={15} fill="currentColor" /> Run full demo
            </button>
          </div>
        </div>

        <label className="title-input">
          <span>Source name</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Sprint review notes" />
        </label>

        <div className="material-editor">
          <textarea
            value={content}
            onChange={(event) => { setContent(event.target.value); setKind('paste') }}
            placeholder="Paste meeting notes, chat excerpts, user feedback, or project documents…"
            aria-label="Source material"
          />
          <div className="editor-footer">
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.markdown,.json,.pdf,.docx"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.currentTarget.value = ''
                void handleFile(file)
              }}
            />
            <button className="text-button" onClick={() => fileInput.current?.click()} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
              Upload file
            </button>
            <span className="format-list">TXT · MD · JSON · PDF · DOCX</span>
            <span className="char-count">{content.length.toLocaleString()} chars</span>
          </div>
        </div>
        {error ? <p className="inline-error">{error}</p> : null}

        <div className="intake-actions">
          <button className="primary-button" onClick={submit} disabled={!content.trim() || busy || analyzing}>
            {analyzing ? <LoaderCircle className="spin" size={16} /> : <Play size={16} fill="currentColor" />}
            {analyzing ? 'Analyzing…' : reasonerMode === 'model' ? 'Analyze with model' : 'Analyze evidence'}
          </button>
        </div>
      </section>

      <aside className="source-register">
        <div className="panel-title">
          <h2>Source register</h2>
          <span>{sources.length}</span>
        </div>
        {sources.length === 0 ? (
          <div className="empty-register">
            <FileText size={22} />
            <span>No sources yet</span>
          </div>
        ) : (
          <ul>
            {sources.map((source) => (
              <li key={source.id}>
                <FileText size={16} />
                <div><strong>{source.title}</strong><span>{source.kind} · {source.content.length.toLocaleString()} chars</span></div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
