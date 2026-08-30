/**
 * Coaching engine.
 *
 * Looks up problem words in the rule table and turns the comparison result
 * into plain-language feedback. A dictionary lookup and a few string
 * templates, exactly as described in section 20.
 */

import { WORD_RULES, SOUND_RULES } from '../data/pronunciationRules'
import type { CoachingTip, ComparisonResult, WordResult } from '../types'

/** The most tips to show at once, so the result stays readable. */
const MAX_TIPS = 3

/** Find a tip for one word, preferring the hand-written entry. */
export function lookupTip(word: string): CoachingTip | null {
  const key = word.toLowerCase()

  const exact = WORD_RULES[key]
  if (exact) return { word: key, sound: exact.sound, tip: exact.tip }

  for (const rule of SOUND_RULES) {
    if (rule.pattern.test(key)) {
      return { word: key, sound: rule.sound, tip: rule.tip }
    }
  }

  return null
}

function quote(word: string): string {
  return `"${word}"`
}

/** "a", "b" and "c" */
function joinWords(words: string[]): string {
  const quoted = words.map(quote)
  if (quoted.length <= 1) return quoted.join('')
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`
}

/**
 * Attach tips to the problem words and build the feedback sentences shown
 * under the score.
 */
export function coach(comparison: ComparisonResult): {
  words: WordResult[]
  feedback: string[]
  tips: CoachingTip[]
} {
  const tips: CoachingTip[] = []
  const seenSounds = new Set<string>()

  // Annotate each word that needs work, collecting one tip per distinct sound
  // so the learner gets varied advice rather than the same line repeated.
  const words = comparison.words.map((word): WordResult => {
    if (word.status !== 'problem' && word.status !== 'missing') return word

    const tip = lookupTip(word.word)
    if (!tip) return word

    if (!seenSounds.has(tip.sound) && tips.length < MAX_TIPS) {
      seenSounds.add(tip.sound)
      tips.push(tip)
    }

    return { ...word, tip: tip.tip, sound: tip.sound }
  })

  const feedback: string[] = []

  if (comparison.missing.length > 0) {
    feedback.push(
      comparison.missing.length === 1
        ? `You missed ${quote(comparison.missing[0])}.`
        : `You missed ${joinWords(comparison.missing)}.`,
    )
  }

  for (const { expected, spoken } of comparison.mismatched) {
    feedback.push(
      `Your speech was slightly different around ${quote(expected)} — it sounded like ${quote(spoken)}.`,
    )
  }

  if (comparison.extra.length > 0) {
    feedback.push(
      comparison.extra.length === 1
        ? `You added an extra word: ${quote(comparison.extra[0])}.`
        : `You added extra words: ${joinWords(comparison.extra)}.`,
    )
  }

  if (feedback.length === 0) {
    feedback.push('Every word matched. Excellent speaking!')
  }

  return { words, feedback, tips }
}
