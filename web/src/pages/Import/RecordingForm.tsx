import { useEffect, useState } from 'react'
import { searchEnsembles, searchPeople } from '../../api/importClient'
import type { EnsembleSearchResult, PerformerRole, PersonSearchResult } from '../../api/importTypes'
import { Disclosure } from './Disclosure'
import { useDebouncedValue } from './useDebouncedValue'
import type { ReviewPerformer, ReviewRecording } from './reviewTypes'
import shared from './ImportShared.module.css'

interface RecordingFormProps {
  value: ReviewRecording
  onChange: (recording: ReviewRecording) => void
}

export function RecordingForm({ value, onChange }: RecordingFormProps) {
  return (
    <div>
      <div className={shared.fieldRow}>
        <div className={shared.field} style={{ position: 'relative' }}>
          <span className={shared.fieldLabel}>Ensemble</span>
          <EnsembleField value={value} onChange={onChange} />
        </div>
      </div>

      <span className={shared.fieldLabel}>Performers</span>
      <PerformersEditor value={value} onChange={onChange} />

      <Disclosure label="Label, years, notes, default recording…">
        <div className={shared.fieldRow}>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Label</span>
            <input
              className={shared.input}
              value={value.label}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Recording year</span>
            <input
              className={shared.input}
              type="number"
              value={value.recordingYear ?? ''}
              onChange={(e) => onChange({ ...value, recordingYear: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Release year</span>
            <input
              className={shared.input}
              type="number"
              value={value.releaseYear ?? ''}
              onChange={(e) => onChange({ ...value, releaseYear: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        </div>

        <label className={shared.checkboxRow} style={{ marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={value.isDefaultInLibrary}
            onChange={(e) => onChange({ ...value, isDefaultInLibrary: e.target.checked })}
          />
          Default recording for this work
        </label>

        <label className={shared.field}>
          <span className={shared.fieldLabel}>Notes</span>
          <textarea
            className={shared.input}
            rows={2}
            value={value.notes}
            onChange={(e) => onChange({ ...value, notes: e.target.value })}
          />
        </label>
      </Disclosure>
    </div>
  )
}

function EnsembleField({ value, onChange }: RecordingFormProps) {
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<EnsembleSearchResult[]>([])
  const debouncedName = useDebouncedValue(value.ensembleName, 250)

  useEffect(() => {
    if (debouncedName.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    searchEnsembles(debouncedName.trim()).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedName])

  return (
    <div className={shared.searchBox}>
      <input
        className={shared.input}
        placeholder="Orchestra / ensemble name"
        value={value.ensembleName}
        onChange={(e) => onChange({ ...value, ensembleName: e.target.value, ensembleId: null })}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {focused && results.length > 0 && (
        <div className={shared.suggestions}>
          {results.map((r) => (
            <div
              key={r.id}
              className={shared.suggestion}
              onMouseDown={() => onChange({ ...value, ensembleId: r.id, ensembleName: r.name })}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PerformersEditor({ value, onChange }: RecordingFormProps) {
  function update(i: number, patch: Partial<ReviewPerformer>) {
    const next = value.performers.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    onChange({ ...value, performers: next })
  }
  function remove(i: number) {
    onChange({ ...value, performers: value.performers.filter((_, idx) => idx !== i) })
  }
  function add() {
    onChange({
      ...value,
      performers: [...value.performers, { personId: null, name: '', role: 'performer', instrument: '' }],
    })
  }

  return (
    <div>
      {value.performers.map((p, i) => (
        <PerformerRow key={i} performer={p} onUpdate={(patch) => update(i, patch)} onRemove={() => remove(i)} />
      ))}
      <button className={shared.buttonSmall} onClick={add}>
        + Add performer
      </button>
    </div>
  )
}

function PerformerRow({
  performer,
  onUpdate,
  onRemove,
}: {
  performer: ReviewPerformer
  onUpdate: (patch: Partial<ReviewPerformer>) => void
  onRemove: () => void
}) {
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<PersonSearchResult[]>([])
  const debouncedName = useDebouncedValue(performer.name, 250)

  useEffect(() => {
    if (debouncedName.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    searchPeople(debouncedName.trim()).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedName])

  return (
    <div className={shared.repeatRow}>
      <div className={shared.searchBox}>
        <input
          className={shared.input}
          placeholder="Name"
          value={performer.name}
          onChange={(e) => onUpdate({ name: e.target.value, personId: null })}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && results.length > 0 && (
          <div className={shared.suggestions}>
            {results.map((r) => (
              <div key={r.id} className={shared.suggestion} onMouseDown={() => onUpdate({ personId: r.id, name: r.name })}>
                {r.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <select
        className={shared.input}
        value={performer.role}
        onChange={(e) => onUpdate({ role: e.target.value as PerformerRole })}
      >
        <option value="conductor">Conductor</option>
        <option value="soloist">Soloist</option>
        <option value="performer">Performer</option>
      </select>
      <input
        className={shared.input}
        placeholder="Instrument (if soloist)"
        value={performer.instrument}
        onChange={(e) => onUpdate({ instrument: e.target.value })}
      />
      <button className={shared.repeatRowRemove} onClick={onRemove} aria-label="Remove">
        ✕
      </button>
    </div>
  )
}
