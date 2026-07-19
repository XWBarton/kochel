import { useEffect, useRef, useState } from 'react'
import { searchComposers } from '../../api/importClient'
import type { ComposerSearchResult } from '../../api/importTypes'
import { ComposerDetailsDisclosure, ComposerNameField } from './ComposerFieldsForm'
import { useDebouncedValue } from './useDebouncedValue'
import { newManualComposer } from './reviewTypes'
import type { ReviewComposer } from './reviewTypes'
import shared from './ImportShared.module.css'

function fromSearchResult(r: ComposerSearchResult): ReviewComposer {
  return {
    id: r.source === 'library' ? r.id : null,
    openopusId: r.source === 'openopus' ? r.openopus_id : null,
    name: r.name,
    sortName: r.sort_name ?? '',
    birthYear: r.birth_year,
    deathYear: r.death_year,
    period: r.period,
  }
}

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
  const valueRef = useRef(value)
  valueRef.current = value

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

  // Auto-resolve from the tag-derived guess as soon as a group is opened,
  // instead of leaving a filled-looking search box that silently isn't
  // actually selected until the user clicks something.
  useEffect(() => {
    const guess = initialQuery.trim()
    if (valueRef.current || !guess) return
    let cancelled = false
    searchComposers(guess).then((r) => {
      if (cancelled || valueRef.current) return
      const exact = r.find((x) => x.name.trim().toLowerCase() === guess.toLowerCase())
      onChange(exact ? fromSearchResult(exact) : newManualComposer(guess))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

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
          <>
            <ComposerNameField value={value} onChange={onChange} />
            <ComposerDetailsDisclosure value={value} onChange={onChange} />
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
                onMouseDown={() => onChange(fromSearchResult(r))}
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
