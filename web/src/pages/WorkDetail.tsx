import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork, getWorkRecordings } from '../api/client'
import type { RecordingListItem, WorkDetail as WorkDetailType } from '../api/types'
import { formatDuration, toRoman } from '../lib/format'
import { findMovementTiming } from '../playback/movementTiming'
import { usePlayback } from '../playback/PlaybackContext'
import styles from './WorkDetail.module.css'

function recordingCredit(recording: RecordingListItem): string {
  const parts: string[] = []
  if (recording.ensemble) parts.push(recording.ensemble.name)
  const conductor = recording.performers.find((p) => p.role === 'conductor')
  if (conductor) parts.push(conductor.person.name)
  return parts.join(' · ') || 'Unattributed performance'
}

export function WorkDetail() {
  const { workId } = useParams()
  const id = Number(workId)
  const [work, setWork] = useState<WorkDetailType | null>(null)
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null)
  const { playRecording } = usePlayback()

  useEffect(() => {
    setWork(null)
    setRecordings(null)
    getWork(id).then(setWork)
    getWorkRecordings(id).then((res) => setRecordings(res.items))
  }, [id])

  if (work === null || recordings === null) return null

  const referenceRecording = recordings.find((r) => r.is_default_in_library) ?? recordings[0] ?? null
  const movements = [...work.movements].sort((a, b) => a.movement_number - b.movement_number)
  const metaParts = [
    work.category,
    `${work.movement_count} ${work.movement_count === 1 ? 'movement' : 'movements'}`,
    work.composed_year ? `Composed ${work.composed_year}${work.composed_year_uncertain ? '?' : ''}` : null,
  ].filter(Boolean)

  return (
    <div className={styles.wrap}>
      <Link className={styles.breadcrumb} to={`/composers/${work.composer_id}`}>
        {work.composer_name}
      </Link>
      <div className={styles.title}>{work.title}</div>
      <div className={styles.meta}>{metaParts.join(' · ')}</div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionLabel}>
          {recordings.length} {recordings.length === 1 ? 'Recording' : 'Recordings'} in Library
        </div>
        {recordings.length > 1 && (
          <Link className={styles.compareLink} to={`/works/${work.id}/compare`}>
            Compare Recordings →
          </Link>
        )}
      </div>

      {recordings.map((recording) => (
        <div className={styles.recordingRow} key={recording.id}>
          <button
            className="play-triangle"
            aria-label={`Play ${recordingCredit(recording)}`}
            onClick={() => playRecording(work, recording)}
          />
          <div className={styles.recordingInfo}>
            <div className={styles.recordingTitle}>{recordingCredit(recording)}</div>
            <div className={styles.recordingMeta}>
              {[recording.label, recording.recording_year].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div className={`${styles.recordingDuration} tabular`}>
            {formatDuration(recording.total_duration_seconds)}
          </div>
        </div>
      ))}

      <div className={styles.movementsSection}>
        <div className={styles.sectionLabel}>Movements</div>
        {movements.map((movement) => {
          const timing = referenceRecording ? findMovementTiming(referenceRecording, movement.id) : null
          return (
            <div className={styles.movementRow} key={movement.id}>
              <div className={styles.roman}>{toRoman(movement.movement_number)}</div>
              <div className={styles.tempo}>{movement.name ?? '—'}</div>
              <div className={`${styles.duration} tabular`}>
                {timing ? formatDuration(timing.duration) : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
