/**
 * Coaching rules for the coaching engine.
 *
 * Two layers, checked in order:
 *   1. WORD_RULES  - a tip written for one specific word.
 *   2. SOUND_RULES - a pattern that catches any word containing a sound,
 *                    so words with no hand-written entry still get help.
 *
 * Plain data, no model of any kind. Section 20 of the design document.
 */

export interface WordRule {
  sound: string
  tip: string
}

export const WORD_RULES: Record<string, WordRule> = {
  think: {
    sound: 'TH',
    tip: 'Put your tongue lightly between your teeth and let air flow through. Do not say "tink" or "sink".',
  },
  thing: {
    sound: 'TH',
    tip: 'Start with your tongue between your teeth, then move straight into "ing".',
  },
  three: {
    sound: 'TH',
    tip: 'Put your tongue lightly between your teeth, then add the R. Do not say "free" or "tree".',
  },
  through: {
    sound: 'TH',
    tip: 'Tongue between the teeth for TH, then round your lips for the "oo" sound.',
  },
  thought: {
    sound: 'TH',
    tip: 'Begin with the tongue between the teeth, then open your mouth wide for "aw".',
  },
  thanks: {
    sound: 'TH',
    tip: 'Tongue between the teeth for TH, then finish crisply with "nks".',
  },
  weather: {
    sound: 'TH',
    tip: 'The TH here is voiced: your throat should buzz as air passes over your tongue.',
  },
  together: {
    sound: 'TH',
    tip: 'The middle TH is voiced. Let your voice hum while your tongue touches your teeth.',
  },
  the: {
    sound: 'TH',
    tip: 'A soft voiced TH. Touch your tongue to your teeth and hum, do not say "duh".',
  },
  this: {
    sound: 'TH',
    tip: 'Voiced TH. Your throat vibrates. "This" should not sound like "dis".',
  },
  that: {
    sound: 'TH',
    tip: 'Voiced TH. Keep your tongue soft against your teeth, not behind them.',
  },
  they: {
    sound: 'TH',
    tip: 'Voiced TH followed by a long "ay". Avoid turning it into "day".',
  },
  right: {
    sound: 'R',
    tip: 'Raise your tongue without touching the roof of your mouth, and round your lips slightly.',
  },
  really: {
    sound: 'R',
    tip: 'Start with a rounded R, then let the tongue rise for the double L.',
  },
  world: {
    sound: 'R',
    tip: 'Move smoothly from R to L without a pause. Keep the tongue moving.',
  },
  work: {
    sound: 'R',
    tip: 'Round your lips for the "wer" sound. It should not sound like "walk".',
  },
  read: {
    sound: 'R',
    tip: 'Curl the tongue back for R without tapping the roof of the mouth.',
  },
  very: {
    sound: 'V',
    tip: 'Rest your top teeth on your bottom lip and hum. "Very" is not "berry".',
  },
  visit: {
    sound: 'V',
    tip: 'Top teeth on the bottom lip, with voice. Do not start with a B or W.',
  },
  love: {
    sound: 'V',
    tip: 'Finish with the top teeth touching the bottom lip so the V is heard.',
  },
  live: {
    sound: 'V',
    tip: 'End on a voiced V, teeth on lip. It should not sound like "life".',
  },
  wonderful: {
    sound: 'W',
    tip: 'Round your lips into a small circle for W before opening into the vowel.',
  },
  would: {
    sound: 'W',
    tip: 'Round the lips for W. The L is silent: it sounds like "wood".',
  },
  water: {
    sound: 'W',
    tip: 'Round the lips for W, and in American English the T sounds like a soft D.',
  },
  light: {
    sound: 'L',
    tip: 'Touch the tip of your tongue to the ridge behind your top teeth.',
  },
  little: {
    sound: 'L',
    tip: 'Two L sounds. Touch the ridge behind your teeth for both.',
  },
  probably: {
    sound: 'L',
    tip: 'Say it in three beats: prob-ab-ly. Do not drop the middle syllable.',
  },
  usually: {
    sound: 'ZH',
    tip: 'The middle sounds like the S in "measure". Say "yoo-zhoo-uh-lee".',
  },
  measure: {
    sound: 'ZH',
    tip: 'A soft buzzing sound in the middle, like the S in "pleasure".',
  },
  station: {
    sound: 'SH',
    tip: 'The "-tion" ending sounds like "shun".',
  },
  question: {
    sound: 'CH',
    tip: 'The "-stion" ending sounds like "s-chun", not "shun".',
  },
  restaurant: {
    sound: 'SYLLABLE',
    tip: 'Two beats, not three: "REST-ront". The middle vowel almost disappears.',
  },
  comfortable: {
    sound: 'SYLLABLE',
    tip: 'Say "COMF-ter-bul". Native speakers drop the "or".',
  },
  vegetable: {
    sound: 'SYLLABLE',
    tip: 'Three beats: "VEJ-tuh-bul". The second E is silent.',
  },
  interesting: {
    sound: 'SYLLABLE',
    tip: 'Usually three beats: "IN-tres-ting".',
  },
  clothes: {
    sound: 'TH',
    tip: 'The TH almost disappears. It is close to "close".',
  },
  months: {
    sound: 'TH',
    tip: 'A hard cluster. Practice "munth-s" slowly, then speed up.',
  },
  sixth: {
    sound: 'TH',
    tip: 'End with "ks-th". Say it slowly at first.',
  },
}

/**
 * Fallback patterns. Used when a problem word has no entry above, so coverage
 * is not limited to the hand-written list.
 */
export interface SoundRule {
  sound: string
  /** Matched against the normalized word. */
  pattern: RegExp
  tip: string
}

export const SOUND_RULES: SoundRule[] = [
  {
    sound: 'TH',
    pattern: /th/,
    tip: 'This word has a TH sound. Put your tongue lightly between your teeth and let air flow through.',
  },
  {
    sound: 'R',
    pattern: /^r|rr/,
    tip: 'This word has an R sound. Raise your tongue without touching the roof of your mouth, and round your lips slightly.',
  },
  {
    sound: 'V',
    pattern: /v/,
    tip: 'This word has a V sound. Rest your top teeth on your bottom lip and use your voice.',
  },
  {
    sound: 'W',
    pattern: /^w/,
    tip: 'This word starts with W. Round your lips into a small circle before the vowel.',
  },
  {
    sound: 'SH',
    pattern: /tion$|sh/,
    tip: 'This word has an SH sound. Push air through a narrow gap with your lips slightly rounded.',
  },
  {
    sound: 'L',
    pattern: /^l|ll/,
    tip: 'This word has an L sound. Touch the tip of your tongue to the ridge behind your top teeth.',
  },
  {
    sound: 'ED',
    pattern: /ed$/,
    tip: 'The "-ed" ending is usually a quick T or D sound, not a full extra syllable.',
  },
  {
    sound: 'S',
    pattern: /s$/,
    tip: 'Do not drop the final S. It carries grammar, such as plurals and verb endings.',
  },
]
