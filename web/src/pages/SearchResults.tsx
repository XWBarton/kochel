import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { search } from '../api/client'
import type { SearchResponse } from '../api/types'
import { formatComposerDates } from '../lib/format'
import styles from './SearchResults.module.css'

export function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQuery)
  const [results, setResults] = useState<SearchResponse | null>(null)

  useEffect(() => {
    setInputValue(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const query = inputValue.trim()
    if (!query) {
      setResults(null)
      return
    }
    const timeout = setTimeout(() => {
      search(query).then(setResults)
      setSearchParams({ q: query }, { replace: true })
    }, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line
  }, [inputValue])

  const hasResults =
    results && (results.composers.length || results.works.length || results.recordings.length)

  return (
    <div className={styles.wrap}>
      <input
        className={styles.queryInput}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search composers, works, recordings…"
        autoFocus
      />

      {results && !hasResults && <div className={styles.empty}>No results for "{results.query}".</div>}

      {results && results.composers.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Composers</div>
          {results.composers.map((c) => (
            <Link className={styles.row} to={`/composers/${c.id}`} key={c.id}>
              <div>
                <span className={styles.composerName}>{c.name}</span>
                <span className={styles.dates}>{formatComposerDates(c.birth_year, c.death_year)}</span>
              </div>
              <div className={styles.secondary}>
                {c.work_count} {c.work_count === 1 ? 'work' : 'works'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {results && results.works.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Works</div>
          {results.works.map((w) => (
            <Link className={styles.row} to={`/works/${w.id}`} key={w.id}>
              <div className={styles.title}>{w.title}</div>
              <div className={styles.secondary}>{w.composer_name}</div>
            </Link>
          ))}
        </div>
      )}

      {results && results.recordings.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Recordings</div>
          {results.recordings.map((r) => (
            <Link className={styles.row} to={`/works/${r.work_id}`} key={r.id}>
              <div className={styles.title}>
                {[r.ensemble_name, r.conductor_name].filter(Boolean).join(' · ') || 'Unattributed performance'}
              </div>
              <div className={styles.secondary}>
                {[r.work_title, [r.label, r.recording_year].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
