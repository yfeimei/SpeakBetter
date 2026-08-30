/**
 * Text comparison engine.
 *
 * Aligns the target word sequence against the recognized word sequence with
 * word-level dynamic programming (Levenshtein with a backtrace), then turns
 * the alignment into a per-word verdict and a 0-100 speaking-match score.
 */

import { tokenize } from './normalize'
import type { AlignmentOp, WordResult, ComparisonResult } from '../types'

// Alignment costs are held as integers (a real cost of 1.0 is stored as 10)
// so the backtrace can compare table entries with exact equality instead of a
// floating-point tolerance.

/** Deletion = a target word that was never spoken. */
const COST_DELETE = 10
/** Insertion = a spoken word that is not in the target sentence. */
const COST_INSERT = 10
/**
 * Substitution costs. Swapping two words that look alike ("think" / "tink")
 * is treated as one mispronounced word, so it is cheaper than swapping two
 * unrelated words. Both stay below COST_DELETE + COST_INSERT, so the aligner
 * still prefers a substitution over dropping and re-adding a word.
 */
const COST_SUBSTITUTE_SIMILAR = 10
const COST_SUBSTITUTE_DIFFERENT = 16

/**
 * Above this character-level similarity, two different words are read as the
 * same word pronounced imperfectly rather than as a different word entirely.
 */
export const SIMILARITY_THRESHOLD = 0.5

/**
 * Error weights, in units of "one word's worth of the passage".
 *
 * An extra word counts for less than a missing one: adding a word still shows
 * you produced the target text, whereas dropping one means part of it was
 * never said.
 */
export const WEIGHT_MISSING = 1
export const WEIGHT_MISMATCH = 1
export const WEIGHT_EXTRA = 0.5

/** Character-level edit distance, used to judge how alike two words sound. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const substitution = prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      curr[j] = Math.min(substitution, prev[j] + 1, curr[j - 1] + 1)
    }
    prev = curr.slice()
  }

  return prev[b.length]
}

/** 1 for identical words, 0 for words with nothing in common. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length)
  if (longest === 0) return 1
  return 1 - editDistance(a, b) / longest
}

function substitutionCost(a: string, b: string): number {
  if (a === b) return 0
  return similarity(a, b) >= SIMILARITY_THRESHOLD
    ? COST_SUBSTITUTE_SIMILAR
    : COST_SUBSTITUTE_DIFFERENT
}

/**
 * Align two word sequences. The returned operations read left to right and
 * together reconstruct both sentences in order.
 */
export function align(expected: string[], actual: string[]): AlignmentOp[] {
  const m = expected.length
  const n = actual.length

  // cost[i][j] = cheapest way to turn expected[0..i) into actual[0..j)
  const cost: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  )

  for (let i = 1; i <= m; i++) cost[i][0] = i * COST_DELETE
  for (let j = 1; j <= n; j++) cost[0][j] = j * COST_INSERT

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cost[i][j] = Math.min(
        cost[i - 1][j - 1] + substitutionCost(expected[i - 1], actual[j - 1]),
        cost[i - 1][j] + COST_DELETE,
        cost[i][j - 1] + COST_INSERT,
      )
    }
  }

  // Walk back through the table to recover the individual operations.
  const ops: AlignmentOp[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const expectedWord = expected[i - 1]
      const actualWord = actual[j - 1]
      const diagonal =
        cost[i - 1][j - 1] + substitutionCost(expectedWord, actualWord)

      if (cost[i][j] === diagonal) {
        ops.push(
          expectedWord === actualWord
            ? { type: 'match', expected: expectedWord, actual: actualWord }
            : { type: 'substitute', expected: expectedWord, actual: actualWord },
        )
        i--
        j--
        continue
      }
    }

    if (i > 0 && cost[i][j] === cost[i - 1][j] + COST_DELETE) {
      ops.push({ type: 'delete', expected: expected[i - 1] })
      i--
      continue
    }

    ops.push({ type: 'insert', actual: actual[j - 1] })
    j--
  }

  return ops.reverse()
}

/**
 * Speaking-match score, 0-100: the share of the passage that came through
 * correctly.
 *
 *     score = 100 x (1 - weighted errors / words in the target)
 *
 * This is the normalized similarity score offered as the alternative in
 * section 8, rather than the fixed "start at 100, subtract 10" penalties.
 * Fixed penalties only work for single sentences: on a forty-word paragraph
 * ten slips would score zero, which tells the learner nothing and is plainly
 * wrong for a reading that was three-quarters right.
 *
 * Normalizing also makes the number mean something a learner can hold on to —
 * roughly the percentage of the passage they said correctly — and makes scores
 * comparable across a three-word sentence and a fifty-word paragraph.
 */
export function scoreAlignment(ops: AlignmentOp[], expectedWordCount: number): number {
  if (expectedWordCount <= 0) return 0

  let errors = 0
  for (const op of ops) {
    if (op.type === 'delete') errors += WEIGHT_MISSING
    else if (op.type === 'substitute') errors += WEIGHT_MISMATCH
    else if (op.type === 'insert') errors += WEIGHT_EXTRA
  }

  const score = 100 * (1 - errors / expectedWordCount)
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Compare a spoken sentence against the target sentence.
 *
 * Returns a per-word breakdown suitable for direct rendering, plus the words
 * that were missed, added, or spoken differently.
 */
export function compare(expectedText: string, recognizedText: string): ComparisonResult {
  const expected = tokenize(expectedText)
  const actual = tokenize(recognizedText)
  const ops = align(expected, actual)

  const words: WordResult[] = []
  const missing: string[] = []
  const extra: string[] = []
  const mismatched: Array<{ expected: string; spoken: string }> = []

  for (const op of ops) {
    switch (op.type) {
      case 'match':
        words.push({ word: op.expected, status: 'correct' })
        break

      case 'substitute':
        words.push({ word: op.expected, spoken: op.actual, status: 'problem' })
        mismatched.push({ expected: op.expected, spoken: op.actual })
        break

      case 'delete':
        words.push({ word: op.expected, status: 'missing' })
        missing.push(op.expected)
        break

      case 'insert':
        words.push({ word: op.actual, status: 'extra' })
        extra.push(op.actual)
        break
    }
  }

  return {
    score: scoreAlignment(ops, expected.length),
    words,
    missing,
    extra,
    mismatched,
    expectedWordCount: expected.length,
    recognizedWordCount: actual.length,
  }
}
