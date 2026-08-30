/**
 * Transcript accumulation and the recording budget.
 *
 * The accumulation tests exist because of a real bug: on Android Chrome the
 * recognizer re-delivers earlier results with `resultIndex` back at 0. The
 * original code appended from `resultIndex`, so a whole sentence was counted
 * twice — the comparison engine saw a run of extra words and the score
 * collapsed on exactly the paragraphs the feature was added for.
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_RECORDING_MS,
  MIN_RECORDING_MS,
  collectSessionTranscript,
  recordingBudgetMs,
  type RecognitionResultLike,
} from './useSpeechRecorder'
import { analyzeText } from '../services/api'

/** One final result, as the recognizer would report it. */
const final = (transcript: string, confidence = 0.9): RecognitionResultLike => ({
  isFinal: true,
  0: { transcript, confidence },
})

/** One in-progress result. */
const interim = (transcript: string): RecognitionResultLike => ({
  isFinal: false,
  0: { transcript, confidence: 0 },
})

const SENTENCE_ONE = 'I usually go to work by train'
const SENTENCE_TWO = 'The journey takes about forty minutes'

describe('collectSessionTranscript', () => {
  it('reads a single final result', () => {
    const { final: text } = collectSessionTranscript([final(SENTENCE_ONE)])
    expect(text.trim()).toBe(SENTENCE_ONE)
  })

  it('joins several final results in order', () => {
    const { final: text } = collectSessionTranscript([final(SENTENCE_ONE), final(SENTENCE_TWO)])
    expect(text.trim()).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
  })

  it('keeps interim text separate from the final transcript', () => {
    const result = collectSessionTranscript([final(SENTENCE_ONE), interim('the jour')])

    expect(result.final.trim()).toBe(SENTENCE_ONE)
    expect(result.interim).toBe('the jour')
  })

  it('is idempotent, so a re-delivered result list cannot duplicate text', () => {
    // Android Chrome emits the cumulative list again with resultIndex at 0.
    const results = [final(SENTENCE_ONE), final(SENTENCE_TWO)]

    const first = collectSessionTranscript(results)
    const second = collectSessionTranscript(results)

    expect(second.final).toBe(first.final)
    expect(second.final.trim()).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
  })

  it('does not duplicate when the list grows across events', () => {
    // Event 1 carries one sentence, event 2 carries both. Replacing the
    // session transcript each time gives the right answer; appending would
    // have produced sentence one twice.
    const event1 = collectSessionTranscript([final(SENTENCE_ONE)])
    const event2 = collectSessionTranscript([final(SENTENCE_ONE), final(SENTENCE_TWO)])

    expect(event1.final.trim()).toBe(SENTENCE_ONE)
    expect(event2.final.trim()).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
    expect(event2.final.match(/usually/g)).toHaveLength(1)
  })

  it('collects confidence only from final results', () => {
    const { confidences } = collectSessionTranscript([
      final(SENTENCE_ONE, 0.8),
      final(SENTENCE_TWO, 0.6),
      interim('and'),
    ])

    expect(confidences).toEqual([0.8, 0.6])
  })

  it('returns empty values for an empty result list', () => {
    expect(collectSessionTranscript([])).toEqual({ final: '', interim: '', confidences: [] })
  })
})

describe('the duplication bug, end to end', () => {
  const target = 'I usually go to work by train. The journey takes about forty minutes.'

  it('scores a clean transcript perfectly', () => {
    expect(analyzeText(target, `${SENTENCE_ONE} ${SENTENCE_TWO}`).score).toBe(100)
  })

  it('shows why duplication had to be fixed', () => {
    // What the old append-based code produced from the Android delivery
    // pattern: the first sentence counted twice.
    const duplicated = `${SENTENCE_ONE} ${SENTENCE_ONE} ${SENTENCE_TWO}`
    const result = analyzeText(target, duplicated)

    expect(result.score).toBeLessThan(80)
    expect(result.words.filter((word) => word.status === 'extra').length).toBeGreaterThan(0)
  })
})

describe('recordingBudgetMs', () => {
  it('gives a short sentence the floor', () => {
    expect(recordingBudgetMs(3)).toBe(MIN_RECORDING_MS)
  })

  it('scales with the length of the passage', () => {
    // 4s lead plus 0.7s per word.
    expect(recordingBudgetMs(21)).toBe(4_000 + 21 * 700)
    expect(recordingBudgetMs(39)).toBe(4_000 + 39 * 700)
  })

  it('never exceeds the ceiling', () => {
    expect(recordingBudgetMs(500)).toBe(MAX_RECORDING_MS)
  })

  it('grows with word count', () => {
    expect(recordingBudgetMs(40)).toBeGreaterThan(recordingBudgetMs(20))
  })
})
