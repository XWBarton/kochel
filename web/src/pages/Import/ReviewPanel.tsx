import { useEffect, useMemo, useState } from 'react'
import { commitImport } from '../../api/importClient'
import type { ImportCommitRequest, ScanGroupOut } from '../../api/importTypes'
import { ComposerPicker } from './ComposerPicker'
import { RecordingForm } from './RecordingForm'
import {
  guessComposerName,
  guessRecording,
  guessWorkTitle,
  parseLeadingInt,
  partitionFiles,
  tracksFromFiles,
} from './reviewTypes'
import type { ReviewComposer, ReviewRecording, ReviewTrack, ReviewWork } from './reviewTypes'
import { TrackMappingTable } from './TrackMappingTable'
import { WorkPicker } from './WorkPicker'
import shared from './ImportShared.module.css'

interface ReviewPanelProps {
  group: ScanGroupOut
  onCommitted: () => void
  onCancel: () => void
}

export function ReviewPanel({ group, onCommitted, onCancel }: ReviewPanelProps) {
  // The folder's *remaining* (not-yet-committed) files — starts as the whole
  // group, but shrinks in place as each work/composer within it gets
  // committed, so a folder holding more than one work can be worked through
  // without a full library Rescan between each one.
  const [remainingFiles, setRemainingFiles] = useState<ScanGroupOut['files']>(group.files)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [composer, setComposer] = useState<ReviewComposer | null>(null)
  const [work, setWork] = useState<ReviewWork | null>(null)
  const [recording, setRecording] = useState<ReviewRecording>(() => guessRecording(group.files))
  const [tracks, setTracks] = useState<ReviewTrack[]>(() => tracksFromFiles(group.files))
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justCommitted, setJustCommitted] = useState<string | null>(null)

  const subGroups = useMemo(() => partitionFiles(remainingFiles), [remainingFiles])
  const activeSubGroup = subGroups.find((g) => g.key === activeKey) ?? subGroups[0] ?? null
  const activeFiles = activeSubGroup?.files ?? []
  const activeSignature = activeFiles.map((f) => f.relative_path).join('|')

  // A different folder was selected — reset everything back to its full file set.
  useEffect(() => {
    setRemainingFiles(group.files)
    setActiveKey(null)
    setJustCommitted(null)
    setError(null)
  }, [group])

  // Whichever sub-group is active (folder just opened, user picked a
  // different one, or the previous one just got committed and this one
  // auto-advanced into place), the composer/work/recording/tracks state
  // needs to describe *that* file set, not whatever was picked before.
  useEffect(() => {
    setComposer(null)
    setWork(null)
    setRecording(guessRecording(activeFiles))
    setTracks(tracksFromFiles(activeFiles))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSignature])

  // Fill in the track → movement mapping automatically rather than making
  // every file's movement number(s) be retyped by hand (painful and easy to
  // miss one on a large anthology work with hundreds of tracks). Prefer an
  // explicit per-file movement-number tag (MVIN / Picard's "movement") when
  // every file has one and it's in range — that's a direct statement of
  // intent, more reliable than inferring order. Otherwise fall back to the
  // same-count heuristic: when the work has exactly as many movements as
  // there are files, file order (by track number) is an unambiguous mapping.
  useEffect(() => {
    if (!work) return
    if (!tracks.every((t) => t.movementNumbers.length === 0)) return

    const explicit = tracks.map((t) => parseLeadingInt(t.file.tags.movementnumber))
    if (explicit.length > 0 && explicit.every((n) => n != null && n >= 1 && n <= work.movements.length)) {
      setTracks(tracks.map((t, i) => ({ ...t, movementNumbers: [explicit[i] as number] })))
      return
    }

    if (work.movements.length !== tracks.length) return

    const ordered = [...tracks].sort((a, b) => {
      if (a.trackNumber != null && b.trackNumber != null) return a.trackNumber - b.trackNumber
      if (a.trackNumber != null) return -1
      if (b.trackNumber != null) return 1
      return a.file.filename.localeCompare(b.file.filename)
    })
    const movementNumberByPath = new Map(ordered.map((t, i) => [t.file.relative_path, i + 1]))
    setTracks(tracks.map((t) => ({ ...t, movementNumbers: [movementNumberByPath.get(t.file.relative_path)!] })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.movements.length, tracks.length])

  function updateWork(newComposer: ReviewComposer | null) {
    setComposer(newComposer)
    setWork(null)
  }

  async function handleCommit() {
    if (!composer || !work) return
    setCommitting(true)
    setError(null)
    try {
      const payload: ImportCommitRequest = {
        composer: {
          id: composer.id,
          name: composer.name || null,
          sort_name: composer.sortName || null,
          birth_year: composer.birthYear,
          death_year: composer.deathYear,
          period: composer.period,
        },
        work: {
          id: work.id,
          title: work.title || null,
          subtitle: work.subtitle || null,
          key: work.key || null,
          form: work.form || null,
          category: work.category || null,
          composed_year: work.composedYear,
          composed_year_uncertain: false,
          composed_year_range_end: null,
          catalogue_numbers: work.id
            ? []
            : work.catalogueNumbers.map((cn) => ({ system: cn.system, number: cn.number, is_primary: cn.isPrimary })),
          movements: work.id
            ? []
            : work.movements.map((m) => ({ movement_number: m.movementNumber, name: m.name })),
        },
        recording: {
          ensemble_id: recording.ensembleId,
          ensemble_name: recording.ensembleId ? null : recording.ensembleName || null,
          label: recording.label || null,
          recording_year: recording.recordingYear,
          release_year: recording.releaseYear,
          notes: recording.notes || null,
          is_default_in_library: recording.isDefaultInLibrary,
          performers: recording.performers.map((p) => ({
            person_id: p.personId,
            name: p.personId ? null : p.name,
            sort_name: null,
            role: p.role,
            instrument: p.instrument || null,
            credited_order: null,
          })),
        },
        tracks: tracks.map((t) => ({
          relative_path: t.file.relative_path,
          track_number: t.trackNumber,
          disc_number: t.discNumber,
          movement_numbers: t.movementNumbers,
        })),
      }

      await commitImport(payload)

      const committedPaths = new Set(tracks.map((t) => t.file.relative_path))
      const stillRemaining = remainingFiles.filter((f) => !committedPaths.has(f.relative_path))
      if (stillRemaining.length === 0) {
        onCommitted()
        return
      }
      setJustCommitted(`Committed "${work.title}" (${committedPaths.size} file(s)) — continuing with what's left.`)
      setRemainingFiles(stillRemaining)
      setActiveKey(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commit failed')
    } finally {
      setCommitting(false)
    }
  }

  const canCommit = composer !== null && work !== null && !committing

  return (
    <div className={shared.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className={shared.panelTitle}>Reviewing: {group.relative_dir}</div>
        <button className={shared.buttonSmall} onClick={onCancel}>
          Close
        </button>
      </div>

      {subGroups.length > 1 && (
        <div className={shared.subgroupBanner}>
          <div className={shared.subgroupHint}>
            This folder looks like it contains {subGroups.length} separate works — reviewing one at a
            time below. Committing one moves on to the next automatically; click any row to jump to it
            instead.
          </div>
          <div className={shared.subgroupList}>
            {subGroups.map((g) => (
              <button
                key={g.key}
                className={`${shared.subgroupRow} ${g.key === activeSubGroup?.key ? shared.subgroupRowActive : ''}`}
                onClick={() => setActiveKey(g.key)}
              >
                <span>
                  {g.composerGuess || '(no composer tag)'} — {g.workGuess || '(no album tag)'}
                </span>
                <span className={shared.subgroupCount}>{g.files.length} file(s)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {justCommitted && <div className={shared.justCommitted}>{justCommitted}</div>}

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Composer</div>
      <ComposerPicker value={composer} onChange={updateWork} initialQuery={guessComposerName(activeFiles)} />

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Work</div>
      {composer ? (
        <WorkPicker
          composer={composer}
          value={work}
          onChange={setWork}
          initialQuery={guessWorkTitle(activeFiles)}
          files={activeFiles}
        />
      ) : (
        <div style={{ fontStyle: 'italic', opacity: 0.55, fontSize: 14 }}>Pick a composer first.</div>
      )}

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Recording</div>
      <RecordingForm value={recording} onChange={setRecording} />

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Track → movement mapping</div>
      {work ? (
        <TrackMappingTable work={work} tracks={tracks} onChange={setTracks} />
      ) : (
        <div style={{ fontStyle: 'italic', opacity: 0.55, fontSize: 14 }}>Pick or create a work first.</div>
      )}

      <div style={{ marginTop: 20 }} className={shared.buttonRow}>
        <button className={shared.buttonPrimary} disabled={!canCommit} onClick={handleCommit}>
          {committing ? 'Committing…' : 'Commit recording'}
        </button>
        {error && <span className={shared.statusError}>{error}</span>}
      </div>
    </div>
  )
}
