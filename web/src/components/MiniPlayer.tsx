import { useLocation, useNavigate } from 'react-router-dom'
import { formatDuration, toRoman } from '../lib/format'
import { usePlayback } from '../playback/PlaybackContext'
import { useSettings } from '../settings/SettingsContext'
import { Sunburst } from './Sunburst'
import styles from './MiniPlayer.module.css'

const INK = '#161513'

export function MiniPlayer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accentColor } = useSettings()
  const { work, currentMovementId, isPlaying, elapsedSeconds, durationSeconds, togglePlayPause, nextMovement, prevMovement } =
    usePlayback()

  // redundant on the Now Playing screen itself, which already is the
  // expanded player — the mini-player is for every other screen
  if (!work || currentMovementId == null || location.pathname === '/now-playing') return null

  const movement = work.movements.find((m) => m.id === currentMovementId)
  const label = movement
    ? `${work.composer_name} — ${toRoman(movement.movement_number)}. ${movement.name ?? 'Untitled'}`
    : work.composer_name

  const progressPct = durationSeconds > 0 ? (elapsedSeconds / durationSeconds) * 100 : 0

  return (
    <div className={styles.bar}>
      <div className={styles.progressLine} style={{ width: `${progressPct}%` }} />
      <div className={styles.sunburst}>
        <Sunburst size={26} fg={INK} accent={accentColor} rays={false} spinning={isPlaying} />
      </div>
      <div className={styles.info} onClick={() => navigate('/now-playing')} title={label}>
        {label}
        <span style={{ marginLeft: 10, opacity: 0.5 }} className="tabular">
          {formatDuration(elapsedSeconds)}
        </span>
      </div>
      <div className={styles.controls}>
        <div className={`${styles.triangle} prev`} role="button" aria-label="Previous" onClick={prevMovement} />
        {isPlaying ? (
          <div className={styles.pauseIcon} role="button" aria-label="Pause" onClick={togglePlayPause}>
            <span />
            <span />
          </div>
        ) : (
          <div className={styles.playTriangle} role="button" aria-label="Play" onClick={togglePlayPause} />
        )}
        <div className={`${styles.triangle} next`} role="button" aria-label="Next" onClick={nextMovement} />
      </div>
    </div>
  )
}
