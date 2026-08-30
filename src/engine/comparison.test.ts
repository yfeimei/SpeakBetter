import { describe, expect, it } from 'vitest'
import { normalizeText, tokenize } from './normalize'
import { align, compare, editDistance, scoreAlignment, similarity } from './comparison'
import { coach, lookupTip } from './coaching'
import { EXERCISES } from '../data/exercises'

describe('normalizeText', () => {
  it('strips punctuation and lowercases, per the example in section 19', () => {
    expect(normalizeText('I think, this is a good idea!')).toBe('i think this is a good idea')
  })

  it('tokenizes into the expected word list', () => {
    expect(tokenize('I think, this is a good idea!')).toEqual([
      'i',
      'think',
      'this',
      'is',
      'a',
      'good',
      'idea',
    ])
  })

  it('expands contractions so both spellings compare equal', () => {
    expect(normalizeText("I'd like a coffee")).toBe('i would like a coffee')
    expect(normalizeText("don't")).toBe('do not')
    expect(normalizeText('cannot')).toBe('can not')
  })

  it('spells out digits, which recognizers often return instead of words', () => {
    expect(normalizeText('I have 3 brothers')).toBe('i have three brothers')
  })

  it('spells out numbers above twenty', () => {
    expect(normalizeText('45 minutes')).toBe('forty five minutes')
    expect(normalizeText('100 people')).toBe('one hundred people')
  })

  it('leaves numbers it cannot spell alone rather than guessing', () => {
    expect(normalizeText('the year 1999')).toBe('the year 1999')
  })

  it('spells out ordinals, which recognizers write as digits', () => {
    // Advanced passage 21 reads "the twelfth contradiction"; Chrome transcribes
    // that as "the 12th contradiction", which used to score as a mispronounced
    // word for every speaker.
    expect(normalizeText('the 12th contradiction')).toBe('the twelfth contradiction')
    expect(normalizeText('the 1st of May')).toBe('the first of may')
    expect(normalizeText('her 21st birthday')).toBe('her twenty first birthday')
    expect(normalizeText('the 40th anniversary')).toBe('the fortieth anniversary')
  })

  it('spells out clock times, so both spellings compare equal', () => {
    expect(normalizeText('leaves at 6:15')).toBe('leaves at six fifteen')
    expect(normalizeText('leaves at 6:05')).toBe('leaves at six oh five')
  })

  it("matches o'clock however it is transcribed", () => {
    expect(normalizeText('at 6:00')).toBe(normalizeText("at six o'clock"))
  })

  it('handles curly apostrophes from copied text', () => {
    expect(normalizeText('I’m here')).toBe('i am here')
  })

  it('splits hyphenated words into their spoken parts', () => {
    expect(normalizeText('a well-known writer')).toBe('a well known writer')
  })

  it('returns no tokens for empty or punctuation-only input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize('!!! ...')).toEqual([])
  })
})

describe('editDistance and similarity', () => {
  it('measures character edits', () => {
    expect(editDistance('think', 'tink')).toBe(1)
    expect(editDistance('coffee', 'coffee')).toBe(0)
    expect(editDistance('', 'abc')).toBe(3)
  })

  it('rates a mispronunciation as similar and unrelated words as different', () => {
    expect(similarity('think', 'tink')).toBeGreaterThan(0.5)
    expect(similarity('coffee', 'banana')).toBeLessThan(0.5)
  })
})

describe('align', () => {
  it('marks a near-miss as a substitution, not a deletion plus an insertion', () => {
    const ops = align(
      ['i', 'think', 'this', 'is', 'a', 'good', 'idea'],
      ['i', 'tink', 'this', 'is', 'a', 'good', 'idea'],
    )

    expect(ops).toHaveLength(7)
    expect(ops[1]).toEqual({ type: 'substitute', expected: 'think', actual: 'tink' })
    expect(ops.filter((op) => op.type === 'match')).toHaveLength(6)
  })

  it('detects a dropped word', () => {
    const ops = align(['i', 'like', 'a', 'coffee'], ['i', 'like', 'coffee'])
    expect(ops.filter((op) => op.type === 'delete')).toEqual([{ type: 'delete', expected: 'a' }])
  })

  it('detects an added word', () => {
    const ops = align(['i', 'like', 'coffee'], ['i', 'really', 'like', 'coffee'])
    expect(ops.filter((op) => op.type === 'insert')).toEqual([
      { type: 'insert', actual: 'really' },
    ])
  })

  it('reports every target word as missing when nothing was said', () => {
    const ops = align(['i', 'like', 'coffee'], [])
    expect(ops).toHaveLength(3)
    expect(ops.every((op) => op.type === 'delete')).toBe(true)
  })

  it('reconstructs both sequences in order', () => {
    const expected = ['the', 'weather', 'is', 'nice', 'today']
    const actual = ['the', 'wether', 'is', 'very', 'nice']
    const ops = align(expected, actual)

    const rebuiltExpected = ops.flatMap((op) => ('expected' in op ? [op.expected] : []))
    const rebuiltActual = ops.flatMap((op) => ('actual' in op ? [op.actual] : []))

    expect(rebuiltExpected).toEqual(expected)
    expect(rebuiltActual).toEqual(actual)
  })
})

describe('scoreAlignment', () => {
  /** Score a pair of word lists the way compare() does. */
  const score = (expected: string[], actual: string[]) =>
    scoreAlignment(align(expected, actual), expected.length)

  it('gives a perfect score when every word matches', () => {
    expect(score(['i', 'like', 'coffee'], ['i', 'like', 'coffee'])).toBe(100)
  })

  it('scores the share of the passage that came through', () => {
    // One missing word out of four: 3/4.
    expect(score(['i', 'like', 'a', 'coffee'], ['i', 'like', 'coffee'])).toBe(75)
    // One extra word, weighted half, against three expected: 1 - 0.5/3.
    expect(score(['i', 'like', 'coffee'], ['i', 'really', 'like', 'coffee'])).toBe(83)
    // One mismatched word out of three: 2/3.
    expect(score(['i', 'think', 'so'], ['i', 'tink', 'so'])).toBe(67)
  })

  it('treats the same number of errors as less serious in a longer passage', () => {
    const short = 'i like coffee'.split(' ')
    const long = 'i have been working on this project for several months now'.split(' ')

    // One missing word in each.
    const shortScore = score(short, ['i', 'coffee'])
    const longScore = score(long, long.filter((w) => w !== 'several'))

    expect(longScore).toBeGreaterThan(shortScore)
    expect(longScore).toBe(91)
  })

  it('never falls below zero', () => {
    const expected = 'one two three four five six seven eight nine ten eleven twelve'.split(' ')
    expect(score(expected, [])).toBe(0)
  })

  it('scores an empty target as zero rather than dividing by zero', () => {
    expect(scoreAlignment([], 0)).toBe(0)
  })
})

describe('compare', () => {
  it('handles a sentence with several dropped words', () => {
    const result = compare('I would like a cup of coffee.', 'I would like cup coffee')

    expect(result.missing).toContain('a')
    expect(result.missing).toContain('of')
    expect(result.words.filter((w) => w.status === 'correct').map((w) => w.word)).toEqual([
      'i',
      'would',
      'like',
      'cup',
      'coffee',
    ])
    // Two of seven words missed.
    expect(result.score).toBe(71)
  })

  it('scores an exact reading as 100 regardless of punctuation and case', () => {
    const result = compare('I think this is a good idea.', 'i THINK this is a good idea')
    expect(result.score).toBe(100)
    expect(result.words.every((word) => word.status === 'correct')).toBe(true)
  })

  it('flags a mispronounced word as a problem and keeps what was heard', () => {
    const result = compare('I think this is a good idea.', 'I tink this is a good idea')

    const problem = result.words.find((word) => word.status === 'problem')
    expect(problem).toMatchObject({ word: 'think', spoken: 'tink' })
    // One of seven words mispronounced.
    expect(result.score).toBe(86)
  })

  it('records extra words separately from missing ones', () => {
    const result = compare('I like coffee.', 'I really like hot coffee')
    expect(result.extra).toEqual(['really', 'hot'])
    expect(result.missing).toEqual([])
    // Two extra words at half weight, against three expected: 1 - 1/3.
    expect(result.score).toBe(67)
  })

  it('counts words on both sides', () => {
    const result = compare('I like coffee.', 'I like tea')
    expect(result.expectedWordCount).toBe(3)
    expect(result.recognizedWordCount).toBe(3)
  })
})

describe('coaching', () => {
  it('finds the hand-written tip for a known word', () => {
    expect(lookupTip('think')).toMatchObject({ sound: 'TH' })
    expect(lookupTip('right')).toMatchObject({ sound: 'R' })
    expect(lookupTip('very')).toMatchObject({ sound: 'V' })
  })

  it('falls back to a sound pattern for words with no entry', () => {
    const tip = lookupTip('thimble')
    expect(tip?.sound).toBe('TH')
  })

  it('returns nothing when no rule applies', () => {
    expect(lookupTip('idea')).toBeNull()
  })

  it('attaches a tip to the problem word and reports what was missed', () => {
    const { words, feedback, tips } = coach(compare('I think this is a good idea.', 'I tink this is a good idea'))

    const problem = words.find((word) => word.status === 'problem')
    expect(problem?.sound).toBe('TH')
    expect(problem?.tip).toContain('tongue')

    expect(tips).toHaveLength(1)
    expect(feedback[0]).toContain('think')
  })

  it('names every missing word', () => {
    const { feedback } = coach(compare('I would like a cup of coffee.', 'I would like cup coffee'))
    expect(feedback[0]).toBe('You missed "a" and "of".')
  })

  it('congratulates a perfect attempt', () => {
    const { feedback, tips } = coach(compare('I like coffee.', 'I like coffee'))
    expect(feedback).toEqual(['Every word matched. Excellent speaking!'])
    expect(tips).toEqual([])
  })

  it('shows at most three tips', () => {
    const { tips } = coach(
      compare(
        'I think three very right things',
        'I tink tree berry rite tings',
      ),
    )
    expect(tips.length).toBeLessThanOrEqual(3)
  })
})

describe('exercise content', () => {
  it('provides thirty sentences with unique ids', () => {
    expect(EXERCISES).toHaveLength(30)
    expect(new Set(EXERCISES.map((exercise) => exercise.id)).size).toBe(30)
  })

  it('provides ten sentences at each level', () => {
    for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
      expect(EXERCISES.filter((exercise) => exercise.level === level)).toHaveLength(10)
    }
  })

  it('scores every sentence at 100 when read back exactly', () => {
    for (const exercise of EXERCISES) {
      expect(compare(exercise.text, exercise.text).score).toBe(100)
    }
  })
})
