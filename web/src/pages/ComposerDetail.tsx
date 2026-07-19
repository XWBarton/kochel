import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getComposer, getComposerWorks, getWork, getWorkRecordings } from '../api/client'
import type { ComposerListItem, WorkListItem } from '../api/types'
import { formatComposerDates } from '../lib/format'
import { usePlayback } from '../playback/PlaybackContext'
import styles from './ComposerDetail.module.css'

interface CategoryGroup {
  category: string
  works: WorkListItem[]
}

function groupByCategory(works: WorkListItem[]): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  for (const work of works) {
    const category = work.category ?? 'Other'
    const last = groups[groups.length - 1]
    if (last && last.category === category) {
      last.works.push(work)
    } else {
      groups.push({ category, works: [work] })
    }
  }
  return groups
}

export function ComposerDetail() {
  const { composerId } = useParams()
  const id = Number(composerId)
  const [composer, setComposer] = useState<ComposerListItem | null>(null)
  const [works, setWorks] = useState<WorkListItem[] | null>(null)
  const { playRecording } = usePlayback()

  useEffect(() => {
    setComposer(null)
    setWorks(null)
    getComposer(id).then(setComposer)
    getComposerWorks(id).then((res) => setWorks(res.items))
  }, [id])

  async function handlePlayWork(workId: number) {
    const [work, recordings] = await Promise.all([getWork(workId), getWorkRecordings(workId)])
    const recording = recordings.items.find((r) => r.is_default_in_library) ?? recordings.items[0]
    if (recording) playRecording(work, recording)
  }

  if (composer === null || works === null) return null

  const groups = groupByCategory(works)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.name}>{composer.name}</div>
          <div className={styles.meta}>
            {[formatComposerDates(composer.birth_year, composer.death_year), composer.period]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>
        <div className={styles.catalogued}>
          {works.length} {works.length === 1 ? 'work' : 'works'} catalogued
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.category}>
          <div className={styles.categoryLabel}>{group.category}</div>
          {group.works.map((work) => (
            <div className={styles.workRow} key={work.id}>
              <button
                className="play-triangle"
                aria-label={`Play ${work.title}`}
                onClick={() => handlePlayWork(work.id)}
              />
              <Link className={styles.workTitle} to={`/works/${work.id}`}>
                {work.title}
              </Link>
              <div className={styles.recordingCount}>
                {work.recording_count} {work.recording_count === 1 ? 'recording' : 'recordings'}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
