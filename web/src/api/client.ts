import type {
  ComposerListItem,
  ComposerListResponse,
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

export function search(query: string): Promise<SearchResponse> {
  return get(`/search?q=${encodeURIComponent(query)}`)
}

export function trackStreamUrl(trackId: number): string {
  return `${API_ROOT}/tracks/${trackId}/stream`
}
