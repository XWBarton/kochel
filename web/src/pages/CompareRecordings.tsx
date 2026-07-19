import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork, getWorkRecordings } from '../api/client'
import type { RecordingListItem, WorkDetail } from '../api/types'
import { formatDuration, toRoman } from '../lib/format'
import { findMovementTiming } from '../playback/movementTiming'
import styles from './CompareRecordings.module.css'

function recordingEnsemble(recording: RecordingListItem): string {
  return recording.ensemble?.name ?? 'Unattributed ensemble'
}

function recordingConductor(recording: RecordingListItem): string | null {
  return recording.performers.find((p) => p.role === 'conductor')?.person.name ?? null
}

export function CompareRecordings() {
  const { workId } = useParams()
  const id = Number(workId)
  const [work, setWork] = useState<WorkDetail | null>(null)
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null)

  useEffect(() => {
    setWork(null)
    setRecordings(null)
    getWork(id).then(setWork)
    getWorkRecordings(id).then((res) => setRecordings(res.items))
  }, [id])

  if (work === null || recordings === null) return null

  const movements = [...work.movements].sort((a, b) => a.movement_number - b.movement_number)

  return (
    <div className={styles.wrap}>
      <Link className={styles.breadcrumb} to={`/composers/${work.composer_id}`}>
        {work.composer_name}
      </Link>
      <div className={styles.heading}>
        Comparing {recordings.length} {recordings.length === 1 ? 'recording' : 'recordings'} of {work.title}
      </div>

      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `220px repeat(${recordings.length}, 1fr)` }}
      >
        <div className={styles.headerCell} />
        {recordings.map((recording) => (
          <div className={styles.headerCell} key={recording.id}>
            <div className={styles.recEnsemble}>{recordingEnsemble(recording)}</div>
            {recordingConductor(recording) && (
              <div className={styles.recConductor}>{recordingConductor(recording)}</div>
            )}
            <div className={styles.recLabel}>
              {[recording.label, recording.recording_year].filter(Boolean).join(' · ')}
            </div>
            {recording.is_default_in_library && <div className={styles.defaultTag}>Default in Library</div>}
          </div>
        ))}

        {movements.map((movement) => (
          <Fragment key={movement.id}>
            <div className={styles.movementCell}>
              <span className={styles.roman}>{toRoman(movement.movement_number)}</span>
              {movement.name ?? '—'}
            </div>
            {recordings.map((recording) => {
              const timing = findMovementTiming(recording, movement.id)
              return (
                <div className={`${styles.durationCell} tabular`} key={`${movement.id}-${recording.id}`}>
                  {timing ? formatDuration(timing.duration) : '—'}
                </div>
              )
            })}
          </Fragment>
        ))}

        <div className={styles.totalLabel}>Total</div>
        {recordings.map((recording) => (
          <div className={`${styles.totalDuration} tabular`} key={`total-${recording.id}`}>
            {formatDuration(recording.total_duration_seconds)}
          </div>
        ))}
      </div>
    </div>
  )
}
