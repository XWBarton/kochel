export interface ScanFileOut {
  relative_path: string
  filename: string
  format: string
  duration_seconds: number
  bitrate_kbps: number | null
  sample_rate_hz: number | null
  channels: number | null
  file_size_bytes: number
  tags: Record<string, string | null>
}

export interface ScanGroupOut {
  relative_dir: string
  files: ScanFileOut[]
}

export interface ScanResponse {
  groups: ScanGroupOut[]
  total_files: number
}

export type UploadStatus = 'saved' | 'skipped' | 'rejected'

export interface UploadedFileResult {
  relative_path: string
  status: UploadStatus
  detail: string
  file_size_bytes: number | null
}

export interface UploadResponse {
  results: UploadedFileResult[]
  saved_count: number
  skipped_count: number
  rejected_count: number
}

export type SearchSource = 'library' | 'openopus'

export interface ComposerSearchResult {
  source: SearchSource
  id: number | null
  openopus_id: string | null
  name: string
  sort_name: string | null
  birth_year: number | null
  death_year: number | null
  period: string | null
}

export interface WorkSearchResult {
  source: SearchSource
  id: number | null
  title: string
  category: string | null
  movement_count: number | null
}

export interface EnsembleSearchResult {
  id: number
  name: string
}

export interface PersonSearchResult {
  id: number
  name: string
}

// ---- commit payload ----

export interface ImportCatalogueNumberIn {
  system: string
  number: string
  is_primary: boolean
}

export interface ImportMovementIn {
  movement_number: number
  name: string | null
}

export interface ImportComposerIn {
  id: number | null
  name: string | null
  sort_name: string | null
  birth_year: number | null
  death_year: number | null
  period: string | null
}

export interface ImportWorkIn {
  id: number | null
  title: string | null
  subtitle: string | null
  key: string | null
  form: string | null
  category: string | null
  composed_year: number | null
  composed_year_uncertain: boolean
  composed_year_range_end: number | null
  catalogue_numbers: ImportCatalogueNumberIn[]
  movements: ImportMovementIn[]
}

export type PerformerRole = 'conductor' | 'soloist' | 'performer'

export interface ImportPerformerIn {
  person_id: number | null
  name: string | null
  sort_name: string | null
  role: PerformerRole
  instrument: string | null
  credited_order: number | null
}

export interface ImportRecordingIn {
  ensemble_id: number | null
  ensemble_name: string | null
  label: string | null
  recording_year: number | null
  release_year: number | null
  notes: string | null
  is_default_in_library: boolean
  performers: ImportPerformerIn[]
}

export interface ImportTrackIn {
  relative_path: string
  track_number: number | null
  disc_number: number | null
  movement_numbers: number[]
}

export interface ImportCommitRequest {
  composer: ImportComposerIn
  work: ImportWorkIn
  recording: ImportRecordingIn
  tracks: ImportTrackIn[]
}

export interface ImportCommitResponse {
  composer_id: number
  work_id: number
  recording_id: number
  track_ids: number[]
}
