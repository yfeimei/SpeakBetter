/**
 * Text normalization for the comparison engine.
 *
 *   "I think, this is a good idea!"  ->  "i think this is a good idea"
 *
 * Both the target sentence and the recognized speech go through exactly the
 * same pipeline, so differences that survive are real speaking differences
 * rather than artifacts of punctuation or transcription style.
 */

/**
 * Speech recognizers transcribe contractions inconsistently: a speaker saying
 * "I'd like" may come back as "I would like" and vice versa. Expanding both
 * sides to the long form removes a whole class of false "missing word" errors.
 */
const CONTRACTIONS: Record<string, string> = {
  "i'm": 'i am',
  "i've": 'i have',
  "i'll": 'i will',
  "i'd": 'i would',
  "you're": 'you are',
  "you've": 'you have',
  "you'll": 'you will',
  "you'd": 'you would',
  "he's": 'he is',
  "he'll": 'he will',
  "he'd": 'he would',
  "she's": 'she is',
  "she'll": 'she will',
  "she'd": 'she would',
  "it's": 'it is',
  "it'll": 'it will',
  "we're": 'we are',
  "we've": 'we have',
  "we'll": 'we will',
  "we'd": 'we would',
  "they're": 'they are',
  "they've": 'they have',
  "they'll": 'they will',
  "they'd": 'they would',
  "that's": 'that is',
  "there's": 'there is',
  "here's": 'here is',
  "what's": 'what is',
  "who's": 'who is',
  "let's": 'let us',
  "don't": 'do not',
  "doesn't": 'does not',
  "didn't": 'did not',
  "isn't": 'is not',
  "aren't": 'are not',
  "wasn't": 'was not',
  "weren't": 'were not',
  "can't": 'can not',
  cannot: 'can not',
  "couldn't": 'could not',
  "wouldn't": 'would not',
  "shouldn't": 'should not',
  "won't": 'will not',
  "haven't": 'have not',
  "hasn't": 'has not',
  "hadn't": 'had not',
}

/**
 * Recognizers often return digits where a sentence spells the number out
 * ("3" vs "three"). Spoken aloud these are identical, so they should not
 * count as errors.
 */
const NUMBER_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
  '30': 'thirty',
  '40': 'forty',
  '50': 'fifty',
  '60': 'sixty',
  '70': 'seventy',
  '80': 'eighty',
  '90': 'ninety',
  '100': 'one hundred',
}

/** Curly quotes and unicode dashes, folded to their ASCII equivalents. */
function foldUnicodePunctuation(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
}

/**
 * Lowercase, expand contractions, spell out digits, and strip everything that
 * is not a letter, digit or space. Returns a single space-separated string.
 */
export function normalizeText(text: string): string {
  let out = foldUnicodePunctuation(text).toLowerCase()

  // Expand contractions before punctuation is stripped, since the apostrophe
  // is what identifies them.
  out = out.replace(/[a-z]+'[a-z]+/g, (match) => CONTRACTIONS[match] ?? match)
  out = out.replace(/\bcannot\b/g, 'can not')

  // Hyphens and slashes join two spoken words ("well-known" -> "well known").
  out = out.replace(/[-/]/g, ' ')

  // Remove remaining punctuation, including any leftover apostrophes
  // ("john's" -> "johns"), applied identically to both sides.
  out = out.replace(/[^a-z0-9\s]/g, '')

  out = out
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => NUMBER_WORDS[token] ?? token)
    .join(' ')

  return out.trim()
}

/** Normalize, then split into comparable word tokens. */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  return normalized.length === 0 ? [] : normalized.split(' ')
}
