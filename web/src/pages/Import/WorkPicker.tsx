import { useEffect, useRef, useState } from 'react'
import { getWork } from '../../api/client'
import { searchOpenOpusWorks, searchWorks } from '../../api/importClient'
import type { ScanFileOut, WorkSearchResult } from '../../api/importTypes'
import { useDebouncedValue } from './useDebouncedValue'
import { guessMovementNames, newManualWork } from './reviewTypes'
import type { ReviewComposer, ReviewWork } from './reviewTypes'
import shared from './ImportShared.module.css'

interface WorkPickerProps {
  composer: ReviewComposer
  value: ReviewWork | null
  onChange: (work: ReviewWork | null) => void
  initialQuery: string
  files: ScanFileOut[]
}

export function WorkPicker({ composer, value, onChange, initialQuery, files }: WorkPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<WorkSearchResult[]>([])
  const debouncedQuery = useDebouncedValue(query, 250)
  const valueRef = useRef(value)
  valueRef.current = value

  async function searchForComposer(q: string | undefined): Promise<WorkSearchResult[]> {
    if (composer.id != null) return searchWorks(composer.id, q)
    if (composer.openopusId) return searchOpenOpusWorks(composer.openopusId, q)
    return []
  }

  useEffect(() => {
    if (value) {
      setResults([])
      return
    }
    let cancelled = false
    searchForComposer(debouncedQuery.trim() || undefined).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer, debouncedQuery, value])

  async function pickExisting(id: number) {
    const detail = await getWork(id)
    onChange({
      id: detail.id,
      title: detail.title,
      subtitle: detail.subtitle ?? '',
      key: detail.key ?? '',
      form: detail.form ?? '',
      category: detail.category ?? '',
      composedYear: detail.composed_year,
      catalogueNumbers: [],
      movements: detail.movements
        .slice()
        .sort((a, b) => a.movement_number - b.movement_number)
        .map((m) => ({ movementNumber: m.movement_number, name: m.name, existingId: m.id })),
    })
  }

  // Auto-resolve from the tag-derived album-title guess as soon as a
  // composer is settled, instead of leaving an unselected search box.
  useEffect(() => {
    const guess = initialQuery.trim()
    if (valueRef.current || !guess) return
    let cancelled = false
    searchForComposer(guess).then((r) => {
      if (cancelled || valueRef.current) return
      const exact = r.find((x) => x.title.trim().toLowerCase() === guess.toLowerCase())
      if (exact && exact.source === 'library' && exact.id != null) {
        pickExisting(exact.id)
      } else if (exact) {
        onChange({ ...newManualWork(exact.title, guessMovementNames(files)), category: exact.category ?? '' })
      } else {
        onChange(newManualWork(guess, guessMovementNames(files)))
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, composer])

  if (value) {
    return (
      <div>
        <div className={shared.picked}>
          <span>
            {value.title} <span className={shared.suggestionTag}>{value.id ? 'existing in library' : 'new'}</span>
          </span>
          <button className={shared.buttonSmall} onClick={() => onChange(null)}>
            Change
          </button>
        </div>

        {value.id ? (
          <div style={{ fontSize: 13, opacity: 0.6, fontStyle: 'italic' }}>
            Movements: {value.movements.map((m) => `${m.movementNumber}. ${m.name ?? '(untitled)'}`).join(' — ')}
          </div>
        ) : (
          <>
            <div className={shared.fieldRow}>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Title</span>
                <input
                  className={shared.input}
                  value={value.title}
                  onChange={(e) => onChange({ ...value, title: e.target.value })}
                />
              </label>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Subtitle</span>
                <input
                  className={shared.input}
                  value={value.subtitle}
                  onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
                />
              </label>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Key</span>
                <input
                  className={shared.input}
                  placeholder="G minor"
                  value={value.key}
                  onChange={(e) => onChange({ ...value, key: e.target.value })}
                />
              </label>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Form</span>
                <input
                  className={shared.input}
                  placeholder="symphony, concerto…"
                  value={value.form}
                  onChange={(e) => onChange({ ...value, form: e.target.value })}
                />
              </label>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Category</span>
                <input
                  className={shared.input}
                  placeholder="Orchestral, Chamber…"
                  value={value.category}
                  onChange={(e) => onChange({ ...value, category: e.target.value })}
                />
              </label>
              <label className={shared.field}>
                <span className={shared.fieldLabel}>Composed year</span>
                <input
                  className={shared.input}
                  type="number"
                  value={value.composedYear ?? ''}
                  onChange={(e) =>
                    onChange({ ...value, composedYear: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </label>
            </div>

            <CatalogueNumbersEditor value={value} onChange={onChange} />
            <MovementsEditor value={value} onChange={onChange} />
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className={shared.searchBox}>
        <input
          className={shared.input}
          placeholder="Search works for this composer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && results.length > 0 && (
          <div className={shared.suggestions}>
            {results.map((r, i) => (
              <div
                key={`${r.source}-${r.id ?? i}`}
                className={shared.suggestion}
                onMouseDown={() => {
                  if (r.source === 'library' && r.id != null) {
                    pickExisting(r.id)
                  } else {
                    const work = newManualWork(r.title, guessMovementNames(files))
                    onChange({ ...work, category: r.category ?? '' })
                  }
                }}
              >
                {r.title}
                <span className={shared.suggestionTag}>
                  {r.source}
                  {r.category ? ` · ${r.category}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className={shared.buttonSmall} onClick={() => onChange(newManualWork(query, guessMovementNames(files)))}>
          Enter work manually
        </button>
      </div>
    </div>
  )
}

function CatalogueNumbersEditor({ value, onChange }: { value: ReviewWork; onChange: (w: ReviewWork) => void }) {
  function update(i: number, patch: Partial<ReviewWork['catalogueNumbers'][number]>) {
    const next = value.catalogueNumbers.map((cn, idx) => (idx === i ? { ...cn, ...patch } : cn))
    onChange({ ...value, catalogueNumbers: next })
  }
  function remove(i: number) {
    onChange({ ...value, catalogueNumbers: value.catalogueNumbers.filter((_, idx) => idx !== i) })
  }
  function add() {
    onChange({
      ...value,
      catalogueNumbers: [...value.catalogueNumbers, { system: '', number: '', isPrimary: value.catalogueNumbers.length === 0 }],
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <span className={shared.fieldLabel}>Catalogue numbers</span>
      {value.catalogueNumbers.map((cn, i) => (
        <div className={shared.repeatRow} key={i}>
          <input
            className={shared.input}
            placeholder="System (BWV, K, Op…)"
            value={cn.system}
            onChange={(e) => update(i, { system: e.target.value })}
          />
          <input
            className={shared.input}
            placeholder="Number"
            value={cn.number}
            onChange={(e) => update(i, { number: e.target.value })}
          />
          <label className={shared.checkboxRow} style={{ flex: 'none' }}>
            <input type="checkbox" checked={cn.isPrimary} onChange={(e) => update(i, { isPrimary: e.target.checked })} />
            primary
          </label>
          <button className={shared.repeatRowRemove} onClick={() => remove(i)} aria-label="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className={shared.buttonSmall} onClick={add}>
        + Add catalogue number
      </button>
    </div>
  )
}

function MovementsEditor({ value, onChange }: { value: ReviewWork; onChange: (w: ReviewWork) => void }) {
  function update(i: number, name: string) {
    const next = value.movements.map((m, idx) => (idx === i ? { ...m, name: name || null } : m))
    onChange({ ...value, movements: next })
  }
  function remove(i: number) {
    const next = value.movements.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, movementNumber: idx + 1 }))
    onChange({ ...value, movements: next })
  }
  function add() {
    onChange({
      ...value,
      movements: [...value.movements, { movementNumber: value.movements.length + 1, name: null }],
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <span className={shared.fieldLabel}>Movements</span>
      {value.movements.map((m, i) => (
        <div className={shared.repeatRow} key={i}>
          <span style={{ flex: 'none', width: 24 }}>{m.movementNumber}.</span>
          <input
            className={shared.input}
            placeholder="Tempo marking / title (optional)"
            value={m.name ?? ''}
            onChange={(e) => update(i, e.target.value)}
          />
          <button className={shared.repeatRowRemove} onClick={() => remove(i)} aria-label="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className={shared.buttonSmall} onClick={add}>
        + Add movement
      </button>
    </div>
  )
}
