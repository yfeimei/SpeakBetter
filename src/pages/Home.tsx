import { Header } from '../components/Header'
import { ProgressCard } from '../components/ProgressCard'
import { PrivacyNotice } from '../components/PrivacyNotice'
import { SupportNotice } from '../components/SupportNotice'
import { LEVELS, LEVEL_LABELS } from '../data/exercises'
import type { Level, SessionRecord } from '../types'

interface HomeProps {
  sessions: SessionRecord[]
  selectedLevel: Level
  onSelectLevel: (level: Level) => void
  onStart: () => void
  /** Go straight to practice with the custom sentence box already open. */
  onStartCustom: () => void
  onClearHistory: () => void
}

export function Home({
  sessions,
  selectedLevel,
  onSelectLevel,
  onStart,
  onStartCustom,
  onClearHistory,
}: HomeProps) {
  return (
    <div className="page page--home">
      <Header />

      <section className="hero">
        <h1 className="hero__title">SpeakBetter</h1>
        <p className="hero__subtitle">Your Personal English Coach</p>
        <p className="hero__tagline">Practice speaking. Get feedback. Improve.</p>
      </section>

      <SupportNotice />

      <section className="card levels">
        <h2 className="card__label">Choose a level</h2>
        <div className="levels__grid">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`level ${selectedLevel === level ? 'level--active' : ''}`}
              onClick={() => onSelectLevel(level)}
              aria-pressed={selectedLevel === level}
            >
              <span className="level__name">{LEVEL_LABELS[level]}</span>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn--primary btn--large" onClick={onStart}>
          Start Practicing
        </button>

        <p className="levels__or">
          or{' '}
          <button type="button" className="btn btn--link" onClick={onStartCustom}>
            practice your own sentence
          </button>
        </p>
      </section>

      <ProgressCard sessions={sessions} onClear={onClearHistory} />

      <footer className="footer">
        <SupportNotice variant="note" />
        <PrivacyNotice />
        <p className="footer__credit">Built by Emily Fei</p>
      </footer>
    </div>
  )
}
