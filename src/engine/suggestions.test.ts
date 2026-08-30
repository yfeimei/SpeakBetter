import { describe, expect, it } from 'vitest'
import { buildSuggestions, wordsPerMinute } from './suggestions'
import { compare } from './comparison'
import { analyzeText, validateCustomSentence } from '../services/api'

describe('wordsPerMinute', () => {
  it('computes a rate once the non-speech overhead is discounted', () => {
    // 6 words in 4.2s, less 1.2s overhead = 6 words in 3s = 120 wpm
    expect(wordsPerMinute(6, 4200)).toBe(120)
  })

  it('declines to guess without a usable duration', () => {
    expect(wordsPerMinute(6, undefined)).toBeNull()
    expect(wordsPerMinute(6, 300)).toBeNull()
    expect(wordsPerMinute(0, 5000)).toBeNull()
  })

  it('declines to judge a short sentence, where overhead dominates', () => {
    // "I like coffee" in 3 seconds is perfectly normal, but a naive
    // calculation would call it 60 wpm and wrongly nag the learner.
    expect(wordsPerMinute(3, 3000)).toBeNull()
  })
})

describe('buildSuggestions', () => {
  const sentence = 'I think this is a good idea.'
  const perfect = compare(sentence, 'i think this is a good idea')

  it('always returns at least one suggestion, even for a perfect score', () => {
    expect(perfect.score).toBe(100)
    expect(buildSuggestions(sentence, perfect).length).toBeGreaterThan(0)
  })

  it('never returns more than three', () => {
    const suggestions = buildSuggestions(sentence, perfect, {
      durationMs: 30_000,
      confidence: 0.4,
    })
    expect(suggestions.length).toBeLessThanOrEqual(3)
  })

  it('flags a very slow reading', () => {
    // 7 words in 30 seconds = 14 wpm
    const suggestions = buildSuggestions(sentence, perfect, { durationMs: 30_000 })
    expect(suggestions.some((s) => s.kind === 'pace' && /faster/i.test(s.title))).toBe(true)
  })

  it('flags a rushed reading', () => {
    // 7 words in 2.7s, less overhead = 7 words in 1.5s = 280 wpm
    const suggestions = buildSuggestions(sentence, perfect, { durationMs: 2700 })
    expect(suggestions.some((s) => s.kind === 'pace' && /slow down/i.test(s.title))).toBe(true)
  })

  it('says nothing about pace at a normal speed', () => {
    // 7 words in 4.7s, less overhead = 7 words in 3.5s = 120 wpm
    const suggestions = buildSuggestions(sentence, perfect, { durationMs: 4700 })
    expect(suggestions.some((s) => s.kind === 'pace')).toBe(false)
  })

  it('says nothing about pace on a short sentence', () => {
    const short = 'I like coffee.'
    const suggestions = buildSuggestions(short, compare(short, 'i like coffee'), {
      durationMs: 3000,
    })
    expect(suggestions.some((s) => s.kind === 'pace')).toBe(false)
  })

  it('suggests clearer articulation when the recognizer was unsure', () => {
    const suggestions = buildSuggestions(sentence, perfect, { confidence: 0.4 })
    expect(suggestions.some((s) => s.kind === 'clarity' && /speak up/i.test(s.title))).toBe(true)
  })

  it('ignores confidence the browser did not report', () => {
    // Chrome sometimes returns 0, which means "unknown", not "very poor".
    const suggestions = buildSuggestions(sentence, perfect, { confidence: 0 })
    expect(suggestions.some((s) => s.kind === 'clarity')).toBe(false)
  })

  it('points at a rule-backed word that was spoken correctly', () => {
    const suggestions = buildSuggestions(sentence, perfect)
    const sound = suggestions.find((s) => s.kind === 'sound')

    expect(sound).toBeDefined()
    // "think" and "this" both have rules; either is a valid thing to polish.
    expect(sound?.title).toMatch(/think|this/)
  })

  it('does not re-raise a word that already produced a coaching tip', () => {
    const withError = compare(sentence, 'i tink this is a good idea')
    const suggestions = buildSuggestions(sentence, withError)

    // "think" was the error, so the polish suggestion must pick something else.
    expect(suggestions.some((s) => s.kind === 'sound' && s.title.includes('"think"'))).toBe(false)
  })

  it('suggests a harder exercise once the sentence is mastered', () => {
    const suggestions = buildSuggestions('I like coffee.', compare('I like coffee.', 'i like coffee'))
    expect(suggestions.some((s) => s.kind === 'challenge')).toBe(true)
  })

  it('suggests linking words on a long sentence read well', () => {
    const long = 'I have been working on this project for several months.'
    const suggestions = buildSuggestions(long, compare(long, long))
    expect(suggestions.some((s) => s.kind === 'fluency')).toBe(true)
  })
})

describe('analyzeText — custom sentences', () => {
  it('analyzes any sentence, not just ones from the library', () => {
    const result = analyzeText('The quick brown fox jumps.', 'the quick brown fox jumps')

    expect(result.score).toBe(100)
    expect(result.expected).toBe('The quick brown fox jumps.')
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('scores a custom sentence the same way as a library one', () => {
    // Five words, one mispronounced: 4/5.
    const result = analyzeText('I think it is right.', 'i tink it is right')

    expect(result.score).toBe(80)
    expect(result.words[1]).toMatchObject({ word: 'think', spoken: 'tink', status: 'problem' })
  })

  it('handles a multi-sentence paragraph', () => {
    const paragraph =
      'I usually go to work by train. The journey takes about forty minutes, so I read a book on the way.'
    const heard =
      'I usually go to work by train the journey takes about forty minutes so I read a book on the way'

    // Punctuation is normalized away, so the paragraph matches exactly.
    expect(analyzeText(paragraph, heard).score).toBe(100)
  })

  it('keeps a paragraph score meaningful when several words are missed', () => {
    const paragraph =
      'I usually go to work by train. The journey takes about forty minutes, so I read a book on the way.'
    const heard = 'I usually go to work by train the journey takes forty minutes so I read a book'

    const result = analyzeText(paragraph, heard)

    // Four words missed out of twenty-two. Under fixed penalties this would
    // have been 60; proportionally it is a good reading.
    expect(result.score).toBeGreaterThan(75)
    expect(result.score).toBeLessThan(90)
  })

  it('rejects an empty transcript', () => {
    expect(() => analyzeText('Some sentence.', '  ')).toThrow()
  })
})

describe('validateCustomSentence', () => {
  it('accepts a normal sentence and tidies the whitespace', () => {
    expect(validateCustomSentence('  I   like  coffee.  ')).toEqual({
      ok: true,
      text: 'I like coffee.',
    })
  })

  it('rejects an empty sentence', () => {
    const result = validateCustomSentence('   ')
    expect(result.ok).toBe(false)
  })

  it('rejects a sentence with no letters', () => {
    const result = validateCustomSentence('123 !!! ???')
    expect(result.ok).toBe(false)
  })

  it('accepts a paragraph', () => {
    const paragraph =
      'I have been working on this project for several months. Although the results are encouraging, there is still a great deal to do.'
    expect(validateCustomSentence(paragraph).ok).toBe(true)
  })

  it('accepts a passage that fills the three-minute recording budget', () => {
    // ~145 words is what the budget covers; this has to stay inside the limit.
    expect(validateCustomSentence('word '.repeat(145)).ok).toBe(true)
  })

  it('rejects something too long to say in one recording', () => {
    const result = validateCustomSentence('word '.repeat(250))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/1000 characters/)
  })
})
