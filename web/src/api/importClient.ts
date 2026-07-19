import type {
  ComposerSearchResult,
  EnsembleSearchResult,
  ImportCommitRequest,
  ImportCommitResponse,
  PersonSearchResult,
  ScanResponse,
  UploadResponse,
  WorkSearchResult,
} from './importTypes'

const IMPORT_ROOT = '/api/v1/import'

async function get<T>(path: string): Promise<T> {
  const resp = await fetch(`${IMPORT_ROOT}${path}`)
  if (!resp.ok) {
    let detail = resp.statusText
    try {
      detail = (await resp.json()).detail || detail
    } catch {
      // non-JSON error body — fall back to statusText
    }
    throw new Error(detail)
  }
  return resp.json() as Promise<T>
}

export function scanLibrary(): Promise<ScanResponse> {
  return get('/scan')
}

export function searchComposers(query: string): Promise<ComposerSearchResult[]> {
  return get(`/composers/search?q=${encodeURIComponent(query)}`)
}

export function searchWorks(composerId: number, query?: string): Promise<WorkSearchResult[]> {
  const q = query ? `&q=${encodeURIComponent(query)}` : ''
  return get(`/works/search?composer_id=${composerId}${q}`)
}

export function searchOpenOpusWorks(openopusComposerId: string, query?: string): Promise<WorkSearchResult[]> {
  const q = query ? `&q=${encodeURIComponent(query)}` : ''
  return get(`/openopus/works?openopus_composer_id=${encodeURIComponent(openopusComposerId)}${q}`)
}

export function searchEnsembles(query: string): Promise<EnsembleSearchResult[]> {
  return get(`/ensembles/search?q=${encodeURIComponent(query)}`)
}

export function searchPeople(query: string): Promise<PersonSearchResult[]> {
  return get(`/people/search?q=${encodeURIComponent(query)}`)
}

export async function commitImport(payload: ImportCommitRequest): Promise<ImportCommitResponse> {
  const resp = await fetch(`${IMPORT_ROOT}/commit`, {
    method: 'POST',
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
  return resp.json() as Promise<ImportCommitResponse>
}

/** relativePathFor: a File's webkitRelativePath when picked via a folder
 * input, else its bare name — the server writes each upload to exactly that
 * relative path under the library root. */
export function relativePathFor(file: File): string {
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
}

export function uploadFiles(files: File[], onProgress: (fraction: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file, relativePathFor(file))
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${IMPORT_ROOT}/upload`)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadResponse)
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText || xhr.status}`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed: network error')))
    xhr.send(formData)
  })
}
