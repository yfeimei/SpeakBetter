import { describe, expect, it } from 'vitest'
import { computeStats, formatSessionDay } from './progress'
import type { SessionRecord } from '../types'

function session(score: number, date = '2026-01-01T10:00:00.000Z'): SessionRecord {
  return {
    id: `${score}-${date}`,
    date,
    score,
    exerciseId: 1,
    level: 'beginner',
    sentence: 'I like coffee.',
  }
}

describe('computeStats', () => {
  it('returns zeros with no history', () => {
    expect(computeStats([])).toEqual({
      sessions: 0,
      averageScore: 0,
      bestScore: 0,
      lastScore: 0,
    })
  })

  it('summarises the stored attempts, newest first', () => {
    const stats = computeStats([session(81), session(96), session(75)])

    expect(stats.sessions).toBe(3)
    expect(stats.averageScore).toBe(84)
    expect(stats.bestScore).toBe(96)
    expect(stats.lastScore).toBe(81)
  })

  it('rounds the average to a whole percentage', () => {
    expect(computeStats([session(90), session(85)]).averageScore).toBe(88)
  })
})

describe('formatSessionDay', () => {
  const now = new Date(2026, 0, 15, 12, 0, 0)

  it('labels the current and previous day', () => {
    expect(formatSessionDay(new Date(2026, 0, 15, 9, 0, 0).toISOString(), now)).toBe('Today')
    expect(formatSessionDay(new Date(2026, 0, 14, 22, 0, 0).toISOString(), now)).toBe('Yesterday')
  })

  it('uses a short date for anything older', () => {
    const label = formatSessionDay(new Date(2026, 0, 3, 9, 0, 0).toISOString(), now)
    expect(label).not.toBe('Today')
    expect(label).not.toBe('Yesterday')
    expect(label.length).toBeGreaterThan(0)
  })

  it('ignores an unparseable date instead of throwing', () => {
    expect(formatSessionDay('not-a-date', now)).toBe('')
  })
})
