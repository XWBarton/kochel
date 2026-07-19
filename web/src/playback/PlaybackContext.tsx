import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getWork, getWorkRecordings, trackStreamUrl } from '../api/client'
import type { RecordingListItem, WorkDetail } from '../api/types'
import { findMovementTiming } from './movementTiming'

interface PlaybackContextValue {
  work: WorkDetail | null
  recording: RecordingListItem | null
  currentMovementId: number | null
  isPlaying: boolean
  elapsedSeconds: number
  durationSeconds: number
  playRecording: (work: WorkDetail, recording: RecordingListItem, movementId?: number) => void
  togglePlayPause: () => void
  seekTo: (seconds: number) => void
  jumpToMovement: (movementId: number) => void
  nextMovement: () => void
  prevMovement: () => void
  /** Live read of the true audio position, independent of the ~4/sec
   * `elapsedSeconds` state — for driving frame-accurate smooth animation
   * (progress bars, the needle) rather than chasing discrete state updates. */
  getElapsedSeconds: () => number
  /** Stops playback entirely and clears the session (unlike pause, which
   * keeps position for resume) — dismisses the mini-player/Now Playing. */
  stopPlayback: () => void
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null)

function sortedMovements(work: WorkDetail) {
  return [...work.movements].sort((a, b) => a.movement_number - b.movement_number)
}

// ---- session persistence (survives a hard refresh) ----

const SESSION_KEY = 'kochel:playbackSession'
const SESSION_SAVE_INTERVAL_MS = 5000

interface StoredSession {
  workId: number
  recordingId: number
  movementId: number
  elapsedSeconds: number
}

function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // storage unavailable (private browsing, quota) — session restore is a
    // nicety, not worth surfacing an error for
  }
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredSession>
    if (
      typeof parsed.workId !== 'number' ||
      typeof parsed.recordingId !== 'number' ||
      typeof parsed.movementId !== 'number' ||
      typeof parsed.elapsedSeconds !== 'number'
    ) {
      return null
    }
    return parsed as StoredSession
  } catch {
    return null
  }
}

interface LoadOptions {
  autoplay?: boolean
  seekOffsetSeconds?: number
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (audioRef.current === null) {
    audioRef.current = new Audio()
  }

  const currentTrackIdRef = useRef<number | null>(null)
  const movementStartRef = useRef(0)
  const movementDurationRef = useRef(0)
  const currentMovementIdRef = useRef<number | null>(null)
  // holds the latest work/recording for listeners registered once on mount
  const stateRef = useRef<{ work: WorkDetail | null; recording: RecordingListItem | null }>({
    work: null,
    recording: null,
  })

  const [work, setWork] = useState<WorkDetail | null>(null)
  const [recording, setRecording] = useState<RecordingListItem | null>(null)
  const [currentMovementId, setCurrentMovementId] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [durationSeconds, setDurationSeconds] = useState(0)

  const persistSessionNow = useCallback(() => {
    const w = stateRef.current.work
    const r = stateRef.current.recording
    const movementId = currentMovementIdRef.current
    if (!w || !r || movementId == null) return
    const audio = audioRef.current!
    const elapsed = Math.max(0, audio.currentTime - movementStartRef.current)
    saveSession({ workId: w.id, recordingId: r.id, movementId, elapsedSeconds: elapsed })
  }, [])

  const loadAndPlayMovement = useCallback(
    (targetWork: WorkDetail, targetRecording: RecordingListItem, movementId: number, options?: LoadOptions) => {
      const timing = findMovementTiming(targetRecording, movementId)
      if (!timing) return
      const audio = audioRef.current!
      const autoplay = options?.autoplay ?? true
      const seekOffset = Math.min(Math.max(options?.seekOffsetSeconds ?? 0, 0), timing.duration)
      const seekTime = timing.start + seekOffset

      stateRef.current = { work: targetWork, recording: targetRecording }
      currentMovementIdRef.current = movementId
      setWork(targetWork)
      setRecording(targetRecording)
      setCurrentMovementId(movementId)
      setDurationSeconds(timing.duration)
      setElapsedSeconds(seekOffset)
      movementStartRef.current = timing.start
      movementDurationRef.current = timing.duration

      if (currentTrackIdRef.current !== timing.track.id) {
        currentTrackIdRef.current = timing.track.id
        audio.src = trackStreamUrl(timing.track.id)
        const onLoaded = () => {
          audio.currentTime = seekTime
          if (autoplay) void audio.play()
          audio.removeEventListener('loadedmetadata', onLoaded)
        }
        audio.addEventListener('loadedmetadata', onLoaded)
      } else {
        audio.currentTime = seekTime
        if (autoplay) void audio.play()
      }

      saveSession({ workId: targetWork.id, recordingId: targetRecording.id, movementId, elapsedSeconds: seekOffset })
    },
    [],
  )

  const nextMovement = useCallback(() => {
    const { work: w, recording: r } = stateRef.current
    if (!w || !r || currentMovementId == null) return
    const movements = sortedMovements(w)
    const index = movements.findIndex((m) => m.id === currentMovementId)
    if (index === -1 || index === movements.length - 1) return
    loadAndPlayMovement(w, r, movements[index + 1].id)
  }, [currentMovementId, loadAndPlayMovement])

  const prevMovement = useCallback(() => {
    const { work: w, recording: r } = stateRef.current
    if (!w || !r || currentMovementId == null) return
    const movements = sortedMovements(w)
    const index = movements.findIndex((m) => m.id === currentMovementId)
    if (index <= 0) return
    loadAndPlayMovement(w, r, movements[index - 1].id)
  }, [currentMovementId, loadAndPlayMovement])

  // wire audio element events once
  useEffect(() => {
    const audio = audioRef.current!

    const onPlay = () => setIsPlaying(true)
    const onPause = () => {
      setIsPlaying(false)
      persistSessionNow()
    }
    const onTimeUpdate = () => {
      const elapsed = audio.currentTime - movementStartRef.current
      setElapsedSeconds(Math.max(0, elapsed))
      if (elapsed >= movementDurationRef.current - 0.15) {
        nextMovement()
      }
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
    }
    // nextMovement closes over currentMovementId, so re-bind timeupdate when it changes
  }, [nextMovement, persistSessionNow])

  // periodic + on-unload snapshots, so a refresh doesn't lose more than a
  // few seconds of position even mid-playback (pause already persists
  // immediately via the listener above)
  useEffect(() => {
    const interval = setInterval(persistSessionNow, SESSION_SAVE_INTERVAL_MS)
    window.addEventListener('beforeunload', persistSessionNow)
    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', persistSessionNow)
    }
  }, [persistSessionNow])

  // restore the last session once on mount — paused, seeked to where it left
  // off. Never autoplay: browsers block unmuted autoplay without a user
  // gesture anyway, and silently blasting audio on load would be rude even
  // if they didn't.
  useEffect(() => {
    const session = loadSession()
    if (!session) return
    let cancelled = false
    ;(async () => {
      try {
        const [workDetail, recordingsResp] = await Promise.all([
          getWork(session.workId),
          getWorkRecordings(session.workId),
        ])
        if (cancelled) return
        const targetRecording = recordingsResp.items.find((r) => r.id === session.recordingId)
        if (!targetRecording) return
        loadAndPlayMovement(workDetail, targetRecording, session.movementId, {
          autoplay: false,
          seekOffsetSeconds: session.elapsedSeconds,
        })
      } catch {
        // stale session (e.g. the work/recording no longer exists) — drop it silently
      }
    })()
    return () => {
      cancelled = true
    }
    // deliberately runs once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const playRecording = useCallback(
    (targetWork: WorkDetail, targetRecording: RecordingListItem, movementId?: number) => {
      const movements = sortedMovements(targetWork)
      const target = movementId ?? movements[0]?.id
      if (target == null) return
      loadAndPlayMovement(targetWork, targetRecording, target)
    },
    [loadAndPlayMovement],
  )

  const jumpToMovement = useCallback(
    (movementId: number) => {
      const { work: w, recording: r } = stateRef.current
      if (!w || !r) return
      loadAndPlayMovement(w, r, movementId)
    },
    [loadAndPlayMovement],
  )

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current!
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current!
    const clamped = Math.min(Math.max(seconds, 0), movementDurationRef.current)
    audio.currentTime = movementStartRef.current + clamped
    setElapsedSeconds(clamped)
  }, [])

  const getElapsedSeconds = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return 0
    return Math.max(0, audio.currentTime - movementStartRef.current)
  }, [])

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current!
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    currentTrackIdRef.current = null
    currentMovementIdRef.current = null
    movementStartRef.current = 0
    movementDurationRef.current = 0
    stateRef.current = { work: null, recording: null }
    setWork(null)
    setRecording(null)
    setCurrentMovementId(null)
    setIsPlaying(false)
    setElapsedSeconds(0)
    setDurationSeconds(0)
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      // storage unavailable — nothing to clean up then
    }
  }, [])

  const value = useMemo<PlaybackContextValue>(
    () => ({
      work,
      recording,
      currentMovementId,
      isPlaying,
      elapsedSeconds,
      durationSeconds,
      playRecording,
      togglePlayPause,
      seekTo,
      jumpToMovement,
      nextMovement,
      prevMovement,
      getElapsedSeconds,
      stopPlayback,
    }),
    [
      work,
      recording,
      currentMovementId,
      isPlaying,
      elapsedSeconds,
      durationSeconds,
      playRecording,
      togglePlayPause,
      seekTo,
      jumpToMovement,
      nextMovement,
      prevMovement,
      getElapsedSeconds,
      stopPlayback,
    ],
  )

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext)
  if (!ctx) throw new Error('usePlayback must be used within a PlaybackProvider')
  return ctx
}
