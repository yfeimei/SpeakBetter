import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from '../components/Header'
import { ExerciseCard } from '../components/ExerciseCard'
import { RecordButton } from '../components/RecordButton'
import { ResultCard } from '../components/ResultCard'
import { CustomSentenceCard } from '../components/CustomSentenceCard'
import { PrivacyNotice } from '../components/PrivacyNotice'
import { SupportNotice } from '../components/SupportNotice'
import { LEVELS, LEVEL_LABELS, countWords, isParagraph } from '../data/exercises'
import { recordingBudgetMs, useSpeechRecorder } from '../hooks/useSpeechRecorder'
import {
  AnalysisError,
  CUSTOM_EXERCISE_ID,
  analyzeSpeech,
  analyzeText,
  fetchExercises,
} from '../services/api'
import {
  clearCustomSentences,
  loadCustomSentences,
  rememberCustomSentence,
} from '../services/customSentences'
import { cancelSpeech, speak, type SpeakRate } from '../services/tts'
import type { AnalysisResult, Exercise, Level } from '../types'

interface PracticeProps {
  level: Level
  onChangeLevel: (level: Level) => void
  onHome: () => void
  /** Called once per analyzed attempt so the parent can update progress. */
  onAttemptScored: (score: number, exerciseId: number, sentence: string) => void
  /** Open the custom sentence box immediately, when arriving from the home page. */
  autoOpenCustom?: boolean
}

export function Practice({
  level,
  onChangeLevel,
  onHome,
  onAttemptScored,
  autoOpenCustom = false,
}: PracticeProps) {
  const exercises = useMemo(() => fetchExercises(level), [level])

  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [previousScore, setPreviousScore] = useState<number | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)

  /** A sentence the learner typed, which replaces the library sentence. */
  const [customSentence, setCustomSentence] = useState<string | null>(null)
  const [recentCustom, setRecentCustom] = useState<string[]>(() => loadCustomSentences())

  const recorder = useSpeechRecorder()

  const exercise: Exercise = customSentence
    ? { id: CUSTOM_EXERCISE_ID, text: customSentence, level }
    : exercises[Math.min(index, exercises.length - 1)]

  const isCustom = exercise.id === CUSTOM_EXERCISE_ID

  /**
   * Last score per sentence, used to show improvement on a retry. Keyed by
   * exercise id for library sentences and by text for custom ones.
   */
  const scoreHistoryRef = useRef(new Map<number | string, number>())
  /** Prevents one completed recording from being analyzed twice. */
  const analyzedKeyRef = useRef<string | null>(null)

  // Turn a finished recording into a result. Recognition completing is the
  // trigger; everything downstream is synchronous local computation.
  useEffect(() => {
    if (recorder.status !== 'complete' || recorder.transcript.length === 0) return

    const key = `${exercise.id}:${exercise.text}:${recorder.transcript}`
    if (analyzedKeyRef.current === key) return
    analyzedKeyRef.current = key

    try {
      const analysis = isCustom
        ? analyzeText(exercise.text, recorder.transcript, recorder.meta)
        : analyzeSpeech(exercise.id, recorder.transcript, recorder.meta)

      // Custom sentences all share one id, so track improvement by text.
      const historyKey = isCustom ? exercise.text : exercise.id
      setPreviousScore(scoreHistoryRef.current.get(historyKey) ?? null)
      scoreHistoryRef.current.set(historyKey, analysis.score)

      setResult(analysis)
      setPageError(null)
      onAttemptScored(analysis.score, exercise.id, exercise.text)
    } catch (err) {
      setPageError(
        err instanceof AnalysisError
          ? err.message
          : 'We could not analyze that recording. Please try again.',
      )
    }
  }, [
    recorder.status,
    recorder.transcript,
    recorder.meta,
    exercise.id,
    exercise.text,
    isCustom,
    onAttemptScored,
  ])

  // Stop any narration when leaving the page.
  useEffect(() => cancelSpeech, [])

  const handleListen = useCallback(
    (rate: SpeakRate = 'normal') => {
      setSpeaking(true)
      setPageError(null)
      speak(exercise.text, rate)
        .catch((err: Error) => setPageError(err.message))
        .finally(() => setSpeaking(false))
    },
    [exercise.text],
  )

  const handleStart = useCallback(() => {
    cancelSpeech()
    setSpeaking(false)
    setResult(null)
    setPageError(null)

    // Longer passages need a longer budget, and need the recognizer to keep
    // listening through the pauses between sentences.
    void recorder.start({
      maxMs: recordingBudgetMs(countWords(exercise.text)),
      continuous: isParagraph(exercise.text),
    })
  }, [recorder, exercise.text])

  const handleTryAgain = useCallback(() => {
    cancelSpeech()
    analyzedKeyRef.current = null
    setResult(null)
    setPageError(null)
    recorder.reset()
  }, [recorder])

  /** Clear the current attempt. Leaving a custom sentence returns to the library. */
  const goToExercise = useCallback(
    (nextIndex: number) => {
      cancelSpeech()
      analyzedKeyRef.current = null
      setResult(null)
      setPreviousScore(null)
      setPageError(null)
      recorder.reset()
      setCustomSentence(null)
      setIndex(nextIndex)
    },
    [recorder],
  )

  const handleUseCustomSentence = useCallback(
    (sentence: string) => {
      cancelSpeech()
      analyzedKeyRef.current = null
      setResult(null)
      setPreviousScore(null)
      setPageError(null)
      recorder.reset()
      setCustomSentence(sentence)
      setRecentCustom(rememberCustomSentence(sentence))
    },
    [recorder],
  )

  const handleClearRecentCustom = useCallback(() => {
    clearCustomSentences()
    setRecentCustom([])
  }, [])

  const handleNext = useCallback(() => {
    // Leaving a custom sentence returns to where the learner was in the library.
    goToExercise(isCustom ? index : (index + 1) % exercises.length)
  }, [goToExercise, index, exercises.length, isCustom])

  const handlePrevious = useCallback(() => {
    goToExercise((index - 1 + exercises.length) % exercises.length)
  }, [goToExercise, index, exercises.length])

  const handleLevelChange = useCallback(
    (nextLevel: Level) => {
      goToExercise(0)
      onChangeLevel(nextLevel)
    },
    [goToExercise, onChangeLevel],
  )

  const isBusy =
    recorder.status === 'recording' ||
    recorder.status === 'requesting' ||
    recorder.status === 'processing'

  /**
   * Entry point for practicing a typed sentence. Rendered before the Record
   * button while waiting, and again below the result — wanting to try your own
   * sentence is just as likely right after seeing a score.
   */
  const customEntry = isCustom ? (
    <button
      type="button"
      className="btn btn--ghost custom__toggle"
      onClick={() => goToExercise(index)}
      disabled={isBusy}
    >
      ← Back to the sentence library
    </button>
  ) : (
    <CustomSentenceCard
      recent={recentCustom}
      onSubmit={handleUseCustomSentence}
      onClearRecent={handleClearRecentCustom}
      disabled={isBusy}
      defaultOpen={autoOpenCustom}
    />
  )

  return (
    <div className="page page--practice">
      <Header
        counter={isCustom ? 'Your sentence' : `${index + 1} / ${exercises.length}`}
        onHome={onHome}
      />

      <div className="practice__levels" role="group" aria-label="Difficulty level">
        {LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${option === level ? 'chip--active' : ''}`}
            onClick={() => handleLevelChange(option)}
            disabled={isBusy}
            aria-pressed={option === level}
          >
            {LEVEL_LABELS[option]}
          </button>
        ))}
      </div>

      <SupportNotice variant="compact" />

      <ExerciseCard
        sentence={exercise.text}
        speaking={speaking}
        onListen={handleListen}
        disabled={isBusy}
      />

      {!result && customEntry}

      {!result && (
        <RecordButton
          status={recorder.status}
          elapsedMs={recorder.elapsedMs}
          level={recorder.level}
          interimTranscript={recorder.interimTranscript}
          budgetMs={
            recorder.status === 'idle' || recorder.status === 'error'
              ? recordingBudgetMs(countWords(exercise.text))
              : recorder.budgetMs
          }
          onStart={handleStart}
          onStop={recorder.stop}
          disabled={!recorder.recognitionSupported}
        />
      )}

      {!result && recorder.recognitionSupported && <PrivacyNotice variant="compact" />}

      {recorder.error && !result && (
        <div className="notice notice--error" role="alert">
          <p>{recorder.error.message}</p>
          <button type="button" className="btn btn--primary" onClick={handleTryAgain}>
            ↺ Try Again
          </button>
        </div>
      )}

      {pageError && (
        <div className="notice notice--error" role="alert">
          <p>{pageError}</p>
        </div>
      )}

      {result && (
        <ResultCard
          result={result}
          audioUrl={recorder.audioUrl}
          speaking={speaking}
          onListen={() => handleListen('normal')}
          onTryAgain={handleTryAgain}
          onNext={handleNext}
          previousScore={previousScore}
        />
      )}

      {result && customEntry}

      <nav className="practice__nav">
        <button type="button" className="btn btn--ghost" onClick={handlePrevious} disabled={isBusy}>
          ← Previous
        </button>
        <button type="button" className="btn btn--ghost" onClick={handleNext} disabled={isBusy}>
          Skip →
        </button>
      </nav>
    </div>
  )
}
