/**
 * Practice history, stored in localStorage (section 11).
 *
 * One record per analyzed attempt. Everything stays on the learner's own
 * machine; there are no accounts and nothing is uploaded.
 */

import type { Level, ProgressStats, SessionRecord } from '../types'

const STORAGE_KEY = 'speakbetter.progress.v1'

/** Keeps localStorage small while covering far more than the history view shows. */
const MAX_RECORDS = 200

function isSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    typeof record.score === 'number' &&
    typeof record.exerciseId === 'number' &&
    typeof record.level === 'string' &&
    typeof record.sentence === 'string'
  )
}

/**
 * Read the stored history, newest first.
 *
 * Storage can be unavailable (private browsing, disabled cookies) or hold
 * data from an older build, so anything unreadable is treated as empty rather
 * than crashing the page.
 */
export function loadSessions(): SessionRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isSessionRecord)
  } catch {
    return []
  }
}

function saveSessions(sessions: SessionRecord[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_RECORDS)))
  } catch {
    // Out of quota or storage blocked; practice still works, it just is not remembered.
  }
}

/** Append one attempt and return the updated history, newest first. */
export function recordSession(input: {
  score: number
  exerciseId: number
  level: Level
  sentence: string
}): SessionRecord[] {
  const record: SessionRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    ...input,
  }

  const sessions = [record, ...loadSessions()]
  saveSessions(sessions)
  return sessions
}

export function clearSessions(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do; the page will simply keep showing what it has.
  }
}

export function computeStats(sessions: SessionRecord[]): ProgressStats {
  if (sessions.length === 0) {
    return { sessions: 0, averageScore: 0, bestScore: 0, lastScore: 0 }
  }

  const total = sessions.reduce((sum, session) => sum + session.score, 0)

  return {
    sessions: sessions.length,
    averageScore: Math.round(total / sessions.length),
    bestScore: Math.max(...sessions.map((session) => session.score)),
    // Sessions are stored newest first.
    lastScore: sessions[0].score,
  }
}

/** "Today", "Yesterday", or a short date for anything older. */
export function formatSessionDay(isoDate: string, now: Date = new Date()): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayDifference = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (dayDifference <= 0) return 'Today'
  if (dayDifference === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
