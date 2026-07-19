import { useEffect, useState } from 'react'
import { scanLibrary } from '../../api/importClient'
import type { ScanGroupOut } from '../../api/importTypes'
import { GroupList } from './GroupList'
import styles from './ImportPage.module.css'
import { ReviewPanel } from './ReviewPanel'
import { UploadPanel } from './UploadPanel'

export function ImportPage() {
  const [groups, setGroups] = useState<ScanGroupOut[]>([])
  const [scanning, setScanning] = useState(false)
  const [selected, setSelected] = useState<ScanGroupOut | null>(null)

  async function runScan() {
    setScanning(true)
    try {
      const result = await scanLibrary()
      setGroups(result.groups)
      setSelected((prev) => (prev ? result.groups.find((g) => g.relative_dir === prev.relative_dir) ?? null : null))
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    runScan()
  }, [])

  function handleCommitted() {
    setSelected(null)
    runScan()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Import</div>
      <div className={styles.intro}>
        Upload albums from your computer, then review and correct classical metadata before it's added to
        your library. Open Opus suggestions are a starting point, never a source of truth — everything
        here is committed into your own tables.
      </div>

      <UploadPanel onUploaded={runScan} />
      <GroupList groups={groups} selectedDir={selected?.relative_dir ?? null} onSelect={setSelected} onRescan={runScan} scanning={scanning} />

      {selected && <ReviewPanel group={selected} onCommitted={handleCommitted} onCancel={() => setSelected(null)} />}
    </div>
  )
}
