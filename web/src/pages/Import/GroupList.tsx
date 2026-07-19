import type { ScanGroupOut } from '../../api/importTypes'
import shared from './ImportShared.module.css'
import styles from './GroupList.module.css'

interface GroupListProps {
  groups: ScanGroupOut[]
  selectedDir: string | null
  onSelect: (group: ScanGroupOut) => void
  onRescan: () => void
  scanning: boolean
}

export function GroupList({ groups, selectedDir, onSelect, onRescan, scanning }: GroupListProps) {
  return (
    <div className={shared.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div className={shared.panelTitle}>Pending import</div>
        <button className={shared.buttonSmall} onClick={onRescan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Rescan'}
        </button>
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
              <span className={styles.meta}>{group.files.length} file(s)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
