import Foundation

struct MovementTiming {
    let track: Track
    /// seconds into the track where this movement starts
    let start: Double
    /// best-known duration of this movement, in seconds
    let duration: Double
}

/// Locates which track covers a given movement and the offset within it.
///
/// The common case (one file per movement) is exact. A single file spanning
/// multiple movements is rarer and, absent precise cue data
/// (`start_seconds`/`duration_seconds_override`, not populated by ingest yet),
/// falls back to an equal split of the track's total duration — an
/// approximation, not a claim of precision. Mirrors web/src/playback/movementTiming.ts.
func findMovementTiming(recording: Recording, movementId: Int) -> MovementTiming? {
    for track in recording.tracks {
        guard let tm = track.trackMovements.first(where: { $0.movementId == movementId }) else { continue }

        if track.trackMovements.count == 1 {
            return MovementTiming(track: track, start: 0, duration: track.durationSeconds)
        }

        let start = tm.startSeconds ?? 0
        let duration = tm.durationSecondsOverride ?? (track.durationSeconds / Double(track.trackMovements.count))
        return MovementTiming(track: track, start: start, duration: duration)
    }
    return nil
}
