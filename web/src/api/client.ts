import type {
  ComposerListItem,
  ComposerListResponse,
  RecordingListItem,
  RecordingListResponse,
  SearchResponse,
  WorkDetail,
  WorkListResponse,
} from './types'

const API_ROOT = '/api/v1'

async function get<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_ROOT}${path}`)
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} — ${path}`)
  }
  return resp.json() as Promise<T>
}

async function throwForStatus(resp: Response): Promise<never> {
  let detail = resp.statusText
  try {
    detail = (await resp.json()).detail || detail
  } catch {
    // non-JSON error body
  }
  throw new Error(detail)
}

async function put<T>(path: string, payload: unknown): Promise<T> {
  const resp = await fetch(`${API_ROOT}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) return throwForStatus(resp)
  return resp.json() as Promise<T>
}

async function putForm<T>(path: string, body: FormData): Promise<T> {
  const resp = await fetch(`${API_ROOT}${path}`, { method: 'PUT', body })
  if (!resp.ok) return throwForStatus(resp)
  return resp.json() as Promise<T>
}

async function del<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_ROOT}${path}`, { method: 'DELETE' })
  if (!resp.ok) return throwForStatus(resp)
  return resp.json() as Promise<T>
}

export function getComposers(): Promise<ComposerListResponse> {
  return get('/composers')
}

export function getComposer(composerId: number): Promise<ComposerListItem> {
  return get(`/composers/${composerId}`)
}

export function getComposerWorks(composerId: number): Promise<WorkListResponse> {
  return get(`/composers/${composerId}/works`)
}

export function getWork(workId: number): Promise<WorkDetail> {
  return get(`/works/${workId}`)
}

export function getWorkRecordings(workId: number): Promise<RecordingListResponse> {
  return get(`/works/${workId}/recordings`)
}

export async function deleteWork(workId: number): Promise<void> {
  const resp = await fetch(`${API_ROOT}/works/${workId}`, { method: 'DELETE' })
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText} — /works/${workId}`)
  }
}

export interface RecordingUpdatePayload {
  ensemble_id: number | null
  ensemble_name: string | null
  label: string | null
  recording_year: number | null
  release_year: number | null
  notes: string | null
  is_default_in_library: boolean
  performers: {
    person_id: number | null
    name: string | null
    sort_name: string | null
    role: string
    instrument: string | null
    credited_order: number | null
  }[]
}

export function updateRecording(recordingId: number, payload: RecordingUpdatePayload): Promise<RecordingListItem> {
  return put(`/recordings/${recordingId}`, payload)
}

export interface WorkUpdatePayload {
  title: string
  subtitle: string | null
  key: string | null
  form: string | null
  category: string | null
  composed_year: number | null
  composed_year_uncertain: boolean
  composed_year_range_end: number | null
  catalogue_numbers: { system: string; number: string; is_primary: boolean }[]
}

export function updateWork(workId: number, payload: WorkUpdatePayload): Promise<WorkDetail> {
  return put(`/works/${workId}`, payload)
}

export interface ComposerUpdatePayload {
  name: string
  sort_name: string | null
  birth_year: number | null
  death_year: number | null
  period: string | null
}

export function updateComposer(composerId: number, payload: ComposerUpdatePayload): Promise<ComposerListItem> {
  return put(`/composers/${composerId}`, payload)
}

export function uploadComposerImage(composerId: number, file: File): Promise<ComposerListItem> {
  const formData = new FormData()
  formData.append('file', file)
  return putForm(`/composers/${composerId}/image`, formData)
}

export function deleteComposerImage(composerId: number): Promise<ComposerListItem> {
  return del(`/composers/${composerId}/image`)
}

export function search(query: string): Promise<SearchResponse> {
  return get(`/search?q=${encodeURIComponent(query)}`)
}

export function trackStreamUrl(trackId: number): string {
  return `${API_ROOT}/tracks/${trackId}/stream`
}
