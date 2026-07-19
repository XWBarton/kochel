import { useEffect, useState } from 'react'
import { searchComposers } from '../../api/importClient'
import type { ComposerSearchResult } from '../../api/importTypes'
import { useDebouncedValue } from './useDebouncedValue'
import { newManualComposer } from './reviewTypes'
import type { ReviewComposer } from './reviewTypes'
import shared from './ImportShared.module.css'

interface ComposerPickerProps {
  value: ReviewComposer | null
  onChange: (composer: ReviewComposer | null) => void
  initialQuery: string
}

export function ComposerPicker({ value, onChange, initialQuery }: ComposerPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<ComposerSearchResult[]>([])
  const debouncedQuery = useDebouncedValue(query, 250)

  useEffect(() => {
    if (value || debouncedQuery.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    searchComposers(debouncedQuery.trim()).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, value])

  if (value) {
    const tag = value.id ? 'existing in library' : value.openopusId ? 'new — from Open Opus' : 'new — manual'
    return (
      <div>
        <div className={shared.picked}>
          <span>
            {value.name} <span className={shared.suggestionTag}>{tag}</span>
          </span>
          <button className={shared.buttonSmall} onClick={() => onChange(null)}>
            Change
          </button>
        </div>
        {!value.id && (
          <div className={shared.fieldRow}>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Name</span>
              <input
                className={shared.input}
                value={value.name}
                onChange={(e) => onChange({ ...value, name: e.target.value })}
              />
            </label>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Sort name</span>
              <input
                className={shared.input}
                placeholder="Last, First"
                value={value.sortName}
                onChange={(e) => onChange({ ...value, sortName: e.target.value })}
              />
            </label>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Birth year</span>
              <input
                className={shared.input}
                type="number"
                value={value.birthYear ?? ''}
                onChange={(e) => onChange({ ...value, birthYear: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Death year</span>
              <input
                className={shared.input}
                type="number"
                value={value.deathYear ?? ''}
                onChange={(e) => onChange({ ...value, deathYear: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className={shared.field}>
              <span className={shared.fieldLabel}>Period</span>
              <input
                className={shared.input}
                placeholder="baroque, romantic…"
                value={value.period ?? ''}
                onChange={(e) => onChange({ ...value, period: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className={shared.searchBox}>
        <input
          className={shared.input}
          placeholder="Search composers (library + Open Opus)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && results.length > 0 && (
          <div className={shared.suggestions}>
            {results.map((r, i) => (
              <div
                key={`${r.source}-${r.id ?? r.openopus_id ?? i}`}
                className={shared.suggestion}
                onMouseDown={() =>
                  onChange({
                    id: r.source === 'library' ? r.id : null,
                    openopusId: r.source === 'openopus' ? r.openopus_id : null,
                    name: r.name,
                    sortName: r.sort_name ?? '',
                    birthYear: r.birth_year,
                    deathYear: r.death_year,
                    period: r.period,
                  })
                }
              >
                {r.name}
                <span className={shared.suggestionTag}>
                  {r.source}
                  {r.period ? ` · ${r.period}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        <button className={shared.buttonSmall} onClick={() => onChange(newManualComposer(query))}>
          Enter composer manually
        </button>
      </div>
    </div>
  )
}
