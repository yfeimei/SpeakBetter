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
  mergeTranscripts,
  pickAlternative,
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

  it('does not repeat an utterance the recognizer restates a word at a time', () => {
    // The Samsung Android report: every final result restates the whole
    // utterance so far, so joining them gave "I I usually I usually go ...".
    const { final: text } = collectSessionTranscript([
      final('I'),
      final('I usually'),
      final('I usually go'),
      final('I usually go to work'),
      final(SENTENCE_ONE),
    ])

    expect(text.trim()).toBe(SENTENCE_ONE)
  })

  it('keeps a restated utterance separate from the sentence that follows it', () => {
    const { final: text } = collectSessionTranscript([
      final('I usually'),
      final(SENTENCE_ONE),
      final(SENTENCE_TWO),
    ])

    expect(text.trim()).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
  })

  it('keeps repetition the learner actually spoke', () => {
    // Two attempts at the same opening is a real thing to say, and the shared
    // words are a prefix of neither whole, so both must survive.
    const { final: text } = collectSessionTranscript([
      final('I usually go to work by bus'),
      final(SENTENCE_ONE),
    ])

    expect(text.trim()).toBe(`I usually go to work by bus ${SENTENCE_ONE}`)
  })

  it('collapses a restated interim rather than running the words together', () => {
    const { interim: text } = collectSessionTranscript([
      interim('I usually'),
      interim('I usually go'),
    ])

    expect(text).toBe('I usually go')
  })

  it('scores a restatement once, not once per delivery', () => {
    const { confidences } = collectSessionTranscript([
      final('I usually', 0.4),
      final(SENTENCE_ONE, 0.9),
      final(SENTENCE_TWO, 0.6),
    ])

    expect(confidences).toEqual([0.9, 0.6])
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

/**
 * Chrome orders its candidates for open dictation, not for reading aloud. Given
 * the target text the better candidate is often the second or third one, and
 * taking the first blindly cost the speaker marks for a transcription choice
 * they had no control over.
 */
describe('pickAlternative', () => {
  /** One final result carrying several candidate transcripts. */
  const alternatives = (...transcripts: string[]): RecognitionResultLike => {
    const result: Record<number, { transcript: string; confidence: number }> = {}
    transcripts.forEach((transcript, index) => {
      // Chrome scores only its first choice; the rest come back at zero.
      result[index] = { transcript, confidence: index === 0 ? 0.9 : 0 }
    })
    return { isFinal: true, length: transcripts.length, ...result }
  }

  const counts = (text: string) => {
    const map = new Map<string, number>()
    for (const word of text.toLowerCase().split(/\s+/)) map.set(word, (map.get(word) ?? 0) + 1)
    return map
  }

  it('takes the recognizer first choice when there is no target', () => {
    const picked = pickAlternative(alternatives('the rural jury', 'the rural juror'), null)
    expect(picked?.transcript).toBe('the rural jury')
  })

  it('prefers the candidate that matches the target', () => {
    const picked = pickAlternative(
      alternatives('the rural jury', 'the rural juror'),
      counts('the rural juror thought'),
    )
    expect(picked?.transcript).toBe('the rural juror')
  })

  it('keeps the recognizer ordering when candidates fit equally well', () => {
    const picked = pickAlternative(
      alternatives('the whole trial', 'the whole trial'),
      counts('the whole trial was ridiculous'),
    )
    expect(picked?.transcript).toBe('the whole trial')
  })

  it('does not reward a candidate for repeating one target word', () => {
    const picked = pickAlternative(
      alternatives('the the the the', 'the twelfth contradiction'),
      counts('the twelfth contradiction to arrive'),
    )
    expect(picked?.transcript).toBe('the twelfth contradiction')
  })

  it('borrows the first choice confidence when a runner-up wins', () => {
    const picked = pickAlternative(
      alternatives('the rural jury', 'the rural juror'),
      counts('the rural juror thought'),
    )
    expect(picked?.confidence).toBe(0.9)
  })

  it('reads a single-alternative result unchanged', () => {
    expect(pickAlternative(final(SENTENCE_ONE), counts(SENTENCE_ONE))?.transcript).toBe(
      SENTENCE_ONE,
    )
  })

  it('chooses per result, so a passage can take one from each', () => {
    const { final: text } = collectSessionTranscript(
      [
        alternatives('the rural jury', 'the rural juror'),
        alternatives('was radicals', 'was ridiculous'),
      ],
      'the rural juror thought the whole trial was ridiculous',
    )

    expect(text.trim()).toBe('the rural juror was ridiculous')
  })
})

describe('mergeTranscripts', () => {
  it('carries on across a restarted session', () => {
    // The ordinary continuous-mode case: the recognizer stopped after the
    // first sentence and the next session picked up from there.
    const merged = mergeTranscripts(`${SENTENCE_ONE} `, SENTENCE_TWO)

    expect(merged.text).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
    expect(merged.keep).toBe('both')
  })

  it('absorbs a restarted session that restates the passage so far', () => {
    const merged = mergeTranscripts(`${SENTENCE_ONE} `, `${SENTENCE_ONE} ${SENTENCE_TWO}`)

    expect(merged.text).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
    expect(merged.keep).toBe('incoming')
  })

  it('drops a session that only repeats what is already committed', () => {
    const merged = mergeTranscripts(`${SENTENCE_ONE} ${SENTENCE_TWO}`, SENTENCE_ONE)

    expect(merged.text).toBe(`${SENTENCE_ONE} ${SENTENCE_TWO}`)
    expect(merged.keep).toBe('committed')
  })

  it('ignores punctuation and casing when comparing', () => {
    const merged = mergeTranscripts('I usually go,', 'i usually go to work by train')

    expect(merged.text).toBe('i usually go to work by train')
  })

  it('handles either side being empty', () => {
    expect(mergeTranscripts('', SENTENCE_ONE)).toEqual({ text: SENTENCE_ONE, keep: 'incoming' })
    expect(mergeTranscripts(SENTENCE_ONE, '')).toEqual({ text: SENTENCE_ONE, keep: 'committed' })
  })
})

describe('the duplication bug, end to end', () => {
  const target = 'I usually go to work by train. The journey takes about forty minutes.'

  it('scores a clean transcript perfectly', () => {
    expect(analyzeText(target, `${SENTENCE_ONE} ${SENTENCE_TWO}`).score).toBe(100)
  })

  it('scores the Android delivery pattern as if it had arrived once', () => {
    const results = [
      final('I'),
      final('I usually'),
      final('I usually go'),
      final(SENTENCE_ONE),
      final(`${SENTENCE_ONE} ${SENTENCE_TWO}`),
    ]

    expect(analyzeText(target, collectSessionTranscript(results).final).score).toBe(100)
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
    // 6s lead plus 1.2s per word.
    expect(recordingBudgetMs(21)).toBe(6_000 + 21 * 1_200)
    expect(recordingBudgetMs(39)).toBe(6_000 + 39 * 1_200)
  })

  it('gives a long passage room a learner can actually use', () => {
    // The 36-word paragraph that ran out at 29s under the old 4s + 0.7s/word.
    expect(recordingBudgetMs(36)).toBeGreaterThan(45_000)
  })

  it('allows up to three minutes', () => {
    expect(MAX_RECORDING_MS).toBe(180_000)
    expect(recordingBudgetMs(145)).toBe(MAX_RECORDING_MS)
  })

  it('never exceeds the ceiling', () => {
    expect(recordingBudgetMs(500)).toBe(MAX_RECORDING_MS)
  })

  it('grows with word count', () => {
    expect(recordingBudgetMs(40)).toBeGreaterThan(recordingBudgetMs(20))
  })
})
