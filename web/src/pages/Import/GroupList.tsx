import { useState } from 'react'
import type { MouseEvent } from 'react'
import { discardPending } from '../../api/importClient'
import type { ScanGroupOut } from '../../api/importTypes'
import shared from './ImportShared.module.css'
import styles from './GroupList.module.css'

interface GroupListProps {
  groups: ScanGroupOut[]
  selectedDir: string | null
  onSelect: (group: ScanGroupOut) => void
  onRescan: () => void
  onDiscarded: () => void
  scanning: boolean
  scanMessage: string | null
}

export function GroupList({ groups, selectedDir, onSelect, onRescan, onDiscarded, scanning, scanMessage }: GroupListProps) {
  const [discarding, setDiscarding] = useState<string | null>(null)

  async function handleRemove(e: MouseEvent, group: ScanGroupOut) {
    e.stopPropagation()
    const confirmed = window.confirm(
      `Remove ${group.files.length} file(s) under "${group.relative_dir}"? This deletes them from the server — they were never imported, so there's nothing else to undo besides re-uploading.`,
    )
    if (!confirmed) return
    setDiscarding(group.relative_dir)
    try {
      await discardPending(group.files.map((f) => f.relative_path))
      onDiscarded()
    } finally {
      setDiscarding(null)
    }
  }
  return (
    <div className={shared.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16, gap: 12 }}>
        <div className={shared.panelTitle}>Pending import</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {scanMessage && <span className={styles.scanMessage}>{scanMessage}</span>}
          <button className={shared.buttonSmall} onClick={onRescan} disabled={scanning}>
            {scanning ? 'Scanning…' : 'Rescan'}
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className={styles.empty}>
          Nothing pending. Scan finds files under the library root that aren't linked to a track yet.
        </div>
      ) : (
        <div className={styles.list}>
          {groups.map((group) => (
            <div key={group.relative_dir} className={`${styles.row} ${group.relative_dir === selectedDir ? styles.active : ''}`}>
              <button className={styles.rowMain} onClick={() => onSelect(group)}>
                <span className={styles.path}>{group.relative_dir}</span>
                <span className={styles.meta}>
                  {group.files.length} file(s)
                  <span className={styles.reviewHint}>Click to review</span>
                  <span className={styles.chevron}>›</span>
                </span>
              </button>
              <button
                className={styles.remove}
                onClick={(e) => handleRemove(e, group)}
                disabled={discarding === group.relative_dir}
              >
                {discarding === group.relative_dir ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
