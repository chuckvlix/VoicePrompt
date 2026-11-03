import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  checkBackendHealth,
  deleteHistoryItem,
  fetchHistory,
  improveText,
  saveHistoryItem,
  transcribeAudio,
} from './api'

describe('API service suite', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('checkBackendHealth returns true when response is ok', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))
    ) as unknown as typeof fetch

    const healthy = await checkBackendHealth()
    expect(healthy).toBe(true)
  })

  it('checkBackendHealth returns false on network error', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Network offline'))) as unknown as typeof fetch

    const healthy = await checkBackendHealth()
    expect(healthy).toBe(false)
  })

  it('transcribeAudio maps audio/mp4 to .m4a filename for Safari compatibility', async () => {
    let capturedBody: FormData | null = null

    globalThis.fetch = mock((_, init) => {
      capturedBody = init?.body as FormData
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'audio transcrito', duration: 1.5 }), { status: 200 })
      )
    }) as unknown as typeof fetch

    const mp4Blob = new Blob(['dummy audio bytes'], { type: 'audio/mp4;codecs=mp4a.40.2' })
    const res = await transcribeAudio(mp4Blob)
    expect(res.text).toBe('audio transcrito')
    expect(res.duration).toBe(1.5)

    expect(capturedBody).not.toBeNull()
    const file = (capturedBody as unknown as FormData).get('file') as File
    expect(file).toBeDefined()
    expect(file.name).toBe('recording.m4a')
  })

  it('transcribeAudio maps audio/wav to .wav filename', async () => {
    let capturedBody: FormData | null = null

    globalThis.fetch = mock((_, init) => {
      capturedBody = init?.body as FormData
      return Promise.resolve(
        new Response(JSON.stringify({ text: 'wav transcrito', duration: 2.0 }), { status: 200 })
      )
    }) as unknown as typeof fetch

    const wavBlob = new Blob(['dummy wav bytes'], { type: 'audio/wav' })
    const res = await transcribeAudio(wavBlob)
    expect(res.text).toBe('wav transcrito')

    const file = (capturedBody as unknown as FormData).get('file') as File
    expect(file.name).toBe('recording.wav')
  })

  it('improveText sends expected JSON payload and returns response', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ improved_text: 'Texto formal mejorado', tone: 'formal' }),
          { status: 200 }
        )
      )
    ) as unknown as typeof fetch

    const res = await improveText('mira esto', 'formal')
    expect(res.improved_text).toBe('Texto formal mejorado')
    expect(res.tone).toBe('formal')
  })

  it('handles server errors with detail message', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ detail: 'Error específico de LM Studio' }), { status: 502 })
      )
    ) as unknown as typeof fetch

    expect(improveText('texto', 'neutral')).rejects.toThrow('Error específico de LM Studio')
  })

  it('saveHistoryItem sends payload and returns created item', async () => {
    const item = {
      id: 1,
      original_text: 'orig',
      improved_text: 'impr',
      tone: 'neutral',
      created_at: '2026-11-03T15:30:00Z',
    }

    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(item), { status: 201 }))
    ) as unknown as typeof fetch

    const res = await saveHistoryItem({ original_text: 'orig', improved_text: 'impr', tone: 'neutral' })
    expect(res.id).toBe(1)
    expect(res.created_at).toBe('2026-11-03T15:30:00Z')
  })

  it('fetchHistory returns items from backend', async () => {
    const items = [
      { id: 1, original_text: 'a', improved_text: 'b', tone: 'neutral', created_at: '2026-11-03T15:30:00Z' },
    ]
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(items), { status: 200 }))
    ) as unknown as typeof fetch

    const res = await fetchHistory()
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe(1)
  })

  it('deleteHistoryItem deletes item by id', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'Deleted', id: 5 }), { status: 200 }))
    ) as unknown as typeof fetch

    await expect(deleteHistoryItem(5)).resolves.toBeUndefined()
  })
})
