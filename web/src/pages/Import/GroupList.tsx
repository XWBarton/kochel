import type { ScanGroupOut } from '../../api/importTypes'
import shared from './ImportShared.module.css'
import styles from './GroupList.module.css'

interface GroupListProps {
  groups: ScanGroupOut[]
  selectedDir: string | null
  onSelect: (group: ScanGroupOut) => void
  onRescan: () => void
  scanning: boolean
  scanMessage: string | null
}

export function GroupList({ groups, selectedDir, onSelect, onRescan, scanning, scanMessage }: GroupListProps) {
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
            <button
              key={group.relative_dir}
              className={`${styles.row} ${group.relative_dir === selectedDir ? styles.active : ''}`}
              onClick={() => onSelect(group)}
            >
              <span className={styles.path}>{group.relative_dir}</span>
              <span className={styles.meta}>
                {group.files.length} file(s)
                <span className={styles.reviewHint}>Click to review</span>
                <span className={styles.chevron}>›</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
