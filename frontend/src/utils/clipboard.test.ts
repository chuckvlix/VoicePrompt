import { describe, expect, it, mock } from 'bun:test'
import { copyToClipboard } from './clipboard'

describe('copyToClipboard utility', () => {
  it('returns false for empty text', async () => {
    const res = await copyToClipboard('')
    expect(res).toBe(false)
  })

  it('uses navigator.clipboard.writeText when available', async () => {
    let copiedText = ''
    const originalNavigator = globalThis.navigator
    globalThis.navigator = {
      clipboard: {
        writeText: mock((text: string) => {
          copiedText = text
          return Promise.resolve()
        }),
      },
    } as unknown as Navigator

    const res = await copyToClipboard('texto de prueba')
    expect(res).toBe(true)
    expect(copiedText).toBe('texto de prueba')

    globalThis.navigator = originalNavigator
  })
})
