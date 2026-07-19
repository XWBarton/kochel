import type { RecordingListItem, TrackOut } from '../api/types'

export interface MovementTiming {
  track: TrackOut
  /** seconds into the track where this movement starts */
  start: number
  /** best-known duration of this movement, in seconds */
  duration: number
}

/**
 * Locates which track covers a given movement and the offset within it.
 *
 * The common case (one file per movement) is exact. A single file spanning
 * multiple movements is rarer and, absent precise cue data
 * (`start_seconds`/`duration_seconds_override`, not populated by ingest yet),
 * falls back to an equal split of the track's total duration — an
 * approximation, not a claim of precision.
 */
export function findMovementTiming(
  recording: RecordingListItem,
  movementId: number,
): MovementTiming | null {
  for (const track of recording.tracks) {
    const tm = track.track_movements.find((m) => m.movement_id === movementId)
    if (!tm) continue

    if (track.track_movements.length === 1) {
      return { track, start: 0, duration: track.duration_seconds }
    }

    const start = tm.start_seconds ?? 0
    const duration = tm.duration_seconds_override ?? track.duration_seconds / track.track_movements.length
    return { track, start, duration }
  }
  return null
}
