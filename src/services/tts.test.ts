/**
 * Model-voice playback settings.
 *
 * `SpeechSynthesisUtterance` defaults every unset field to a neutral value —
 * volume included, where neutral means maximum. These tests pin the settings
 * the learner actually hears, so dropping one goes back to a silent default
 * rather than an obvious break.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MODEL_VOICE_VOLUME, speak } from './tts'

/** Whatever was handed to the synthesis engine during a test. */
let spoken: FakeUtterance[] = []

class FakeUtterance {
  voice: unknown = null
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null

  constructor(public text: string) {}
}

beforeEach(() => {
  spoken = []

  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('window', {
    speechSynthesis: {
      // No voices, so the code falls back to its defaults rather than to
      // whatever the machine running the tests happens to have installed.
      getVoices: () => [],
      cancel: () => {},
      addEventListener: () => {},
      speak: (utterance: FakeUtterance) => {
        spoken.push(utterance)
        utterance.onend?.()
      },
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('speak', () => {
  it('plays below full volume', async () => {
    await speak('I usually go to work by train.')

    expect(spoken[0].volume).toBe(MODEL_VOICE_VOLUME)
    expect(MODEL_VOICE_VOLUME).toBeLessThan(1)
  })

  it('sits at the midpoint, not just under the maximum', async () => {
    expect(MODEL_VOICE_VOLUME).toBe(0.5)
  })

  it('uses the same volume at either speaking rate', async () => {
    await speak('Listen carefully.', 'normal')
    await speak('Listen carefully.', 'slow')

    expect(spoken.map((utterance) => utterance.volume)).toEqual([
      MODEL_VOICE_VOLUME,
      MODEL_VOICE_VOLUME,
    ])
    expect(spoken[0].rate).toBeGreaterThan(spoken[1].rate)
  })
})
