import type {
  CreateHistoryPayload,
  HistoryItem,
  ImproveResponse,
  ToneOption,
  TranscriptionResponse,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Error del servidor (${res.status} ${res.statusText})`
    try {
      const errorJson = await res.json()
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail)
      }
    } catch {
      // Non-JSON error body fallback
    }
    throw new Error(errorMessage)
  }
  return res.json() as Promise<T>
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
  const formData = new FormData()
  // Provide file extension hint based on blob type
  const extension = audioBlob.type.includes('wav') ? 'wav' : 'webm'
  formData.append('file', audioBlob, `recording.${extension}`)

  const res = await fetch(`${BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  })

  return handleResponse<TranscriptionResponse>(res)
}

export async function improveText(text: string, tone: ToneOption): Promise<ImproveResponse> {
  const res = await fetch(`${BASE_URL}/api/improve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, tone }),
  })

  return handleResponse<ImproveResponse>(res)
}

export async function fetchHistory(): Promise<HistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/history`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  return handleResponse<HistoryItem[]>(res)
}

export async function saveHistoryItem(payload: CreateHistoryPayload): Promise<HistoryItem> {
  const res = await fetch(`${BASE_URL}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return handleResponse<HistoryItem>(res)
}

export async function deleteHistoryItem(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/history/${id}`, {
    method: 'DELETE',
  })

  await handleResponse<{ message: string; id: number }>(res)
}
