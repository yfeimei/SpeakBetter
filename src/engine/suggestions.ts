/**
 * Suggestion engine.
 *
 * The coaching engine explains what went wrong. This one answers a different
 * question: what should the learner work on next? It runs on every attempt,
 * including a perfect one, so a 100 still comes with something to try.
 *
 * Suggestions are built only from signals actually measured — the alignment,
 * the recording length, and the recognizer's own confidence. Nothing here
 * guesses at pronunciation quality.
 */

import { WORD_RULES } from '../data/pronunciationRules'
import { tokenize } from './normalize'
import type { ComparisonResult, SpeechMeta, Suggestion } from '../types'

/** At most this many suggestions, so the result card stays readable. */
const MAX_SUGGESTIONS = 3

/**
 * Pace thresholds in words per minute. These are deliberately wide, because
 * the measurement is approximate. Only clear extremes are worth commenting on.
 */
const WPM_VERY_SLOW = 75
const WPM_VERY_FAST = 190

/**
 * Recording time that is not speech: the moment between clicking Record and
 * starting to talk, plus the silence the recognizer waits through before it
 * decides the sentence has ended (roughly a second in Chrome).
 */
const RECORDING_OVERHEAD_MS = 1200

/**
 * Below this many words, the overhead above dominates the measurement and the
 * computed rate says more about reaction time than about speaking pace. Short
 * sentences simply do not get pace advice.
 */
const MIN_WORDS_FOR_PACE = 6

/** Recognizer confidence below this suggests unclear articulation. */
const CONFIDENCE_UNCLEAR = 0.7

/** A long sentence, for the purpose of suggesting word linking. */
const LONG_SENTENCE_WORDS = 9

/** Score at or above which the learner is ready for something harder. */
const READY_FOR_MORE = 95

/**
 * Approximate speaking rate, with the non-speech overhead discounted.
 *
 * Returns null whenever the estimate would not be trustworthy: no duration,
 * too few words, or nothing left once the overhead is removed.
 */
export function wordsPerMinute(wordCount: number, durationMs?: number): number | null {
  if (!durationMs || wordCount < MIN_WORDS_FOR_PACE) return null

  const speakingMs = durationMs - RECORDING_OVERHEAD_MS
  if (speakingMs < 500) return null

  return Math.round((wordCount / speakingMs) * 60_000)
}

/**
 * Pick a word in the sentence that has a coaching rule but was spoken
 * correctly — something to keep polishing rather than something that failed.
 */
function findPolishWord(expectedText: string, alreadyCovered: Set<string>): string | null {
  for (const word of tokenize(expectedText)) {
    if (WORD_RULES[word] && !alreadyCovered.has(word)) return word
  }
  return null
}

export function buildSuggestions(
  expectedText: string,
  comparison: ComparisonResult,
  meta: SpeechMeta = {},
): Suggestion[] {
  const suggestions: Suggestion[] = []

  // Words already explained by a coaching tip should not reappear here.
  const covered = new Set<string>([
    ...comparison.missing,
    ...comparison.mismatched.map((pair) => pair.expected),
  ])

  // --- Clarity, from the recognizer's own confidence ------------------------
  // Only meaningful when the browser actually reported a value.
  if (typeof meta.confidence === 'number' && meta.confidence > 0) {
    if (meta.confidence < CONFIDENCE_UNCLEAR) {
      suggestions.push({
        kind: 'clarity',
        title: 'Speak up a little',
        detail:
          'The recognizer was unsure of some words even where they matched. Try moving closer to the microphone and opening your mouth a little wider.',
      })
    } else if (comparison.score >= READY_FOR_MORE) {
      suggestions.push({
        kind: 'clarity',
        title: 'Very clear delivery',
        detail: 'Every word came through cleanly. Keep this level of articulation as you speed up.',
      })
    }
  }

  // --- Pace -----------------------------------------------------------------
  const wpm = wordsPerMinute(comparison.recognizedWordCount, meta.durationMs)
  if (wpm !== null) {
    if (wpm < WPM_VERY_SLOW) {
      suggestions.push({
        kind: 'pace',
        title: 'Try it a little faster',
        detail: `That was roughly ${wpm} words per minute. Careful reading is good for accuracy, but everyday English runs nearer 120. Try one more take at a natural speed.`,
      })
    } else if (wpm > WPM_VERY_FAST) {
      suggestions.push({
        kind: 'pace',
        title: 'Slow down slightly',
        detail: `That was roughly ${wpm} words per minute, which is quick. Slowing down gives each ending sound room to land.`,
      })
    }
  }

  // --- A sound worth polishing even though it was correct -------------------
  const polishWord = findPolishWord(expectedText, covered)
  if (polishWord) {
    const rule = WORD_RULES[polishWord]
    suggestions.push({
      kind: 'sound',
      title: `Keep an ear on "${polishWord}"`,
      detail: `You got it this time. ${rule.tip}`,
    })
  }

  // --- Fluency on longer sentences ------------------------------------------
  if (
    comparison.expectedWordCount >= LONG_SENTENCE_WORDS &&
    comparison.score >= READY_FOR_MORE &&
    suggestions.length < MAX_SUGGESTIONS
  ) {
    suggestions.push({
      kind: 'fluency',
      title: 'Link the words together',
      detail:
        'The words are all there. Now try running them into one another the way native speakers do, instead of pausing between each one.',
    })
  }

  // --- Something harder -----------------------------------------------------
  if (comparison.score >= READY_FOR_MORE && suggestions.length < MAX_SUGGESTIONS) {
    suggestions.push({
      kind: 'challenge',
      title: 'Ready for something harder',
      detail:
        'This sentence is not challenging you any more. Move up a level, or type a sentence of your own that you find difficult.',
    })
  }

  // --- Always leave the learner with something ------------------------------
  if (suggestions.length === 0) {
    suggestions.push({
      kind: 'challenge',
      title: 'Run it once more',
      detail:
        'Listen to the model pronunciation, then record again straight away while it is fresh. The second attempt is usually the one that sticks.',
    })
  }

  return suggestions.slice(0, MAX_SUGGESTIONS)
}
