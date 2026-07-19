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

export async function updateRecording(recordingId: number, payload: RecordingUpdatePayload): Promise<RecordingListItem> {
  const resp = await fetch(`${API_ROOT}/recordings/${recordingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) {
    let detail = resp.statusText
    try {
      detail = (await resp.json()).detail || detail
    } catch {
      // non-JSON error body
    }
    throw new Error(detail)
  }
  return resp.json() as Promise<RecordingListItem>
}

export function search(query: string): Promise<SearchResponse> {
  return get(`/search?q=${encodeURIComponent(query)}`)
}

export function trackStreamUrl(trackId: number): string {
  return `${API_ROOT}/tracks/${trackId}/stream`
}
