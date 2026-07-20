import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getComposers } from '../api/client'
import type { ComposerListItem } from '../api/types'
import { ComposerAvatar } from '../components/ComposerAvatar'
import { firstLetter, formatComposerDates } from '../lib/format'
import styles from './ComposerBrowse.module.css'

interface Group {
  letter: string
  composers: ComposerListItem[]
}

function groupByLetter(composers: ComposerListItem[]): Group[] {
  const groups: Group[] = []
  for (const composer of composers) {
    const letter = firstLetter(composer.sort_name)
    const last = groups[groups.length - 1]
    if (last && last.letter === letter) {
      last.composers.push(composer)
    } else {
      groups.push({ letter, composers: [composer] })
    }
  }
  return groups
}

export function ComposerBrowse() {
  const [composers, setComposers] = useState<ComposerListItem[] | null>(null)

  useEffect(() => {
    getComposers().then((res) => setComposers(res.items))
  }, [])

  if (composers === null) return null

  if (composers.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className="double-rule" />
        <div className={styles.empty}>No composers in the library yet.</div>
      </div>
    )
  }

  const groups = groupByLetter(composers)

  return (
    <div className={styles.wrap}>
      <div className="double-rule" />
      <div className={styles.list}>
        {groups.map((group) => (
          <div className={styles.group} key={group.letter}>
            <div className={styles.letter}>{group.letter}</div>
            <div className={styles.rows}>
              {group.composers.map((c) => (
                <Link className={styles.row} to={`/composers/${c.id}`} key={c.id}>
                  <div className={styles.rowMain}>
                    <ComposerAvatar name={c.name} sortName={c.sort_name} imageUrl={c.image_url} size="small" />
                    <div>
                      <span className={styles.name}>{c.name}</span>
                      <span className={styles.dates}>{formatComposerDates(c.birth_year, c.death_year)}</span>
                    </div>
                  </div>
                  <div className={styles.workCount}>
                    {c.work_count} {c.work_count === 1 ? 'work' : 'works'}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
