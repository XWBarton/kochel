import type { ReviewTrack, ReviewWork } from './reviewTypes'
import shared from './ImportShared.module.css'
import styles from './TrackMappingTable.module.css'

interface TrackMappingTableProps {
  work: ReviewWork
  tracks: ReviewTrack[]
  onChange: (tracks: ReviewTrack[]) => void
}

function parseMovementNumbers(text: string): number[] {
  return text
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

export function TrackMappingTable({ work, tracks, onChange }: TrackMappingTableProps) {
  function update(i: number, patch: Partial<ReviewTrack>) {
    onChange(tracks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  function removeTrack(i: number) {
    onChange(tracks.filter((_, idx) => idx !== i))
  }

  const movementNumbers = work.movements.map((m) => m.movementNumber).join(', ')

  return (
    <div>
      <div className={styles.hint}>
        This work has movement(s): {movementNumbers || '(none yet — add movements above)'}. Enter which
        movement number(s) each file covers — most files cover exactly one.
      </div>
      <div className={styles.hint}>
        If this folder actually contains more than one work (e.g. a two-symphony album), remove that
        other work's files below — they're only skipped from <em>this</em> commit, not deleted — trim the
        movements above to match, commit this one, then Rescan to review the rest as their own work.
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>File</th>
            <th>Track #</th>
            <th>Disc #</th>
            <th>Movement #(s)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((t, i) => (
            <tr key={t.file.relative_path}>
              <td>{t.file.filename}</td>
              <td>
                <input
                  className={`${shared.input} ${styles.numberInput}`}
                  type="number"
                  value={t.trackNumber ?? ''}
                  onChange={(e) => update(i, { trackNumber: e.target.value ? Number(e.target.value) : null })}
                />
              </td>
              <td>
                <input
                  className={`${shared.input} ${styles.numberInput}`}
                  type="number"
                  value={t.discNumber ?? ''}
                  onChange={(e) => update(i, { discNumber: e.target.value ? Number(e.target.value) : null })}
                />
              </td>
              <td>
                <input
                  className={`${shared.input} ${styles.movementInput}`}
                  placeholder="e.g. 1 or 2,3"
                  value={t.movementNumbers.join(',')}
                  onChange={(e) => update(i, { movementNumbers: parseMovementNumbers(e.target.value) })}
                />
              </td>
              <td>
                <button
                  className={shared.repeatRowRemove}
                  onClick={() => removeTrack(i)}
                  aria-label={`Remove ${t.file.filename} from this batch`}
                  title="Skip this file for now — leaves it pending for a later Rescan"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
