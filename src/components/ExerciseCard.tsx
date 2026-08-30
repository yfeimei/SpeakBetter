import type { SpeakRate } from '../services/tts'

import { countWords, isParagraph } from '../data/exercises'

interface ExerciseCardProps {
  sentence: string
  /** True while the model pronunciation is playing. */
  speaking: boolean
  onListen: (rate: SpeakRate) => void
  disabled?: boolean
}

/** The practice text with its Listen controls. */
export function ExerciseCard({ sentence, speaking, onListen, disabled }: ExerciseCardProps) {
  // A paragraph is set smaller and ranged left; a single sentence stays large
  // and centered, so it still reads like a headline.
  const paragraph = isParagraph(sentence)

  return (
    <section className="card exercise">
      <h2 className="card__label">
        {paragraph ? 'Practice Paragraph' : 'Practice Sentence'}
        <span className="exercise__words">{countWords(sentence)} words</span>
      </h2>
      <p className={`exercise__sentence ${paragraph ? 'exercise__sentence--paragraph' : ''}`}>
        &ldquo;{sentence}&rdquo;
      </p>

      <div className="exercise__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => onListen('normal')}
          disabled={disabled}
        >
          {speaking ? '🔊 Playing…' : '🔊 Listen'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => onListen('slow')}
          disabled={disabled}
        >
          🐢 Slowly
        </button>
      </div>
    </section>
  )
}
