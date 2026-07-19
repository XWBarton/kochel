import { useEffect, useState } from 'react'
import { commitImport } from '../../api/importClient'
import type { ImportCommitRequest, ScanGroupOut } from '../../api/importTypes'
import { ComposerPicker } from './ComposerPicker'
import { RecordingForm } from './RecordingForm'
import {
  emptyRecording,
  guessComposerName,
  guessWorkTitle,
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
  const [composer, setComposer] = useState<ReviewComposer | null>(null)
  const [work, setWork] = useState<ReviewWork | null>(null)
  const [recording, setRecording] = useState<ReviewRecording>(emptyRecording())
  const [tracks, setTracks] = useState<ReviewTrack[]>(() => tracksFromFiles(group.files))
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setComposer(null)
    setWork(null)
    setRecording(emptyRecording())
    setTracks(tracksFromFiles(group.files))
    setError(null)
  }, [group])

  // When the work has exactly as many movements as there are files, the
  // mapping is unambiguous — same track-number order used to guess the
  // movement names in the first place — so fill it in rather than making
  // every track's movement number(s) be retyped by hand (painful and easy
  // to miss one on a large anthology work with hundreds of tracks).
  useEffect(() => {
    if (!work || work.movements.length !== tracks.length) return
    if (!tracks.every((t) => t.movementNumbers.length === 0)) return

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
      onCommitted()
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

      <FileTable files={group.files} />

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Composer</div>
      <ComposerPicker value={composer} onChange={updateWork} initialQuery={guessComposerName(group.files)} />

      <div className={shared.hairlineDivider} />
      <div className={shared.sectionLabel}>Work</div>
      {composer ? (
        <WorkPicker
          composer={composer}
          value={work}
          onChange={setWork}
          initialQuery={guessWorkTitle(group.files)}
          files={group.files}
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

function FileTable({ files }: { files: ScanGroupOut['files'] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
      <thead>
        <tr>
          {['File', 'Title tag', 'Composer tag', 'Album tag', 'Duration', 'Format'].map((h) => (
            <th
              key={h}
              style={{
                textAlign: 'left',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                opacity: 0.5,
                fontWeight: 400,
                padding: '6px 8px',
                borderBottom: '1px solid var(--ink)',
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {files.map((f) => (
          <tr key={f.relative_path}>
            <td style={cellStyle}>{f.filename}</td>
            <td style={cellStyle}>{f.tags.title ?? ''}</td>
            <td style={cellStyle}>{f.tags.composer ?? ''}</td>
            <td style={cellStyle}>{f.tags.album ?? ''}</td>
            <td style={cellStyle}>{f.duration_seconds.toFixed(1)}s</td>
            <td style={cellStyle}>{f.format}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const cellStyle = { padding: '6px 8px', borderBottom: '1px solid var(--divider)' }
