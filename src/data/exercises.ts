/**
 * Practice content: 30 items across three difficulty levels.
 *
 * Beginner is single sentences. Intermediate and Advanced are paragraphs of
 * two to four sentences, because reading connected speech — carrying
 * intonation across a sentence boundary, breathing in the right places — is a
 * different skill from reading one sentence in isolation.
 *
 * Content is chosen to exercise the sounds the coaching engine knows about
 * (TH, R, V, W, L) and to grow in difficulty with the level.
 *
 * The levels differ in kind, not only in length:
 *   - Beginner and Intermediate are ordinary sentences read at a careful pace.
 *   - Advanced is written for someone already fluent, reading at the speed
 *     they actually talk. Length alone does not make a passage hard, so these
 *     lean on what stays hard at speed: consonant clusters ("asked for the
 *     transcripts"), words native speakers themselves fumble ("rural juror",
 *     "February", "particularly"), unstressed syllables that vanish when
 *     hurried, contractions, and long sentences that have to be planned a
 *     breath ahead. Read slowly, most of them are easy; that is the point.
 *
 * Vocabulary is kept to words a browser recognizer transcribes reliably —
 * difficult to say, not obscure — and numbers are spelled in forms the
 * normalizer already folds, so a good reading still scores like one.
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
  advanced: 'Native-speed passages that are hard to say fluently',
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

  // --- Advanced: read these at the speed you actually talk ------------------
  // Consonant clusters that collapse when hurried: sk-t, -pts, -cts, -lfth.
  {
    id: 21,
    text: 'The witness asked for the transcripts, then contradicted himself twice in the space of a single sentence. He had rehearsed the story so thoroughly that the gaps in it had a kind of polish, and the prosecutor, who had heard most of it before, simply waited for the twelfth contradiction to arrive.',
    level: 'advanced',
  },
  // The R and L sequences that catch native speakers out at any speed.
  {
    id: 22,
    text: 'The rural juror thought the whole trial was ridiculous, and she said so in the corridor, loudly, to anyone who would listen. Particularly irritating, she said, was the lawyer who kept repeating the phrase "to the best of my recollection" as though it were a magic spell.',
    level: 'advanced',
  },
  // Long Latinate words whose stress moves, plus a mouthful of a subject line.
  {
    id: 23,
    text: 'Statistically speaking, the phenomenon is unremarkable; particular regions have always reported irregular figures, and the specialists specifically warned against reading too much into them. What is genuinely remarkable is how quickly a badly worded summary travelled around the world before anybody thought to check the arithmetic.',
    level: 'advanced',
  },
  // Fast idiomatic speech: contractions, weak forms, and a running argument.
  {
    id: 24,
    text: "Look, I'm not saying you're wrong, I'm saying the timing is terrible. If we announce it on Thursday we'll spend all of Friday explaining ourselves, and by Monday nobody will remember what the announcement was actually about. Let's give it a couple of weeks and see whether anyone still cares.",
    level: 'advanced',
  },
  // Times and places rattled off the way people really give directions.
  {
    id: 25,
    text: 'Her flight leaves at a quarter past six on Thursday morning, connects through Amsterdam, and lands the following afternoon. She has thirty minutes to change terminals, which anybody who has been through that airport will tell you is optimistic to the point of comedy.',
    level: 'advanced',
  },
  // Office register, and February, which almost nobody says as it is written.
  {
    id: 26,
    text: 'The committee recommendations were, characteristically, both comprehensive and completely unworkable. Implementing them would require a level of administrative coordination this department has never once demonstrated, and the deadline they have proposed is the middle of February, which gives us precisely eleven weeks.',
    level: 'advanced',
  },
  // Voiced and unvoiced TH stacked close together, with nothing to hide behind.
  {
    id: 27,
    text: 'They gathered the three of them together and asked, without much warmth, whether either brother had anything further to add. Neither of them thought so. The whole thing was over in something like ninety seconds, and nothing that actually mattered was said out loud.',
    level: 'advanced',
  },
  // Syllables that disappear at speed: library, temperature, comfortable.
  {
    id: 28,
    text: 'He asked me, quite seriously, whether the library kept its temperature that low deliberately. I said it probably had something to do with the older books, though comfortable is not the word I would choose for any room where you can watch your own breath.',
    level: 'advanced',
  },
  // The endings that get swallowed first: -ed, -ts, -ed again, plural S.
  {
    id: 29,
    text: 'The tests were repeated, the results were checked and rechecked, and the earlier conclusions were quietly withdrawn. Nobody involved pretended to be pleased about it, but the alternative was publishing figures that half the field had already stopped believing.',
    level: 'advanced',
  },
  // One long sentence that has to be planned a breath ahead of the voice.
  {
    id: 30,
    text: 'What nobody mentions about learning to speak clearly is that the hardest part is not the individual sounds at all. It is the rhythm: knowing which words to lean on, which ones to swallow, and when to stop talking altogether so that the person listening has room to reply.',
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
