/**
 * Analysis service.
 *
 * This is the seam that a server would sit behind. In the original design the
 * browser posted audio to `POST /api/analyze`; because speech recognition now
 * runs in the browser, the same pipeline (compare -> score -> coach) runs
 * locally and returns the identical response shape from section 18.
 *
 * Every consumer goes through this module, so moving the pipeline back behind
 * an HTTP call later means changing these functions and nothing else.
 */

import { compare } from '../engine/comparison'
import { coach } from '../engine/coaching'
import { buildSuggestions } from '../engine/suggestions'
import { getExerciseById, getExercises } from '../data/exercises'
import type { AnalysisResult, Exercise, Level, SpeechMeta } from '../types'

/** Id used for a sentence the learner typed themselves. */
export const CUSTOM_EXERCISE_ID = 0

/**
 * Longest passage a learner may enter, in characters — roughly 160 words.
 *
 * Sized against the recording budget rather than the text box: three minutes
 * at a learner's reading pace covers about 145 words, so this leaves a little
 * headroom without accepting a passage nobody could finish in one recording.
 */
export const MAX_CUSTOM_SENTENCE_LENGTH = 1_000

/** Mirrors `GET /api/exercises?level=beginner`. */
export function fetchExercises(level: Level): Exercise[] {
  return getExercises(level)
}

export class AnalysisError extends Error {}

/**
 * Core analysis. Compares any target text against a transcript.
 *
 * @param expected    The sentence the learner was asked to read.
 * @param recognized  The transcript produced by speech recognition.
 * @param meta        Optional signals about the recording itself.
 */
export function analyzeText(
  expected: string,
  recognized: string,
  meta: SpeechMeta = {},
): AnalysisResult {
  if (recognized.trim().length === 0) {
    throw new AnalysisError('No speech was recognized.')
  }

  const comparison = compare(expected, recognized)
  const { words, feedback, tips } = coach(comparison)

  return {
    score: comparison.score,
    expected,
    recognized,
    words,
    feedback,
    tips,
    suggestions: buildSuggestions(expected, comparison, meta),
  }
}

/**
 * Mirrors `POST /api/analyze`, keyed by exercise id.
 *
 * @param exerciseId  The sentence the learner was asked to read.
 * @param recognized  The transcript produced by speech recognition.
 * @param meta        Optional signals about the recording itself.
 */
export function analyzeSpeech(
  exerciseId: number,
  recognized: string,
  meta: SpeechMeta = {},
): AnalysisResult {
  const exercise = getExerciseById(exerciseId)
  if (!exercise) {
    throw new AnalysisError(`Unknown exercise: ${exerciseId}`)
  }

  return analyzeText(exercise.text, recognized, meta)
}

/**
 * Check a learner-supplied sentence before it becomes an exercise.
 *
 * Returns the cleaned sentence, or an error message explaining what to fix.
 */
export function validateCustomSentence(
  input: string,
): { ok: true; text: string } | { ok: false; error: string } {
  const text = input.trim().replace(/\s+/g, ' ')

  if (text.length === 0) {
    return { ok: false, error: 'Type a sentence to practice.' }
  }

  if (text.length > MAX_CUSTOM_SENTENCE_LENGTH) {
    return {
      ok: false,
      error: `Keep it under ${MAX_CUSTOM_SENTENCE_LENGTH} characters — around 160 words, or about three minutes of speaking.`,
    }
  }

  // Needs something the comparison engine can actually match on.
  if (!/[a-z]/i.test(text)) {
    return { ok: false, error: 'That sentence needs some words in it.' }
  }

  return { ok: true, text }
}
