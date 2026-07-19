const RAY_ANGLES = Array.from({ length: 24 }, (_, i) => i * 15)

// needle rests off-vertical like a tonearm, and spirals from the outer edge
// toward the center as the current movement plays — the disc rotates
// underneath it, so the needle itself is drawn outside the spinning group.
const NEEDLE_ANGLE_DEG = -18
const NEEDLE_OUTER_R = 88
const NEEDLE_INNER_R = 8

interface SunburstProps {
  size: number
  fg: string
  accent: string
  rays?: boolean
  /** slow continuous rotation, matching playback state */
  spinning?: boolean
  /** 0–1 through the current movement; when set, draws a needle dot spiraling toward center */
  progress?: number
  /** CSS transition for the needle's cx/cy — e.g. a quick linear tween between
   * playback ticks, a slower eased one when a new movement resets it back
   * out to the edge, or 'none' while actively scrubbing. Defaults to a quick
   * linear tween. */
  needleTransition?: string
}

/** The record-label sunburst motif — concentric circles + 24 radiating hairlines + a center accent dot. */
export function Sunburst({
  size,
  fg,
  accent,
  rays = true,
  spinning = false,
  progress,
  needleTransition = 'cx 0.26s linear, cy 0.26s linear',
}: SunburstProps) {
  const needleR = NEEDLE_OUTER_R - (NEEDLE_OUTER_R - NEEDLE_INNER_R) * Math.min(Math.max(progress ?? 0, 0), 1)
  const angleRad = (NEEDLE_ANGLE_DEG * Math.PI) / 180
  const needleX = 100 + needleR * Math.sin(angleRad)
  const needleY = 100 - needleR * Math.cos(angleRad)

  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <g
        style={{
          transformOrigin: '100px 100px',
          animation: spinning ? 'kochel-spin 10s linear infinite' : undefined,
        }}
      >
        <circle cx="100" cy="100" r="95" stroke={fg} strokeOpacity="0.5" fill="none" />
        {rays &&
          RAY_ANGLES.map((angle) => (
            <line
              key={angle}
              x1="100"
              y1="6"
              x2="100"
              y2="28"
              stroke={fg}
              strokeOpacity="0.55"
              strokeWidth="1"
              transform={`rotate(${angle} 100 100)`}
            />
          ))}
        <circle cx="100" cy="100" r="58" stroke={fg} strokeOpacity="0.5" fill="none" />
        <circle cx="100" cy="100" r="5" fill={accent} />
      </g>
      {progress !== undefined && (
        <circle cx={needleX} cy={needleY} r="4" fill={accent} style={{ transition: needleTransition }} />
      )}
    </svg>
  )
}
