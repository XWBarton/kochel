import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteWork, getWork, getWorkRecordings, updateRecording, updateWork } from '../api/client'
import type { RecordingListItem, WorkDetail as WorkDetailType } from '../api/types'
import { formatDuration, toRoman } from '../lib/format'
import { RecordingForm } from './Import/RecordingForm'
import type { ReviewRecording, ReviewWork } from './Import/reviewTypes'
import { WorkDetailsDisclosure, WorkTitleField } from './Import/WorkFieldsForm'
import { findMovementTiming } from '../playback/movementTiming'
import { usePlayback } from '../playback/PlaybackContext'
import styles from './WorkDetail.module.css'
import shared from './Import/ImportShared.module.css'

function recordingCredit(recording: RecordingListItem): string {
  const parts: string[] = []
  if (recording.ensemble) parts.push(recording.ensemble.name)
  const conductor = recording.performers.find((p) => p.role === 'conductor')
  if (conductor) parts.push(conductor.person.name)
  return parts.join(' · ') || 'Unattributed performance'
}

function recordingToReviewRecording(r: RecordingListItem): ReviewRecording {
  return {
    ensembleId: r.ensemble?.id ?? null,
    ensembleName: r.ensemble?.name ?? '',
    performers: r.performers.map((p) => ({
      personId: p.person.id,
      name: p.person.name,
      role: p.role,
      instrument: p.instrument ?? '',
    })),
    label: r.label ?? '',
    recordingYear: r.recording_year,
    releaseYear: r.release_year,
    notes: r.notes ?? '',
    isDefaultInLibrary: r.is_default_in_library,
  }
}

function workToReviewWork(w: WorkDetailType): ReviewWork {
  return {
    id: w.id,
    title: w.title,
    subtitle: w.subtitle ?? '',
    key: w.key ?? '',
    form: w.form ?? '',
    category: w.category ?? '',
    composedYear: w.composed_year,
    catalogueNumbers: w.catalogue_numbers.map((cn) => ({
      system: cn.system,
      number: cn.number,
      isPrimary: cn.is_primary,
    })),
    movements: w.movements.map((m) => ({ movementNumber: m.movement_number, name: m.name, existingId: m.id })),
  }
}

export function WorkDetail() {
  const { workId } = useParams()
  const id = Number(workId)
  const navigate = useNavigate()
  const [work, setWork] = useState<WorkDetailType | null>(null)
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expandedMovementId, setExpandedMovementId] = useState<number | null>(null)
  const [editingRecordingId, setEditingRecordingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState<ReviewRecording | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editingWork, setEditingWork] = useState(false)
  const [workEditValue, setWorkEditValue] = useState<ReviewWork | null>(null)
  const [savingWorkEdit, setSavingWorkEdit] = useState(false)
  const [workEditError, setWorkEditError] = useState<string | null>(null)
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

  function startEditingWork() {
    setWorkEditValue(workToReviewWork(work!))
    setEditingWork(true)
    setWorkEditError(null)
  }

  async function handleSaveWorkEdit() {
    if (!workEditValue) return
    setSavingWorkEdit(true)
    setWorkEditError(null)
    try {
      const updated = await updateWork(workEditValue.id!, {
        title: workEditValue.title,
        subtitle: workEditValue.subtitle || null,
        key: workEditValue.key || null,
        form: workEditValue.form || null,
        category: workEditValue.category || null,
        composed_year: workEditValue.composedYear,
        composed_year_uncertain: work!.composed_year_uncertain,
        composed_year_range_end: work!.composed_year_range_end,
        catalogue_numbers: workEditValue.catalogueNumbers.map((cn) => ({
          system: cn.system,
          number: cn.number,
          is_primary: cn.isPrimary,
        })),
      })
      setWork(updated)
      setEditingWork(false)
      setWorkEditValue(null)
    } catch (e) {
      setWorkEditError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingWorkEdit(false)
    }
  }

  function startEditing(recording: RecordingListItem) {
    setEditingRecordingId(recording.id)
    setEditValue(recordingToReviewRecording(recording))
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (editingRecordingId == null || !editValue) return
    setSavingEdit(true)
    setEditError(null)
    try {
      await updateRecording(editingRecordingId, {
        ensemble_id: editValue.ensembleId,
        ensemble_name: editValue.ensembleId ? null : editValue.ensembleName || null,
        label: editValue.label || null,
        recording_year: editValue.recordingYear,
        release_year: editValue.releaseYear,
        notes: editValue.notes || null,
        is_default_in_library: editValue.isDefaultInLibrary,
        performers: editValue.performers.map((p) => ({
          person_id: p.personId,
          name: p.personId ? null : p.name,
          sort_name: null,
          role: p.role,
          instrument: p.instrument || null,
          credited_order: null,
        })),
      })
      const fresh = await getWorkRecordings(id)
      setRecordings(fresh.items)
      setEditingRecordingId(null)
      setEditValue(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSavingEdit(false)
    }
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
      <div className={styles.titleRow}>
        <div className={styles.title}>{work.title}</div>
        <button
          className={styles.editRecordingLink}
          onClick={() => (editingWork ? setEditingWork(false) : startEditingWork())}
        >
          {editingWork ? 'Close' : 'Edit'}
        </button>
      </div>
      {editingWork && workEditValue ? (
        <div className={styles.recordingEditPanel} style={{ padding: '4px 0 24px 0' }}>
          <WorkTitleField value={workEditValue} onChange={setWorkEditValue} />
          <WorkDetailsDisclosure value={workEditValue} onChange={setWorkEditValue} />
          <div className={shared.buttonRow} style={{ marginTop: 12 }}>
            <button className={shared.buttonPrimary} onClick={handleSaveWorkEdit} disabled={savingWorkEdit}>
              {savingWorkEdit ? 'Saving…' : 'Save changes'}
            </button>
            {workEditError && <span className={shared.statusError}>{workEditError}</span>}
          </div>
        </div>
      ) : (
        <div className={styles.meta}>{metaParts.join(' · ')}</div>
      )}

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
        <div key={recording.id}>
          <div className={styles.recordingRow}>
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
            <button
              className={styles.editRecordingLink}
              onClick={() => (editingRecordingId === recording.id ? setEditingRecordingId(null) : startEditing(recording))}
            >
              {editingRecordingId === recording.id ? 'Close' : 'Edit'}
            </button>
          </div>
          {editingRecordingId === recording.id && editValue && (
            <div className={styles.recordingEditPanel}>
              <RecordingForm value={editValue} onChange={setEditValue} />
              <div className={shared.buttonRow} style={{ marginTop: 12 }}>
                <button className={shared.buttonPrimary} onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
                {editError && <span className={shared.statusError}>{editError}</span>}
              </div>
            </div>
          )}
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
