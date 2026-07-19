import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteWork, getWork, getWorkRecordings } from '../api/client'
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
  const navigate = useNavigate()
  const [work, setWork] = useState<WorkDetailType | null>(null)
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedMovementId, setExpandedMovementId] = useState<number | null>(null)
  const { playRecording } = usePlayback()

  useEffect(() => {
    setWork(null)
    setRecordings(null)
    getWork(id).then(setWork)
    getWorkRecordings(id).then((res) => setRecordings(res.items))
  }, [id])

  if (work === null || recordings === null) return null

  async function handleDelete() {
    if (!work) return
    const confirmed = window.confirm(
      `Delete "${work.title}"? This removes it and all ${recordings?.length ?? 0} recording(s) from your library permanently. Audio files on disk are not touched.`,
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await deleteWork(work.id)
      navigate(`/composers/${work.composer_id}`)
    } catch {
      setDeleting(false)
      window.alert('Delete failed — please try again.')
    }
  }

  const referenceRecording = recordings.find((r) => r.is_default_in_library) ?? recordings[0] ?? null
  const movements = [...work.movements].sort((a, b) => a.movement_number - b.movement_number)
  const metaParts = [
    work.category,
    `${work.movement_count} ${work.movement_count === 1 ? 'movement' : 'movements'}`,
    work.composed_year ? `Composed ${work.composed_year}${work.composed_year_uncertain ? '?' : ''}` : null,
  ].filter(Boolean)

  function recordingsWithMovement(movementId: number): RecordingListItem[] {
    return recordings!.filter((r) => findMovementTiming(r, movementId) !== null)
  }

  function playDefaultFromMovement(movementId: number) {
    const eligible = recordingsWithMovement(movementId)
    const target = eligible.find((r) => r.is_default_in_library) ?? eligible[0]
    if (target) playRecording(work!, target, movementId)
  }

  function handleMovementTitleClick(movementId: number) {
    const eligible = recordingsWithMovement(movementId)
    if (eligible.length <= 1) {
      playDefaultFromMovement(movementId)
      return
    }
    setExpandedMovementId((prev) => (prev === movementId ? null : movementId))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <Link className={styles.breadcrumb} to={`/composers/${work.composer_id}`}>
          {work.composer_name}
        </Link>
        <button className={styles.deleteLink} onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete work'}
        </button>
      </div>
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
          const eligible = recordingsWithMovement(movement.id)
          const expanded = expandedMovementId === movement.id
          return (
            <div key={movement.id}>
              <div className={styles.movementRow}>
                <button
                  className={styles.roman}
                  onClick={() => playDefaultFromMovement(movement.id)}
                  disabled={eligible.length === 0}
                  aria-label={`Play movement ${movement.movement_number}`}
                >
                  {toRoman(movement.movement_number)}
                </button>
                <button
                  className={styles.tempo}
                  onClick={() => handleMovementTitleClick(movement.id)}
                  disabled={eligible.length === 0}
                >
                  {movement.name ?? '—'}
                  {eligible.length > 1 && <span className={styles.expandHint}>{expanded ? ' ▴' : ' ▾'}</span>}
                </button>
                <div className={`${styles.duration} tabular`}>
                  {timing ? formatDuration(timing.duration) : '—'}
                </div>
              </div>
              {expanded && (
                <div className={styles.movementRecordings}>
                  {eligible.map((recording) => (
                    <button
                      key={recording.id}
                      className={styles.movementRecordingRow}
                      onClick={() => {
                        playRecording(work, recording, movement.id)
                        setExpandedMovementId(null)
                      }}
                    >
                      {recordingCredit(recording)}
                      {recording.is_default_in_library && <span className={styles.defaultTag}>default</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
