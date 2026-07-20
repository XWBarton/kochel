import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  deleteComposerImage,
  getComposer,
  getComposerWorks,
  getWork,
  getWorkRecordings,
  updateComposer,
  uploadComposerImage,
} from '../api/client'
import type { ComposerListItem, WorkListItem } from '../api/types'
import { ComposerAvatar } from '../components/ComposerAvatar'
import { formatComposerDates } from '../lib/format'
import { ComposerDetailsDisclosure, ComposerNameField } from './Import/ComposerFieldsForm'
import type { ReviewComposer } from './Import/reviewTypes'
import shared from './Import/ImportShared.module.css'
import { usePlayback } from '../playback/PlaybackContext'
import styles from './ComposerDetail.module.css'

function composerToReviewComposer(c: ComposerListItem): ReviewComposer {
  return {
    id: c.id,
    openopusId: null,
    name: c.name,
    sortName: c.sort_name,
    birthYear: c.birth_year,
    deathYear: c.death_year,
    period: c.period,
  }
}

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
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState<ReviewComposer | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
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

  function startEditing() {
    setEditValue(composerToReviewComposer(composer!))
    setEditing(true)
    setError(null)
  }

  async function handleSave() {
    if (!editValue) return
    setSaving(true)
    setError(null)
    try {
      const updated = await updateComposer(editValue.id!, {
        name: editValue.name,
        sort_name: editValue.sortName || null,
        birth_year: editValue.birthYear,
        death_year: editValue.deathYear,
        period: editValue.period,
      })
      setComposer(updated)
      setEditing(false)
      setEditValue(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImageBusy(true)
    setImageError(null)
    try {
      setComposer(await uploadComposerImage(id, file))
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setImageBusy(false)
    }
  }

  async function handleRemoveImage() {
    setImageBusy(true)
    setImageError(null)
    try {
      setComposer(await deleteComposerImage(id))
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setImageBusy(false)
    }
  }

  const groups = groupByCategory(works)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.avatarWrap}>
            <ComposerAvatar name={composer.name} sortName={composer.sort_name} imageUrl={composer.image_url} size="large" />
            {editing && (
              <div className={styles.avatarControls}>
                <label className={styles.avatarUploadLink}>
                  {imageBusy ? 'Working…' : composer.image_url ? 'Change photo' : 'Add photo'}
                  <input
                    className={styles.avatarFileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={imageBusy}
                    onChange={handleImageChange}
                  />
                </label>
                {composer.image_url && (
                  <button
                    type="button"
                    className={styles.avatarUploadLink}
                    disabled={imageBusy}
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <div className={styles.name}>{composer.name}</div>
            {imageError && <span className={shared.statusError}>{imageError}</span>}
            {!editing && (
              <div className={styles.meta}>
                {[formatComposerDates(composer.birth_year, composer.death_year), composer.period]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.catalogued}>
            {works.length} {works.length === 1 ? 'work' : 'works'} catalogued
          </div>
          <button className={styles.editLink} onClick={() => (editing ? setEditing(false) : startEditing())}>
            {editing ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>

      {editing && editValue && (
        <div className={styles.editPanel}>
          <ComposerNameField value={editValue} onChange={setEditValue} />
          <ComposerDetailsDisclosure value={editValue} onChange={setEditValue} />
          <div className={shared.buttonRow} style={{ marginTop: 12 }}>
            <button className={shared.buttonPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {error && <span className={shared.statusError}>{error}</span>}
          </div>
        </div>
      )}

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
