import { useEffect, useRef, useState } from 'react'

interface UseSmoothProgressOptions {
  isPlaying: boolean
  durationSeconds: number
  getElapsedSeconds: () => number
  /** while true, the caller drives progress directly (e.g. dragging the
   * seek handle) — no animation loop runs */
  seeking?: boolean
  /** changing this value (e.g. the current movement id) triggers a brief
   * eased animation back down to 0 instead of an instant jump */
  resetKey?: number | string | null
  resetDurationMs?: number
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Drives a 0–1 progress value from the true, live audio position every
 * animation frame while playing — not from the ~4/sec `timeupdate`-derived
 * state, which is too coarse to animate smoothly and causes visible
 * stepping if driven directly or chased with a CSS transition. On pause,
 * the loop stops and does one precise read of the true position, so
 * nothing keeps drifting after the audio has actually stopped.
 */
export function useSmoothProgress({
  isPlaying,
  durationSeconds,
  getElapsedSeconds,
  seeking = false,
  resetKey = null,
  resetDurationMs = 650,
}: UseSmoothProgressOptions): [number, (value: number) => void] {
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(0)
  const resetRef = useRef<{ from: number; startedAt: number } | null>(null)
  const prevResetKeyRef = useRef(resetKey)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (prevResetKeyRef.current === resetKey) return
    prevResetKeyRef.current = resetKey
    resetRef.current = { from: progressRef.current, startedAt: performance.now() }
  }, [resetKey])

  useEffect(() => {
    if (seeking) return

    const liveProgress = () => (durationSeconds > 0 ? getElapsedSeconds() / durationSeconds : 0)

    if (!isPlaying && !resetRef.current) {
      setProgress(liveProgress())
      return
    }

    let raf: number
    const tick = () => {
      const reset = resetRef.current
      if (reset) {
        const t = Math.min((performance.now() - reset.startedAt) / resetDurationMs, 1)
        setProgress(reset.from + (0 - reset.from) * easeOutCubic(t))
        if (t >= 1) resetRef.current = null
        raf = requestAnimationFrame(tick)
        return
      }
      setProgress(liveProgress())
      // once the reset (if any) has settled, stop scheduling frames unless
      // actually playing — otherwise a reset that fires while paused (e.g.
      // restoring a paused session) would poll forever for no reason
      if (isPlayingRef.current) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, seeking, durationSeconds, getElapsedSeconds, resetDurationMs])

  function setProgressDirectly(value: number) {
    resetRef.current = null
    setProgress(value)
  }

  return [progress, setProgressDirectly]
}
