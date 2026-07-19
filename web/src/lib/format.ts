const ROMAN_NUMERALS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

export function toRoman(n: number): string {
  let remaining = n
  let result = ''
  for (const [value, symbol] of ROMAN_NUMERALS) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${ss}`
  }
  return `${m}:${ss}`
}

export function formatComposerDates(birthYear: number | null, deathYear: number | null): string {
  if (birthYear == null && deathYear == null) return ''
  if (deathYear != null) return `${birthYear ?? '?'}–${deathYear}`
  if (birthYear != null) return `b. ${birthYear}`
  return ''
}

export function firstLetter(sortName: string): string {
  const trimmed = sortName.trim()
  return trimmed.length ? trimmed[0].toUpperCase() : '?'
}
