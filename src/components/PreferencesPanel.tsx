import { X } from 'lucide-react'
import type { WorkingPreferences } from '../core/types'

interface PreferencesPanelProps {
  open: boolean
  preferences: WorkingPreferences
  onClose: () => void
  onChange: (change: Partial<Omit<WorkingPreferences, 'updatedAt'>>) => void
}

export function PreferencesPanel({ open, preferences, onClose, onChange }: PreferencesPanelProps) {
  if (!open) return null
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(event) => event.stopPropagation()} aria-label="Working preferences">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">Project memory</span>
            <h2>Working preferences</h2>
          </div>
          <button className="icon-button" onClick={onClose} title="Close"><X size={18} /></button>
        </div>

        <label className="control-group">
          <span>Prioritization</span>
          <select value={preferences.priorityMode} onChange={(event) => onChange({ priorityMode: event.target.value as WorkingPreferences['priorityMode'] })}>
            <option value="risk-first">Risk first</option>
            <option value="value-first">User value first</option>
            <option value="effort-first">Delivery effort first</option>
          </select>
        </label>
        <label className="control-group">
          <span>Writing style</span>
          <div className="segmented-control">
            {(['concise', 'balanced', 'detailed'] as const).map((value) => (
              <button key={value} className={preferences.writingStyle === value ? 'active' : ''} onClick={() => onChange({ writingStyle: value })}>{value}</button>
            ))}
          </div>
        </label>
        <label className="control-group">
          <span>Risk tolerance</span>
          <select value={preferences.riskTolerance} onChange={(event) => onChange({ riskTolerance: event.target.value as WorkingPreferences['riskTolerance'] })}>
            <option value="low">Low · flag uncertainty early</option>
            <option value="medium">Medium · balance speed and certainty</option>
            <option value="high">High · favor speed</option>
          </select>
        </label>

        <div className="memory-note">
          <strong>Saved locally</strong>
          <p>These preferences are applied to this project and restored in this browser.</p>
        </div>
      </aside>
    </div>
  )
}

