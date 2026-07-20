import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sunburst } from '../components/Sunburst'
import { formatDuration, toRoman } from '../lib/format'
import { findMovementTiming } from '../playback/movementTiming'
import { usePlayback } from '../playback/PlaybackContext'
import { useSmoothProgress } from '../playback/useSmoothProgress'
import { useSettings } from '../settings/SettingsContext'
import styles from './NowPlaying.module.css'

export function NowPlaying() {
  const {
    work,
    recording,
    currentMovementId,
    isPlaying,
    elapsedSeconds,
    durationSeconds,
    togglePlayPause,
    seekTo,
    jumpToMovement,
    nextMovement,
    prevMovement,
    getElapsedSeconds,
  } = usePlayback()
  const { accentColor, theme, setTheme } = useSettings()
  const navigate = useNavigate()
  const trackRef = useRef<HTMLDivElement>(null)
  const [seeking, setSeeking] = useState(false)

  function handleMinimize() {
    // collapses back to the mini-player without stopping playback — only
    // the mini-player's own close button actually stops it
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  const [progress, setProgressDirectly] = useSmoothProgress({
    isPlaying,
    durationSeconds,
    getElapsedSeconds,
    seeking,
    resetKey: currentMovementId,
  })

  if (!work || !recording || currentMovementId == null) {
    return <div className={styles.empty}>Nothing playing. Pick a recording from a work to begin.</div>
  }

  const dark = theme === 'dark'

  const movements = [...work.movements].sort((a, b) => a.movement_number - b.movement_number)
  const currentMovement = movements.find((m) => m.id === currentMovementId) ?? null
  const conductor = recording.performers.find((p) => p.role === 'conductor')
  const creditParts = [
    recording.ensemble?.name,
    conductor ? `${conductor.person.name}, conductor` : null,
    recording.recording_year,
    recording.label,
  ].filter(Boolean)

  function handleSeekPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track || durationSeconds <= 0) return
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    setProgressDirectly(ratio)
    seekTo(ratio * durationSeconds)
  }

  const progressPct = progress * 100

  return (
    <div className={styles.panel}>
      <div className={styles.artwork}>
        <div className={styles.artworkInset} />
        <Sunburst size={320} fg="var(--ink)" accent={accentColor} spinning={isPlaying} progress={progress} />
        <button
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          aria-label="Toggle theme"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity: 0.5,
          }}
        >
          {dark ? 'light' : 'dark'}
        </button>
      </div>

      <div className={styles.content}>
        <div>
          <div className={styles.topRow}>
            <div className={styles.label}>Now Playing</div>
            <button onClick={handleMinimize} aria-label="Minimize player" className={styles.closeButton}>
              minimize ▾
            </button>
          </div>
          <div className={styles.composerName}>{work.composer_name}</div>
          <div className={styles.workTitle}>{work.title}</div>
          {currentMovement && (
            <div className={styles.currentMovement}>
              {toRoman(currentMovement.movement_number)}. {currentMovement.name ?? 'Untitled'}
            </div>
          )}
          <div className={styles.credit}>{creditParts.join(' · ')}</div>
        </div>

        <div className={styles.movementsSection}>
          <div className={styles.movementsRule} />
          <div className={styles.movementsLabel}>Movements</div>
          {movements.map((movement) => {
            const active = movement.id === currentMovementId
            const timing = findMovementTiming(recording, movement.id)
            return (
              <button
                className={styles.movementRow}
                key={movement.id}
                onClick={() => jumpToMovement(movement.id)}
              >
                <div className={`${styles.roman} ${active ? styles.active : ''}`}>
                  {toRoman(movement.movement_number)}
                </div>
                <div className={`${styles.tempo} ${active ? styles.active : ''}`}>
                  {movement.name ?? 'Untitled'}
                </div>
                <div className={`${styles.movementDuration} tabular`}>
                  {timing ? formatDuration(timing.duration) : '—'}
                </div>
              </button>
            )
          })}
        </div>

        <div className={styles.transport}>
          <div
            className={styles.progressTrack}
            ref={trackRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setSeeking(true)
              handleSeekPointer(e)
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1) handleSeekPointer(e)
            }}
            onPointerUp={() => setSeeking(false)}
            onPointerCancel={() => setSeeking(false)}
          >
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            <div className={styles.progressHandle} style={{ left: `${progressPct}%` }} />
          </div>
          <div className={`${styles.timeRow} tabular`}>
            <span>{formatDuration(elapsedSeconds)}</span>
            <span>-{formatDuration(Math.max(0, durationSeconds - elapsedSeconds))}</span>
          </div>
          <div className={styles.controls}>
            <div
              className={`${styles.transportTriangle} prev`}
              role="button"
              aria-label="Previous movement"
              onClick={prevMovement}
            />
            <div className={styles.playButton} role="button" aria-label="Play/Pause" onClick={togglePlayPause}>
              {isPlaying ? (
                <div className={styles.pauseIcon}>
                  <span />
                  <span />
                </div>
              ) : (
                <div className={styles.playIcon} />
              )}
            </div>
            <div
              className={`${styles.transportTriangle} next`}
              role="button"
              aria-label="Next movement"
              onClick={nextMovement}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
