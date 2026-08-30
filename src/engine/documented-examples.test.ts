/**
 * The worked examples printed in the requirements and design document.
 *
 * These assert the exact numbers, wording, and word marks that the document
 * shows, so an engine change that would make the document wrong fails here
 * instead of silently leaving stale examples behind.
 *
 * Sentence-level examples use analyzeText with the sentence written out, not
 * an exercise id. Ids point at different content as the library evolves —
 * when Intermediate became paragraphs, id 15 stopped being the sentence these
 * examples were written around.
 */

import { describe, expect, it } from 'vitest'
import { analyzeSpeech, analyzeText } from '../services/api'
import { getExerciseById } from '../data/exercises'
import { lookupTip } from './coaching'

const DOC_SENTENCE = 'I think this is a good idea.'

const TH_TIP =
  'Put your tongue lightly between your teeth and let air flow through. Do not say "tink" or "sink".'

describe('section 6 — analysis result', () => {
  // Heard as "I tink this is good idea": one mispronounced, one missed.
  const result = analyzeText(DOC_SENTENCE, 'I tink this is good idea')

  it('scores 71: two errors across seven words', () => {
    expect(result.score).toBe(71)
  })

  it('marks the words exactly as the document shows', () => {
    expect(result.words.map((word) => `${word.word}:${word.status}`)).toEqual([
      'i:correct',
      'think:problem',
      'this:correct',
      'is:correct',
      'a:missing',
      'good:correct',
      'idea:correct',
    ])
  })

  it('produces the documented feedback lines', () => {
    expect(result.feedback).toEqual([
      'You missed "a".',
      'Your speech was slightly different around "think" — it sounded like "tink".',
    ])
  })

  it('offers the TH tip for "think" and no tip for the missing "a"', () => {
    expect(result.tips).toEqual([{ word: 'think', sound: 'TH', tip: TH_TIP }])
    expect(lookupTip('a')).toBeNull()
  })
})

describe('section 8 — normalized scoring', () => {
  it('scores the share of the passage that came through', () => {
    // Perfect.
    expect(analyzeSpeech(1, 'I like coffee').score).toBe(100)
    // One mispronounced word out of seven.
    expect(analyzeText(DOC_SENTENCE, 'I tink this is a good idea').score).toBe(86)
  })

  it('does not collapse a long passage to zero over a handful of slips', () => {
    const paragraph = getExerciseById(21)
    expect(paragraph).toBeDefined()

    const words = paragraph!.text.split(/\s+/)
    // Drop five words out of roughly forty.
    const heard = words.filter((_, index) => index % 8 !== 3).join(' ')

    const result = analyzeText(paragraph!.text, heard)
    expect(result.score).toBeGreaterThan(80)
  })
})

describe('section 18 — module interfaces', () => {
  it('returns the documented perfect result', () => {
    const result = analyzeSpeech(1, 'I like coffee')

    expect(result).toEqual({
      score: 100,
      expected: 'I like coffee.',
      recognized: 'I like coffee',
      words: [
        { word: 'i', status: 'correct' },
        { word: 'like', status: 'correct' },
        { word: 'coffee', status: 'correct' },
      ],
      feedback: ['Every word matched. Excellent speaking!'],
      tips: [],
      suggestions: [
        {
          kind: 'challenge',
          title: 'Ready for something harder',
          detail:
            'This sentence is not challenging you any more. Move up a level, or type a sentence of your own that you find difficult.',
        },
      ],
    })
  })

  it('still suggests something to work on after a perfect score', () => {
    const result = analyzeSpeech(1, 'I like coffee')

    expect(result.score).toBe(100)
    expect(result.tips).toEqual([])
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('returns the documented problem result', () => {
    const result = analyzeText(DOC_SENTENCE, 'I tink this is a good idea')

    expect(result.score).toBe(86)
    expect(result.expected).toBe(DOC_SENTENCE)
    expect(result.words[1]).toEqual({
      word: 'think',
      spoken: 'tink',
      status: 'problem',
      sound: 'TH',
      tip: TH_TIP,
    })
    expect(result.feedback).toEqual([
      'Your speech was slightly different around "think" — it sounded like "tink".',
    ])
    expect(result.tips).toHaveLength(1)
  })

  it('rejects an unknown exercise and an empty transcript', () => {
    expect(() => analyzeSpeech(9999, 'hello')).toThrow()
    expect(() => analyzeSpeech(1, '   ')).toThrow()
  })
})

describe('section 19 — alignment example', () => {
  it('reports one mispronounced word and six correct ones', () => {
    const result = analyzeText(DOC_SENTENCE, 'I tink this is a good idea')

    expect(result.words.filter((word) => word.status === 'correct')).toHaveLength(6)
    expect(result.words.filter((word) => word.status === 'problem')).toHaveLength(1)
  })
})

describe('section 9 — practice content', () => {
  it('gives Beginner single sentences and the higher levels paragraphs', () => {
    for (const exercise of [1, 5, 10].map(getExerciseById)) {
      expect(exercise!.text.split(/[.?!]\s/).length).toBe(1)
    }

    for (const exercise of [11, 15, 21, 30].map(getExerciseById)) {
      // More than one sentence, and long enough to be worth calling a paragraph.
      expect(exercise!.text.split(/[.?!]\s/).length).toBeGreaterThan(1)
      expect(exercise!.text.split(/\s+/).length).toBeGreaterThan(15)
    }
  })
})
