import { useEffect, useRef, useState } from 'react'
import { getComposerWorks, getWork } from '../../api/client'
import { searchOpenOpusWorks, searchWorks } from '../../api/importClient'
import type { ScanFileOut, WorkSearchResult } from '../../api/importTypes'
import { useDebouncedValue } from './useDebouncedValue'
import { guessCatalogueNumbers, guessMovementNames, newManualWork, titlesLikelyMatch } from './reviewTypes'
import type { ReviewComposer, ReviewWork } from './reviewTypes'
import { WorkDetailsDisclosure, WorkTitleField } from './WorkFieldsForm'
import shared from './ImportShared.module.css'

interface WorkPickerProps {
  composer: ReviewComposer
  value: ReviewWork | null
  onChange: (work: ReviewWork | null) => void
  initialQuery: string
  files: ScanFileOut[]
}

interface ComposerDefaults {
  category: string
  catalogueSystem: string
}

export function WorkPicker({ composer, value, onChange, initialQuery, files }: WorkPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [focused, setFocused] = useState(false)
  const [results, setResults] = useState<WorkSearchResult[]>([])
  const debouncedQuery = useDebouncedValue(query, 250)
  const valueRef = useRef(value)
  valueRef.current = value

  // For a composer already in the library, their existing catalogued works
  // establish conventions worth reusing on a new one — almost always a
  // single catalogue system regardless of genre (Bach → BWV, Mozart → K…),
  // and sometimes a single category too, when every work so far agrees.
  // Fetched fresh (rather than cached in state) at each place a brand-new
  // work gets constructed, so it's never raced by an effect firing before
  // a background fetch has resolved.
  async function fetchComposerDefaults(): Promise<ComposerDefaults | null> {
    if (composer.id == null) return null
    const res = await getComposerWorks(composer.id)
    const categories = new Set(res.items.map((w) => w.category).filter((c): c is string => !!c))
    const systems = new Set(
      res.items.flatMap((w) => w.catalogue_numbers.filter((cn) => cn.is_primary).map((cn) => cn.system)).filter(Boolean),
    )
    return {
      category: categories.size === 1 ? [...categories][0] : '',
      catalogueSystem: systems.size === 1 ? [...systems][0] : '',
    }
  }

  // Backfills category/catalogue-system from the composer's established
  // conventions wherever the tag-derived guess left them blank — never
  // overrides a real guess, only fills gaps.
  function withComposerDefaults(work: ReviewWork, defaults: ComposerDefaults | null): ReviewWork {
    if (!defaults) return work
    const category = work.category || defaults.category
    let catalogueNumbers = work.catalogueNumbers
    if (defaults.catalogueSystem) {
      catalogueNumbers =
        catalogueNumbers.length === 0
          ? [{ system: defaults.catalogueSystem, number: '', isPrimary: true }]
          : catalogueNumbers.map((cn) => (cn.system ? cn : { ...cn, system: defaults.catalogueSystem }))
    }
    return { ...work, category, catalogueNumbers }
  }

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
    Promise.all([searchForComposer(guess), fetchComposerDefaults()]).then(([r, defaults]) => {
      if (cancelled || valueRef.current) return
      const exact = r.find((x) => titlesLikelyMatch(guess, x.title))
      if (exact && exact.source === 'library' && exact.id != null) {
        pickExisting(exact.id)
      } else if (exact) {
        onChange(
          withComposerDefaults(
            {
              ...newManualWork(exact.title, guessMovementNames(files)),
              category: exact.category ?? '',
              catalogueNumbers: guessCatalogueNumbers(files),
            },
            defaults,
          ),
        )
      } else {
        onChange(
          withComposerDefaults(
            {
              ...newManualWork(guess, guessMovementNames(files)),
              catalogueNumbers: guessCatalogueNumbers(files),
            },
            defaults,
          ),
        )
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
            <WorkTitleField value={value} onChange={onChange} />
            <MovementsEditor value={value} onChange={onChange} />
            <WorkDetailsDisclosure value={value} onChange={onChange} />
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
                onMouseDown={async () => {
                  if (r.source === 'library' && r.id != null) {
                    pickExisting(r.id)
                  } else {
                    const work = newManualWork(r.title, guessMovementNames(files))
                    const defaults = await fetchComposerDefaults()
                    onChange(
                      withComposerDefaults(
                        { ...work, category: r.category ?? '', catalogueNumbers: guessCatalogueNumbers(files) },
                        defaults,
                      ),
                    )
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
        <button
          className={shared.buttonSmall}
          onClick={async () => {
            const defaults = await fetchComposerDefaults()
            onChange(
              withComposerDefaults(
                { ...newManualWork(query, guessMovementNames(files)), catalogueNumbers: guessCatalogueNumbers(files) },
                defaults,
              ),
            )
          }}
        >
          Enter work manually
        </button>
      </div>
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
