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

export function emptyRecording(): ReviewRecording {
  return {
    ensembleId: null,
    ensembleName: '',
    performers: [],
    label: '',
    recordingYear: null,
    releaseYear: null,
    notes: '',
    isDefaultInLibrary: false,
  }
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

function parseLeadingInt(value: string | null | undefined): number | null {
  if (!value) return null
  const n = parseInt(value.split('/')[0]?.trim() ?? '', 10)
  return Number.isNaN(n) ? null : n
}

export function guessComposerName(files: ScanFileOut[]): string {
  const counts = new Map<string, number>()
  for (const f of files) {
    const name = f.tags.composer || f.tags.albumartist || f.tags.artist
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return best
}

/** Movements are guessed one-per-file, in track order, using each file's
 * embedded title tag — e.g. "I. Adagio", "II. Largo". Falls back to
 * filename order when there's no track-number tag to sort by. */
export function guessMovementNames(files: ScanFileOut[]): (string | null)[] {
  const ordered = [...files].sort((a, b) => {
    const ta = parseLeadingInt(a.tags.tracknumber)
    const tb = parseLeadingInt(b.tags.tracknumber)
    if (ta != null && tb != null) return ta - tb
    if (ta != null) return -1
    if (tb != null) return 1
    return a.filename.localeCompare(b.filename)
  })
  return ordered.map((f) => f.tags.title?.trim() || null)
}

export function guessWorkTitle(files: ScanFileOut[]): string {
  const counts = new Map<string, number>()
  for (const f of files) {
    if (f.tags.album) counts.set(f.tags.album, (counts.get(f.tags.album) ?? 0) + 1)
  }
  let best = ''
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return best
}

export function tracksFromFiles(files: ScanFileOut[]): ReviewTrack[] {
  return files.map((file) => ({
    file,
    trackNumber: parseLeadingInt(file.tags.tracknumber),
    discNumber: parseLeadingInt(file.tags.discnumber),
    movementNumbers: [],
  }))
}
