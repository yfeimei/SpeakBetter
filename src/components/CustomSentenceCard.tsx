import { useState, type FormEvent } from 'react'
import { MAX_CUSTOM_SENTENCE_LENGTH, validateCustomSentence } from '../services/api'

interface CustomSentenceCardProps {
  /** Previously used sentences, newest first. */
  recent: string[]
  onSubmit: (sentence: string) => void
  onClearRecent: () => void
  disabled?: boolean
  /** Start expanded, for when the learner arrived here on purpose. */
  defaultOpen?: boolean
}

/**
 * Lets the learner practice a sentence of their own instead of one from the
 * library. Collapsed by default so it does not compete with the main flow.
 */
export function CustomSentenceCard({
  recent,
  onSubmit,
  onClearRecent,
  disabled,
  defaultOpen = false,
}: CustomSentenceCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const result = validateCustomSentence(value)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setError(null)
    setValue('')
    onSubmit(result.text)
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn--ghost custom__toggle"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        ✎ Practice your own sentence
      </button>
    )
  }

  return (
    <section className="card custom">
      <h2 className="card__label">Your own sentence or paragraph</h2>

      <form onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="custom-sentence">
          Sentence to practice
        </label>
        <textarea
          id="custom-sentence"
          className="custom__input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            if (error) setError(null)
          }}
          placeholder="Type any English sentence or paragraph you want to practice…"
          rows={4}
          maxLength={MAX_CUSTOM_SENTENCE_LENGTH}
          autoFocus
        />

        <div className="custom__meta">
          <span className={value.length > MAX_CUSTOM_SENTENCE_LENGTH - 40 ? 'custom__count--warn' : ''}>
            {value.length} / {MAX_CUSTOM_SENTENCE_LENGTH}
          </span>
          <span>A sentence or a short paragraph</span>
        </div>

        {error && (
          <p className="custom__error" role="alert">
            {error}
          </p>
        )}

        <div className="custom__actions">
          <button type="submit" className="btn btn--primary" disabled={disabled}>
            Practice this
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
          >
            Cancel
          </button>
        </div>
      </form>

      {recent.length > 0 && (
        <div className="custom__recent">
          <p className="custom__recent-label">Recent</p>
          <div className="custom__recent-list">
            {recent.map((sentence) => (
              <button
                key={sentence}
                type="button"
                className="chip chip--sentence"
                onClick={() => onSubmit(sentence)}
                disabled={disabled}
                title={sentence}
              >
                {sentence}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--link" onClick={onClearRecent}>
            Clear saved sentences
          </button>
        </div>
      )}
    </section>
  )
}
