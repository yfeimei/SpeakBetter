/**
 * Practice content: 30 items across three difficulty levels.
 *
 * Beginner is single sentences. Intermediate and Advanced are paragraphs of
 * two to four sentences, because reading connected speech — carrying
 * intonation across a sentence boundary, breathing in the right places — is a
 * different skill from reading one sentence in isolation.
 *
 * Content is chosen to exercise the sounds the coaching engine knows about
 * (TH, R, V, W, L) and to grow in length with the level.
 */

import type { Exercise, Level } from '../types'

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced']

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  beginner: 'Short, everyday sentences',
  intermediate: 'Short paragraphs of two or three sentences',
  advanced: 'Longer paragraphs and complex structures',
}

/** What one item at this level is called, for counts and labels. */
export const LEVEL_UNIT: Record<Level, string> = {
  beginner: 'sentences',
  intermediate: 'paragraphs',
  advanced: 'paragraphs',
}

export const EXERCISES: Exercise[] = [
  // --- Beginner: single sentences ------------------------------------------
  { id: 1, text: 'I like coffee.', level: 'beginner' },
  { id: 2, text: 'My name is John.', level: 'beginner' },
  { id: 3, text: 'I live in Chicago.', level: 'beginner' },
  { id: 4, text: 'The weather is nice today.', level: 'beginner' },
  { id: 5, text: 'I have three brothers.', level: 'beginner' },
  { id: 6, text: 'She works at a school.', level: 'beginner' },
  { id: 7, text: 'This is my favorite book.', level: 'beginner' },
  { id: 8, text: 'I want a glass of water.', level: 'beginner' },
  { id: 9, text: 'We are going home now.', level: 'beginner' },
  { id: 10, text: 'Thank you very much.', level: 'beginner' },

  // --- Intermediate: two or three sentences --------------------------------
  {
    id: 11,
    text: 'I usually go to work by train. The journey takes about forty minutes, so I read a book on the way.',
    level: 'intermediate',
  },
  {
    id: 12,
    text: 'I would like to order a cup of coffee, please. Could you also bring a glass of water when you have a moment?',
    level: 'intermediate',
  },
  {
    id: 13,
    text: 'The restaurant on the corner is very good. They serve fresh bread every morning, and the staff are always friendly.',
    level: 'intermediate',
  },
  {
    id: 14,
    text: 'I think this is a good idea. If we start early, we should finish before the weather gets worse.',
    level: 'intermediate',
  },
  {
    id: 15,
    text: 'My brother is learning how to play the violin. He practises every evening, and he is getting better each week.',
    level: 'intermediate',
  },
  {
    id: 16,
    text: 'She travels to three different countries every year. Last winter she visited Norway, and this spring she is going to Japan.',
    level: 'intermediate',
  },
  {
    id: 17,
    text: 'I bought some fresh vegetables at the market this morning. The tomatoes were very cheap, so I bought rather too many.',
    level: 'intermediate',
  },
  {
    id: 18,
    text: 'The meeting was rescheduled for Thursday morning. Please let me know whether that time still works for you.',
    level: 'intermediate',
  },
  {
    id: 19,
    text: 'We should leave before the traffic gets heavy. The drive usually takes an hour, but it can be much longer.',
    level: 'intermediate',
  },
  {
    id: 20,
    text: 'Could you please repeat that question? I did not quite hear you, and I want to give you the right answer.',
    level: 'intermediate',
  },

  // --- Advanced: three or four sentences -----------------------------------
  {
    id: 21,
    text: 'I have been working on this project for several months. Although the results are encouraging, there is still a great deal to do before we can publish anything. I would rather take the extra time and get it right.',
    level: 'advanced',
  },
  {
    id: 22,
    text: 'Although the weather was terrible, we decided to go hiking. The path was muddy and the wind was strong, but the view from the top was genuinely worth the effort. We will certainly do it again.',
    level: 'advanced',
  },
  {
    id: 23,
    text: 'The researchers thoroughly reviewed the results before publishing them. They repeated the most important measurements three times, and they asked two colleagues to check the calculations. Careful work of this kind rarely receives the attention it deserves.',
    level: 'advanced',
  },
  {
    id: 24,
    text: 'Learning another language requires patience, practice, and a little courage. You will make mistakes, and some of them will be embarrassing, but every mistake teaches you something that a textbook never could.',
    level: 'advanced',
  },
  {
    id: 25,
    text: 'It is worth remembering that comfortable clothes make a long flight much easier. Bring a warm layer, drink plenty of water, and try to walk around the cabin every few hours.',
    level: 'advanced',
  },
  {
    id: 26,
    text: 'The government announced three significant changes to the policy. The first will take effect immediately, while the others will be introduced gradually over the following year. Businesses have already asked for clearer guidance.',
    level: 'advanced',
  },
  {
    id: 27,
    text: 'I would have finished the report earlier if the library had been open. Unfortunately the building closed for repairs, and the material I needed was not available anywhere else.',
    level: 'advanced',
  },
  {
    id: 28,
    text: 'Their thoughtful suggestions completely changed the direction of our work. We had been focusing on the wrong problem for weeks, and a single conversation was enough to make that obvious.',
    level: 'advanced',
  },
  {
    id: 29,
    text: 'Whether or not we succeed, the experience will be genuinely valuable. We have already learned more in the last three months than in the previous three years, and that knowledge will not disappear.',
    level: 'advanced',
  },
  {
    id: 30,
    text: 'She would rather travel by train than wait at the airport. The journey takes longer, but she can work comfortably, watch the countryside go past, and arrive without feeling exhausted.',
    level: 'advanced',
  },
]

/** All exercises for one difficulty level, in order. */
export function getExercises(level: Level): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.level === level)
}

export function getExerciseById(id: number): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id)
}

/** Rough word count, used to size the recording budget and the layout. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
}

/**
 * Whether this text should be treated as connected speech rather than a
 * single sentence. Drives the recording length and whether recognition keeps
 * listening across the pauses between sentences.
 */
export function isParagraph(text: string): boolean {
  return countWords(text) > 12
}
