/** Shared types for exercises, analysis, and progress. */

export type Level = 'beginner' | 'intermediate' | 'advanced'

export interface Exercise {
  id: number
  text: string
  level: Level
}

/** How a single target word fared against what the learner actually said. */
export type WordStatus =
  /** Spoken as written. */
  | 'correct'
  /** Recognized as a different-but-similar word, i.e. likely mispronounced. */
  | 'problem'
  /** In the target sentence but never spoken. */
  | 'missing'
  /** Spoken but not in the target sentence. */
  | 'extra'

export interface WordResult {
  /** The target word, or for `extra`, the word that was added. */
  word: string
  /** What was heard instead, present only for `problem`. */
  spoken?: string
  status: WordStatus
  /** Coaching tip attached by the coaching engine, when one applies. */
  tip?: string
  /** The sound the tip is about, e.g. "TH". */
  sound?: string
}

export type AlignmentOp =
  | { type: 'match'; expected: string; actual: string }
  | { type: 'substitute'; expected: string; actual: string }
  | { type: 'delete'; expected: string }
  | { type: 'insert'; actual: string }

export interface ComparisonResult {
  score: number
  words: WordResult[]
  missing: string[]
  extra: string[]
  mismatched: Array<{ expected: string; spoken: string }>
  expectedWordCount: number
  recognizedWordCount: number
}

export interface CoachingTip {
  /** The target word the tip refers to. */
  word: string
  /** The sound being coached, e.g. "TH" or "R". */
  sound: string
  tip: string
}

/**
 * What the recording itself can tell us, beyond the words. Both fields are
 * optional because the browser does not always report them.
 */
export interface SpeechMeta {
  /** How long the learner was recording, in milliseconds. */
  durationMs?: number
  /** Recognizer confidence, 0 to 1. Chrome does not always populate this. */
  confidence?: number
}

export type SuggestionKind = 'clarity' | 'pace' | 'sound' | 'fluency' | 'challenge'

/**
 * Advice offered regardless of score. Where CoachingTip fixes something that
 * went wrong, a Suggestion says what to work on next — so a perfect reading
 * still comes with something to try.
 */
export interface Suggestion {
  kind: SuggestionKind
  title: string
  detail: string
}

/** The payload rendered by the result view. Mirrors the JSON shape in section 18. */
export interface AnalysisResult {
  score: number
  expected: string
  recognized: string
  words: WordResult[]
  /** Plain-language sentences describing what went wrong. */
  feedback: string[]
  /** Pronunciation tips for the specific sounds that caused trouble. */
  tips: CoachingTip[]
  /** What to work on next. Never empty, even for a perfect score. */
  suggestions: Suggestion[]
}

export interface SessionRecord {
  id: string
  /** ISO 8601 timestamp. */
  date: string
  score: number
  exerciseId: number
  level: Level
  sentence: string
}

export interface ProgressStats {
  sessions: number
  averageScore: number
  bestScore: number
  lastScore: number
}
