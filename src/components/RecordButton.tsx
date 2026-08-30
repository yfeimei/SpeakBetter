import type { RecorderStatus } from '../hooks/useSpeechRecorder'

interface RecordButtonProps {
  status: RecorderStatus
  elapsedMs: number
  /** Smoothed microphone level, 0 to 1. */
  level: number
  interimTranscript: string
  /** Auto-stop deadline, which scales with the length of the passage. */
  budgetMs: number
  onStart: () => void
  onStop: () => void
  disabled?: boolean
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

/**
 * Record / Stop control. While recording it becomes the live panel described
 * in section 5: a pulsing dot, the elapsed time, and a Stop button.
 */
export function RecordButton({
  status,
  elapsedMs,
  level,
  interimTranscript,
  budgetMs,
  onStart,
  onStop,
  disabled,
}: RecordButtonProps) {
  if (status === 'recording' || status === 'requesting') {
    const requesting = status === 'requesting'
    const remaining = Math.max(0, budgetMs - elapsedMs)

    return (
      <section className="recorder recorder--live" aria-live="polite">
        <p className="recorder__status">{requesting ? 'Starting…' : 'Recording…'}</p>

        <span
          className="recorder__dot"
          aria-hidden="true"
          // The dot grows with the learner's voice, so they can see they are heard.
          style={{ transform: `scale(${1 + level * 0.9})` }}
        />

        <p className="recorder__time">{formatElapsed(elapsedMs)}</p>

        <div className="recorder__meter" aria-hidden="true">
          <span
            className="recorder__meter-fill"
            style={{ width: `${100 - (remaining / budgetMs) * 100}%` }}
          />
        </div>

        <p className="recorder__hint">
          {interimTranscript ? `“${interimTranscript}”` : 'Read the passage out loud'}
        </p>

        <button
          type="button"
          className="btn btn--stop"
          onClick={onStop}
          disabled={requesting}
        >
          ■ Stop Recording
        </button>
      </section>
    )
  }

  if (status === 'processing') {
    return (
      <section className="recorder" aria-live="polite">
        <p className="recorder__status">Analyzing your speech…</p>
        <span className="spinner" aria-hidden="true" />
      </section>
    )
  }

  return (
    <section className="recorder">
      <button type="button" className="btn btn--record" onClick={onStart} disabled={disabled}>
        ● Record
      </button>
      <p className="recorder__hint">Up to {Math.round(budgetMs / 1000)} seconds</p>
    </section>
  )
}
