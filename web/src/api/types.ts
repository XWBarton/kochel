export interface ComposerListItem {
  id: number
  name: string
  sort_name: string
  birth_year: number | null
  death_year: number | null
  period: string | null
  work_count: number
  image_url: string | null
  image_focal_x: number
  image_focal_y: number
}

export interface ComposerListResponse {
  items: ComposerListItem[]
  total: number
}

export interface CatalogueNumberOut {
  system: string
  number: string
  is_primary: boolean
}

export interface WorkListItem {
  id: number
  title: string
  subtitle: string | null
  key: string | null
  form: string | null
  category: string | null
  composed_year: number | null
  composed_year_uncertain: boolean
  composed_year_range_end: number | null
  catalogue_numbers: CatalogueNumberOut[]
  movement_count: number
  recording_count: number
}

export interface WorkListResponse {
  items: WorkListItem[]
  total: number
}

export interface MovementOut {
  id: number
  movement_number: number
  name: string | null
}

export interface WorkDetail extends WorkListItem {
  composer_id: number
  composer_name: string
  movements: MovementOut[]
}

export interface PersonOut {
  id: number
  name: string
}

export interface EnsembleOut {
  id: number
  name: string
}

export type PerformerRole = 'conductor' | 'soloist' | 'performer'

export interface RecordingPerformerOut {
  person: PersonOut
  role: PerformerRole
  instrument: string | null
}

export interface TrackMovementOut {
  movement_id: number
  sequence: number
  start_seconds: number | null
  duration_seconds_override: number | null
}

export interface TrackOut {
  id: number
  track_number: number | null
  disc_number: number | null
  format: string
  duration_seconds: number
  movement_ids: number[]
  track_movements: TrackMovementOut[]
}

export interface RecordingListItem {
  id: number
  movement_id: number | null
  ensemble: EnsembleOut | null
  performers: RecordingPerformerOut[]
  label: string | null
  recording_year: number | null
  release_year: number | null
  notes: string | null
  is_default_in_library: boolean
  total_duration_seconds: number
  tracks: TrackOut[]
}

export interface RecordingListResponse {
  items: RecordingListItem[]
  total: number
}

export interface SearchComposerResult {
  id: number
  name: string
  birth_year: number | null
  death_year: number | null
  work_count: number
}

export interface SearchWorkResult {
  id: number
  title: string
  composer_id: number
  composer_name: string
}

export interface SearchRecordingResult {
  id: number
  work_id: number
  work_title: string
  composer_name: string
  ensemble_name: string | null
  conductor_name: string | null
  label: string | null
  recording_year: number | null
}

export interface SearchResponse {
  query: string
  composers: SearchComposerResult[]
  works: SearchWorkResult[]
  recordings: SearchRecordingResult[]
}
