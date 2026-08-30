import { useEffect, useRef } from 'react'
import { isMobileDevice } from '../services/platform'
import type { AnalysisResult } from '../types'
import { WordResult } from './WordResult'

/**
 * Starting volume for playing the learner's own recording back, 0 to 1.
 *
 * Has to be applied through a ref: `volume` is a property of the media element
 * rather than an attribute, so React will not set it from JSX. Left alone it
 * defaults to 1, which is why this played at full volume.
 *
 * Separate from the model voice's volume on purpose — one is synthesized at a
 * known level, the other is whatever the learner's microphone captured.
 */
const PLAYBACK_VOLUME = 0.5

interface ResultCardProps {
  result: AnalysisResult
  /** The learner's own recording, if the browser produced one. */
  audioUrl: string | null
  speaking: boolean
  onListen: () => void
  onTryAgain: () => void
  onNext: () => void
  /** Score of the previous attempt at this same sentence, if any. */
  previousScore: number | null
}

function scoreBand(score: number): { label: string; className: string } {
  if (score >= 90) return { label: 'Excellent', className: 'score--great' }
  if (score >= 75) return { label: 'Good', className: 'score--good' }
  if (score >= 50) return { label: 'Keep practicing', className: 'score--fair' }
  return { label: 'Try again', className: 'score--poor' }
}

/** Score, per-word breakdown, feedback, coaching tips, and the next actions. */
export function ResultCard({
  result,
  audioUrl,
  speaking,
  onListen,
  onTryAgain,
  onNext,
  previousScore,
}: ResultCardProps) {
  const band = scoreBand(result.score)
  const improvement = previousScore === null ? null : result.score - previousScore

  // Re-applied per recording: a new attempt swaps the src, and the element is
  // remounted whenever the result card comes and goes between attempts.
  const audioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = PLAYBACK_VOLUME
  }, [audioUrl])

  return (
    <section className="card result">
      <h2 className="card__label">Your Result</h2>

      <div className={`score ${band.className}`}>
        <span className="score__value">{result.score}</span>
        <span className="score__total">/ 100</span>
      </div>
      <p className="score__caption">
        Speaking Match · {band.label}
        {improvement !== null && improvement > 0 && (
          <span className="score__delta score__delta--up"> ▲ {improvement} from last try</span>
        )}
        {improvement !== null && improvement < 0 && (
          <span className="score__delta score__delta--down"> ▼ {Math.abs(improvement)} from last try</span>
        )}
      </p>

      <div className={`words ${result.words.length > 24 ? 'words--dense' : ''}`}>
        {result.words.map((word, index) => (
          <WordResult key={`${word.word}-${index}`} result={word} />
        ))}
      </div>

      <p className="result__heard">
        We heard: <span className="result__heard-text">&ldquo;{result.recognized}&rdquo;</span>
      </p>

      <ul className="feedback">
        {result.feedback.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>

      {result.tips.length > 0 && (
        <div className="tips">
          <h3 className="tips__title">Pronunciation Tip{result.tips.length > 1 ? 's' : ''}</h3>
          {result.tips.map((tip) => (
            <div className="tip" key={`${tip.word}-${tip.sound}`}>
              <p className="tip__head">
                <span className="tip__word">&ldquo;{tip.word}&rdquo;</span>
                <span className="tip__sound">{tip.sound} sound</span>
              </p>
              <p className="tip__body">{tip.tip}</p>
            </div>
          ))}
        </div>
      )}

      {result.suggestions.length > 0 && (
        <div className="suggestions">
          <h3 className="suggestions__title">What to work on next</h3>
          {result.suggestions.map((suggestion) => (
            <div className={`suggestion suggestion--${suggestion.kind}`} key={suggestion.title}>
              <p className="suggestion__head">{suggestion.title}</p>
              <p className="suggestion__body">{suggestion.detail}</p>
            </div>
          ))}
        </div>
      )}

      <div className="compare">
        <h3 className="compare__title">Compare</h3>
        <p className="compare__hint">
          Hear the model pronunciation, then your own attempt straight after.
        </p>

        <div className="compare__row">
          <span className="compare__label">Correct</span>
          <button type="button" className="btn btn--secondary compare__btn" onClick={onListen}>
            {speaking ? '🔊 Playing…' : '🔊 Listen'}
          </button>
        </div>

        <div className="compare__row">
          <span className="compare__label">You</span>
          {audioUrl ? (
            <audio
              ref={audioRef}
              className="compare__audio"
              src={audioUrl}
              controls
              preload="metadata"
            >
              Your browser cannot play the recording back.
            </audio>
          ) : isMobileDevice() ? (
            // Not a missing browser feature: on a phone the recorder and the
            // speech recognizer cannot share the microphone, and recognition
            // wins because the score depends on it. See `shouldCaptureAudio`.
            <span className="compare__missing">
              Hearing your own attempt back only works on a computer &mdash; on a phone the
              microphone is needed for the scoring.
            </span>
          ) : (
            <span className="compare__missing">
              Your recording could not be saved, so there is nothing to play back.
            </span>
          )}
        </div>
      </div>

      <div className="result__actions">
        <div className="result__actions-row">
          <button type="button" className="btn btn--primary" onClick={onTryAgain}>
            ↺ Try Again
          </button>
          <button type="button" className="btn btn--ghost" onClick={onNext}>
            Next Sentence →
          </button>
        </div>
      </div>
    </section>
  )
}
