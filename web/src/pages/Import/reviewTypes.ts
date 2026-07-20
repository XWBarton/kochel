import type { PerformerRole, ScanFileOut } from '../../api/importTypes'

export interface ReviewComposer {
  id: number | null
  openopusId: string | null
  name: string
  sortName: string
  birthYear: number | null
  deathYear: number | null
  period: string | null
}

export interface ReviewCatalogueNumber {
  system: string
  number: string
  isPrimary: boolean
}

export interface ReviewMovement {
  movementNumber: number
  name: string | null
  /** set when this movement already exists on a library work (read-only reference) */
  existingId?: number
}

export interface ReviewWork {
  id: number | null
  title: string
  subtitle: string
  key: string
  form: string
  category: string
  composedYear: number | null
  catalogueNumbers: ReviewCatalogueNumber[]
  movements: ReviewMovement[]
}

export interface ReviewPerformer {
  personId: number | null
  name: string
  role: PerformerRole
  instrument: string
}

export interface ReviewTrack {
  file: ScanFileOut
  trackNumber: number | null
  discNumber: number | null
  movementNumbers: number[]
}

export interface ReviewRecording {
  ensembleId: number | null
  ensembleName: string
  performers: ReviewPerformer[]
  label: string
  recordingYear: number | null
  releaseYear: number | null
  notes: string
  isDefaultInLibrary: boolean
}

export function newManualComposer(name: string): ReviewComposer {
  return { id: null, openopusId: null, name, sortName: '', birthYear: null, deathYear: null, period: null }
}

export function newManualWork(title: string, movementNames: (string | null)[]): ReviewWork {
  const names = movementNames.length > 0 ? movementNames : [null]
  return {
    id: null,
    title,
    subtitle: '',
    key: '',
    form: '',
    category: '',
    composedYear: null,
    catalogueNumbers: [],
    movements: names.map((name, i) => ({
      movementNumber: i + 1,
      name,
    })),
  }
}

export function parseLeadingInt(value: string | null | undefined): number | null {
  if (!value) return null
  const n = parseInt(value.split('/')[0]?.trim() ?? '', 10)
  return Number.isNaN(n) ? null : n
}

/** Majority-vote across files for a single tag value — most tag fields
 * (composer, album, conductor, label…) should be uniform across every file
 * in a recording, so the most common non-blank value is the best guess. */
function modeOf(values: (string | null | undefined)[]): string {
  const counts = new Map<string, number>()
  for (const v of values) {
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

export function guessComposerName(files: ScanFileOut[]): string {
  return modeOf(files.map((f) => f.tags.composer || f.tags.albumartist || f.tags.artist))
}

function orderByMovementThenTrack(files: ScanFileOut[]): ScanFileOut[] {
  return [...files].sort((a, b) => {
    const ma = parseLeadingInt(a.tags.movementnumber)
    const mb = parseLeadingInt(b.tags.movementnumber)
    if (ma != null && mb != null) return ma - mb
    const ta = parseLeadingInt(a.tags.tracknumber)
    const tb = parseLeadingInt(b.tags.tracknumber)
    if (ta != null && tb != null) return ta - tb
    if (ta != null) return -1
    if (tb != null) return 1
    return a.filename.localeCompare(b.filename)
  })
}

/** Movements are guessed one-per-file, in movement/track order, preferring
 * each file's embedded movement-name tag (MVNM / MusicBrainz "movementname")
 * when present, else its title tag — e.g. "I. Adagio", "II. Largo". Falls
 * back to filename order when there's no number to sort by. */
export function guessMovementNames(files: ScanFileOut[]): (string | null)[] {
  return orderByMovementThenTrack(files).map((f) => f.tags.movementname?.trim() || f.tags.title?.trim() || null)
}

export function guessWorkTitle(files: ScanFileOut[]): string {
  return modeOf(files.map((f) => f.tags.album))
}

const CATALOGUE_SYSTEM_PATTERNS: [RegExp, string][] = [
  [/^BWV\b\.?/i, 'BWV'],
  [/^K\.?V?\.?\s*/i, 'K'],
  [/^Op\.?\s*/i, 'Op'],
  [/^Hob\.?\s*/i, 'Hob'],
  [/^WoO\b\.?/i, 'WoO'],
  [/^D\.?\s*/i, 'D'],
  [/^RV\b\.?/i, 'RV'],
  [/^Wq\.?\s*/i, 'Wq'],
  [/^Sz\.?\s*/i, 'Sz'],
  [/^TrV\b\.?/i, 'TrV'],
  [/^FP\b\.?/i, 'FP'],
]

/** Splits a raw catalognumber tag (e.g. "BWV 1046" or "K. 550") into a
 * recognized system + bare number where possible; otherwise keeps the whole
 * value as the number with a blank system for the user to fill in. */
export function guessCatalogueNumbers(files: ScanFileOut[]): ReviewCatalogueNumber[] {
  const raw = modeOf(files.map((f) => f.tags.catalognumber)).trim()
  if (!raw) return []
  for (const [pattern, system] of CATALOGUE_SYSTEM_PATTERNS) {
    if (pattern.test(raw)) {
      return [{ system, number: raw.replace(pattern, '').trim(), isPrimary: true }]
    }
  }
  return [{ system: '', number: raw, isPrimary: true }]
}

function guessRecordingYear(files: ScanFileOut[]): number | null {
  const raw = modeOf(files.map((f) => f.tags.originaldate)) || modeOf(files.map((f) => f.tags.date))
  const match = raw.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

/** Ensemble/conductor/performer/label/year guesses — all pre-filled but
 * fully editable, matching the same "suggestion, not commitment" behavior
 * as the composer/work guesses. Ensemble and performer names are left
 * unresolved to a library id (same as manual entry) since the backend
 * already get-or-creates by name at commit time. */
export function guessRecording(files: ScanFileOut[]): ReviewRecording {
  const performers: ReviewPerformer[] = []
  const conductor = modeOf(files.map((f) => f.tags.conductor))
  if (conductor) performers.push({ personId: null, name: conductor, role: 'conductor', instrument: '' })
  const performer = modeOf(files.map((f) => f.tags.performer))
  if (performer) performers.push({ personId: null, name: performer, role: 'performer', instrument: '' })

  return {
    ensembleId: null,
    ensembleName: modeOf(files.map((f) => f.tags.albumartist)),
    performers,
    label: modeOf(files.map((f) => f.tags.organization)),
    recordingYear: guessRecordingYear(files),
    releaseYear: null,
    notes: '',
    isDefaultInLibrary: false,
  }
}

export function tracksFromFiles(files: ScanFileOut[]): ReviewTrack[] {
  return files.map((file) => ({
    file,
    trackNumber: parseLeadingInt(file.tags.tracknumber),
    discNumber: parseLeadingInt(file.tags.discnumber),
    movementNumbers: [],
  }))
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Classical tagging very commonly abbreviates given names ("W.A. Mozart",
 * "J.S. Bach"), which plain exact-match misses entirely. Requires an exact
 * surname match, then accepts either side's given-name blob as the other
 * side's initials — handles the abbreviation running either direction. */
export function namesLikelyMatch(tagName: string, candidateName: string): boolean {
  const a = normalizeName(tagName).split(' ').filter(Boolean)
  const b = normalizeName(candidateName).split(' ').filter(Boolean)
  if (a.length === 0 || b.length === 0) return false
  if (a.join(' ') === b.join(' ')) return true
  if (a[a.length - 1] !== b[b.length - 1]) return false

  const aGiven = a.slice(0, -1)
  const bGiven = b.slice(0, -1)
  const aBlob = aGiven.join('')
  const bBlob = bGiven.join('')
  const aInitials = aGiven.map((w) => w[0]).join('')
  const bInitials = bGiven.map((w) => w[0]).join('')

  return aBlob === bBlob || aBlob === bInitials || bBlob === aInitials
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Album tags are often a shorter or looser version of the true work title
 * (e.g. missing the ", Op. 67" suffix Open Opus includes), so a plain
 * substring match catches far more real matches than exact equality. */
export function titlesLikelyMatch(tagTitle: string, candidateTitle: string): boolean {
  const a = normalizeTitle(tagTitle)
  const b = normalizeTitle(candidateTitle)
  if (!a) return false
  return a === b || b.startsWith(a) || a.startsWith(b)
}
