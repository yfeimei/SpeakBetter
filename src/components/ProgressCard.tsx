import { computeStats, formatSessionDay } from '../services/progress'
import type { SessionRecord } from '../types'

interface ProgressCardProps {
  sessions: SessionRecord[]
  /** How many recent attempts to list. */
  historyLimit?: number
  onClear?: () => void
}

/** Practice statistics and recent history (section 11). */
export function ProgressCard({ sessions, historyLimit = 6, onClear }: ProgressCardProps) {
  const stats = computeStats(sessions)
  const history = sessions.slice(0, historyLimit)

  return (
    <section className="card progress">
      <h2 className="card__label">Your Progress</h2>

      {stats.sessions === 0 ? (
        <p className="progress__empty">
          No practice yet. Your scores will appear here after your first recording.
        </p>
      ) : (
        <>
          <dl className="stats">
            <div className="stat">
              <dt>Practice Sessions</dt>
              <dd>{stats.sessions}</dd>
            </div>
            <div className="stat">
              <dt>Average Match</dt>
              <dd>{stats.averageScore}%</dd>
            </div>
            <div className="stat">
              <dt>Best Score</dt>
              <dd>{stats.bestScore}%</dd>
            </div>
            <div className="stat">
              <dt>Last Session</dt>
              <dd>{stats.lastScore}%</dd>
            </div>
          </dl>

          <ul className="history">
            {history.map((session) => (
              <li className="history__row" key={session.id}>
                <span className="history__day">{formatSessionDay(session.date)}</span>
                <span className="history__sentence" title={session.sentence}>
                  {session.sentence}
                </span>
                <span className="history__score">{session.score}%</span>
              </li>
            ))}
          </ul>

          {onClear && (
            <button type="button" className="btn btn--link" onClick={onClear}>
              Clear history
            </button>
          )}
        </>
      )}
    </section>
  )
}
