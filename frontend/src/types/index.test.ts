import { describe, expect, it } from 'bun:test'
import { TONE_DEFINITIONS } from './index'

describe('Tone definitions contract', () => {
  it('defines all 5 required tones with complete metadata', () => {
    const requiredTones = ['neutral', 'formal', 'concise', 'email', 'prompt'] as const
    const seenColors = new Set<string>()

    for (const tone of requiredTones) {
      const def = TONE_DEFINITIONS[tone]
      expect(def).toBeDefined()
      expect(def.id).toBe(tone)
      expect(def.label.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(0)
      expect(def.badgeColor.startsWith('#')).toBe(true)
      expect(def.badgeColor.length).toBe(7)
      seenColors.add(def.badgeColor)
    }

    // Every tone should have a distinct monochrome shade
    expect(seenColors.size).toBe(5)
  })
})
