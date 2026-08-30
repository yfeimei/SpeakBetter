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
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
]

/** Spell out 0-100. Anything larger is left as digits — it is not worth guessing. */
function spellNumber(value: number): string | null {
  if (!Number.isInteger(value) || value < 0 || value > 100) return null
  if (value < 20) return ONES[value]
  if (value === 100) return 'one hundred'

  const tens = TENS[Math.floor(value / 10)]
  const ones = value % 10
  return ones === 0 ? tens : `${tens} ${ONES[ones]}`
}

/**
 * Ordinals whose spoken form is not simply the cardinal plus "th". Everything
 * else follows the rule, so only the exceptions are listed.
 */
const IRREGULAR_ORDINALS: Record<string, string> = {
  one: 'first',
  two: 'second',
  three: 'third',
  five: 'fifth',
  eight: 'eighth',
  nine: 'ninth',
  twelve: 'twelfth',
  twenty: 'twentieth',
  thirty: 'thirtieth',
  forty: 'fortieth',
  fifty: 'fiftieth',
  sixty: 'sixtieth',
  seventy: 'seventieth',
  eighty: 'eightieth',
  ninety: 'ninetieth',
}

/**
 * Spell out an ordinal: 12 -> "twelfth", 21 -> "twenty first".
 *
 * Recognizers write ordinals as digits ("the 12th contradiction") where a
 * passage spells them out ("the twelfth contradiction"). Read aloud the two are
 * the same words, so without this the speaker is marked down for a
 * transcription style they had no control over.
 */
function spellOrdinal(value: number): string | null {
  const cardinal = spellNumber(value)
  if (cardinal === null) return null

  const words = cardinal.split(' ')
  const last = words[words.length - 1]
  words[words.length - 1] = IRREGULAR_ORDINALS[last] ?? `${last}th`
  return words.join(' ')
}

/** "6:15" -> "six fifteen", "6:00" -> "six oclock", "6:05" -> "six oh five". */
function spellClockTime(hours: string, minutes: string): string | null {
  const hour = spellNumber(Number(hours))
  if (hour === null) return null

  const minuteValue = Number(minutes)
  if (minuteValue === 0) return `${hour} oclock`

  const minute = spellNumber(minuteValue)
  if (minute === null) return null

  // "six oh five", the way a single-digit minute is actually said. The
  // apostrophe in o'clock is stripped later, so "oclock" is what both sides of
  // the comparison end up holding.
  return minuteValue < 10 ? `${hour} oh ${minute}` : `${hour} ${minute}`
}

/** Digits, with or without an ordinal suffix, spelled out. */
function spellToken(token: string): string | null {
  if (/^\d+$/.test(token)) return spellNumber(Number(token))

  const ordinal = /^(\d+)(?:st|nd|rd|th)$/.exec(token)
  return ordinal ? spellOrdinal(Number(ordinal[1])) : null
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

  // Clock times, before the colon that identifies them is stripped.
  out = out.replace(
    /\b(\d{1,2}):(\d{2})\b/g,
    (match, hours: string, minutes: string) => spellClockTime(hours, minutes) ?? match,
  )

  // Hyphens and slashes join two spoken words ("well-known" -> "well known").
  out = out.replace(/[-/]/g, ' ')

  // Remove remaining punctuation, including any leftover apostrophes
  // ("john's" -> "johns"), applied identically to both sides.
  out = out.replace(/[^a-z0-9\s]/g, '')

  out = out
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => spellToken(token) ?? token)
    .join(' ')

  return out.trim()
}

/** Normalize, then split into comparable word tokens. */
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text)
  return normalized.length === 0 ? [] : normalized.split(' ')
}
