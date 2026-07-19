import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Header.module.css'

export function Header() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.wordmark}>
        Köchel
      </Link>
      <form className={styles.searchForm} onSubmit={onSubmit}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search composers, works, recordings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      <nav className={styles.nav}>
        <Link className={styles.navLink} to="/import">
          Import
        </Link>
        <Link className={styles.navLink} to="/settings">
          Settings
        </Link>
      </nav>
    </header>
  )
}
