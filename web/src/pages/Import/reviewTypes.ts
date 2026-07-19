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

export function newManualWork(title: string, movementCount: number): ReviewWork {
  return {
    id: null,
    title,
    subtitle: '',
    key: '',
    form: '',
    category: '',
    composedYear: null,
    catalogueNumbers: [],
    movements: Array.from({ length: Math.max(movementCount, 1) }, (_, i) => ({
      movementNumber: i + 1,
      name: null,
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
