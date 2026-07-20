import { useRef, useState } from 'react'
import { uploadFiles } from '../../api/importClient'
import type { UploadResponse } from '../../api/importTypes'
import styles from './ImportShared.module.css'

interface UploadPanelProps {
  onUploaded: () => void
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1)
}

export function UploadPanel({ onUploaded }: UploadPanelProps) {
  const [selected, setSelected] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const folderInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  function handleSelect(fileList: FileList | null) {
    setSelected(fileList ? Array.from(fileList) : [])
    setResult(null)
    setError(null)
  }

  async function handleUpload() {
    if (selected.length === 0) return
    setUploading(true)
    setProgress(0)
    setError(null)
    try {
      const response = await uploadFiles(selected, setProgress)
      setResult(response)
      setSelected([])
      if (folderInputRef.current) folderInputRef.current.value = ''
      if (filesInputRef.current) filesInputRef.current.value = ''
      if (response.saved_count > 0) onUploaded()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const totalBytes = selected.reduce((sum, f) => sum + f.size, 0)
  const notableResults = result?.results.filter((r) => r.status !== 'saved') ?? []

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>Upload an album</div>
      <div className={styles.panelIntro}>
        Pick a folder from your computer — its subfolder structure is preserved on the server. Only
        recognized audio files (.flac .mp3 .m4a .wav .aac .ogg .alac) are accepted; anything else in the
        folder (cover art, .cue/.log files, etc.) is skipped.
      </div>

      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error non-standard attribute, no React typing, but broadly supported
        webkitdirectory=""
        style={{ display: 'none' }}
        onChange={(e) => handleSelect(e.target.files)}
      />
      <input
        ref={filesInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleSelect(e.target.files)}
      />

      <div className={styles.buttonRow}>
        <button className={styles.button} onClick={() => folderInputRef.current?.click()}>
          Choose folder…
        </button>
        <button className={styles.button} onClick={() => filesInputRef.current?.click()}>
          Choose files instead…
        </button>
        {selected.length > 0 && (
          <span style={{ fontSize: 13, opacity: 0.6 }}>
            {selected.length} file(s) selected, {formatMegabytes(totalBytes)} MB
          </span>
        )}
      </div>

      <div className={styles.buttonRow} style={{ marginTop: 16 }}>
        <button className={styles.buttonPrimary} disabled={selected.length === 0 || uploading} onClick={handleUpload}>
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {uploading && (
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {error && <div className={styles.statusError}>{error}</div>}

      {result && (
        <div className={styles.statusOk}>
          {[
            result.saved_count ? `${result.saved_count} uploaded` : null,
            result.skipped_count ? `${result.skipped_count} skipped (already on server)` : null,
            result.rejected_count ? `${result.rejected_count} rejected` : null,
          ]
            .filter(Boolean)
            .join(', ') || 'Nothing uploaded'}
          {result.saved_count > 0 ? '. Scan below to import them.' : '.'}
        </div>
      )}

      {notableResults.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          {notableResults.map((r) => (
            <div
              key={r.relative_path}
              style={{ padding: '2px 0', color: r.status === 'rejected' ? 'var(--error)' : 'var(--warning)' }}
            >
              {r.relative_path} — {r.detail}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
