import apiClient from './client'

export type RecordingStatus =
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'summarizing'
  | 'summarized'
  | 'error'

export interface Recording {
  id: number
  user_id: number
  title: string | null
  file_path: string
  original_filename: string
  duration: number | null
  transcript_text: string | null
  summary_text: string | null
  status: RecordingStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface RecordingListItem {
  id: number
  user_id: number
  title: string | null
  original_filename: string
  duration: number | null
  status: RecordingStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface RecordingListPage {
  items: RecordingListItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export async function listRecordings(page = 1, pageSize = 20): Promise<RecordingListPage> {
  const response = await apiClient.get<RecordingListPage>('/recordings', {
    params: { page, page_size: pageSize },
  })
  return response.data
}

export async function getRecording(id: number): Promise<Recording> {
  const response = await apiClient.get<Recording>(`/recordings/${id}`)
  return response.data
}

export async function uploadRecording(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<Recording> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<Recording>('/recordings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    },
  })
  return response.data
}

export async function updateRecording(
  id: number,
  data: { title?: string },
): Promise<Recording> {
  const response = await apiClient.patch<Recording>(`/recordings/${id}`, data)
  return response.data
}

export async function deleteRecording(id: number): Promise<void> {
  await apiClient.delete(`/recordings/${id}`)
}

export async function requestSummary(id: number): Promise<Recording> {
  const response = await apiClient.post<Recording>(`/recordings/${id}/summarize`)
  return response.data
}

export async function downloadSummary(id: number): Promise<void> {
  const response = await apiClient.get(`/recordings/${id}/summary/download`, {
    responseType: 'blob',
  })

  // Extract filename from Content-Disposition header or fallback
  const disposition = response.headers['content-disposition'] as string | undefined
  let filename = `summary_${id}.md`
  if (disposition) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '')
    }
  }

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
