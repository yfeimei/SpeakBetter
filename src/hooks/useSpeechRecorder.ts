/**
 * Recording controller.
 *
 * Runs two things off one microphone permission:
 *   - MediaRecorder, for the elapsed timer, the live level meter, the
 *     length cap, and letting the learner play their own attempt back.
 *   - SpeechRecognition, for the transcript that feeds the analysis.
 *
 * The captured audio never leaves the browser and is released as soon as the
 * learner moves on, which satisfies the privacy requirement in section 13.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { tokenize } from '../engine/normalize'
import { hasRecognitionApi, isMobileDevice } from '../services/platform'
import type { SpeechMeta } from '../types'

/** Shortest recording budget, used for single sentences. */
export const MIN_RECORDING_MS = 15_000
/** Hard ceiling, so a stuck session cannot run forever (section 5). */
export const MAX_RECORDING_MS = 180_000

/**
 * Speaking time allowed per word of the target text.
 *
 * Set for a learner reading aloud, not a native speaker at conversational
 * pace: 1.2 s a word is about 50 words a minute, which leaves room to hesitate,
 * start a word again, or lose your place — the things this app exists to help
 * with. Timing someone out mid-sentence teaches them nothing.
 */
const MS_PER_WORD = 1_200
/** Extra time for getting started and finishing off. */
const RECORDING_LEAD_MS = 6_000

/**
 * How long to allow for reading a given text aloud. A single sentence gets the
 * 15-second minimum; a fifty-word paragraph gets a little over a minute; and
 * anything from roughly 145 words up gets the full three minutes.
 */
export function recordingBudgetMs(wordCount: number): number {
  const budget = RECORDING_LEAD_MS + wordCount * MS_PER_WORD
  return Math.min(MAX_RECORDING_MS, Math.max(MIN_RECORDING_MS, budget))
}

export interface RecordingOptions {
  /** Auto-stop after this long. Defaults to the minimum budget. */
  maxMs?: number
  /**
   * Keep listening across pauses. Required for paragraphs: with this off the
   * recognizer stops at the first full stop and only the opening sentence is
   * ever transcribed.
   */
  continuous?: boolean
}

/** If recognition never reports completion, stop waiting after this long. */
const RECOGNITION_GRACE_MS = 5_000

/** Below this many bytes the recording is treated as empty. */
const MIN_AUDIO_BYTES = 1_200

/**
 * MediaRecorder is started with this timeslice so audio arrives in chunks
 * while recording. Without it, `ondataavailable` fires only once on stop —
 * which happens *after* we decide whether the recording was empty, making
 * that check always see zero bytes.
 */
const RECORDER_TIMESLICE_MS = 500

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'processing'
  | 'complete'
  | 'error'

export type RecorderErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'no-microphone'
  | 'no-speech'
  /** Sound arrived, but the recognizer did not judge any of it to be speech. */
  | 'not-speech'
  /** The microphone opened and stayed completely silent. */
  | 'silent-microphone'
  /** The recognizer never even opened the microphone. */
  | 'no-audio-stream'
  | 'empty-recording'
  | 'network'
  | 'service-failure'
  | 'unknown'

export interface RecorderError {
  code: RecorderErrorCode
  message: string
}

const ERROR_MESSAGES: Record<RecorderErrorCode, string> = {
  unsupported:
    'This browser cannot listen to speech. Please use Google Chrome or Microsoft Edge on a computer.',
  'permission-denied':
    'Microphone access was blocked. Allow the microphone in your browser settings, then try again.',
  'no-microphone': 'No microphone was found. Please connect one and try again.',
  'no-speech': "We did not hear anything. Move a little closer to the microphone and try again.",
  'not-speech':
    'We picked up sound but could not make out any words. Try speaking a little louder, and move somewhere quieter if you can.',
  'silent-microphone':
    'The microphone opened but stayed silent. Check it is not muted, and close any other app that might be using it — then try again.',
  'no-audio-stream':
    'The microphone could not be opened. On a phone, close other apps that use the microphone and reload the page.',
  'empty-recording': 'The recording was empty. Please try again and speak clearly.',
  network:
    'Speech recognition needs an internet connection. Please check your network and try again.',
  'service-failure': 'The speech service did not respond. Please try again in a moment.',
  unknown: 'Something went wrong while recording. Please try again.',
}

/** The shape of one recognition alternative, kept minimal so it can be tested. */
export interface RecognitionResultLike {
  isFinal: boolean
  readonly [index: number]: { transcript: string; confidence: number }
}

/** Whether every word of `shorter` opens `longer`, comparing like for like. */
function isPrefixOf(shorter: string[], longer: string[]): boolean {
  return shorter.length <= longer.length && shorter.every((word, i) => word === longer[i])
}

/** Which side of a merge the surviving text came from, so confidence can follow it. */
export type TranscriptMergeKeep = 'both' | 'committed' | 'incoming'

export interface TranscriptMerge {
  text: string
  keep: TranscriptMergeKeep
}

/**
 * Join two pieces of transcript, suppressing a restatement of what we already
 * have rather than concatenating it.
 *
 * Android Chrome does not just re-deliver a result list — it emits a run of
 * *final* results that each restate the utterance from the beginning: "I",
 * then "I usually", then "I usually go". Concatenating those gives the learner
 * "I I usually I usually go", and the comparison engine scores every restated
 * word as an extra one.
 *
 * Whichever side is the longer restatement wins; anything else is a genuine
 * continuation and is appended. The test is deliberately limited to whole
 * prefixes, because that is the exact shape the recognizer produces. A looser
 * rule — collapsing any overlap between the end of one piece and the start of
 * the next — would eat real repetition, and "I go to work, work is fun" is
 * something a learner may well say.
 */
export function mergeTranscripts(committed: string, incoming: string): TranscriptMerge {
  const incomingWords = tokenize(incoming)
  if (incomingWords.length === 0) return { text: committed, keep: 'committed' }

  const committedWords = tokenize(committed)
  if (committedWords.length === 0) return { text: incoming, keep: 'incoming' }

  // Equal lists satisfy both tests; taking `incoming` first makes a plain
  // re-delivery a no-op.
  if (isPrefixOf(committedWords, incomingWords)) return { text: incoming, keep: 'incoming' }
  if (isPrefixOf(incomingWords, committedWords)) return { text: committed, keep: 'committed' }

  return { text: `${committed.trim()} ${incoming.trim()}`, keep: 'both' }
}

/**
 * Build a session's transcript from the recognizer's cumulative result list.
 *
 * Deliberately reads the whole list every time and returns a complete value,
 * rather than appending the slice from `resultIndex`. Android Chrome re-emits
 * earlier results with `resultIndex` back at 0; appending then duplicates
 * whole sentences, which the comparison engine sees as a run of extra words.
 * Reading everything makes the operation idempotent, so a re-delivery is
 * harmless.
 *
 * Reading everything is not enough on its own, though: the list itself can
 * hold the same utterance several times over, growing a word at a time, so the
 * results are folded together with `mergeTranscripts` rather than joined.
 */
export function collectSessionTranscript(results: ArrayLike<RecognitionResultLike>): {
  final: string
  interim: string
  confidences: number[]
} {
  let final = ''
  let interim = ''
  let confidences: number[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const alternative = result[0]
    if (!alternative) continue

    if (result.isFinal) {
      const merged = mergeTranscripts(final, alternative.transcript)
      final = merged.text

      if (merged.keep === 'incoming') {
        // A restatement replaces the run it restates, and so does its score.
        confidences = [alternative.confidence]
      } else if (merged.keep === 'both') {
        confidences = [...confidences, alternative.confidence]
      }
    } else {
      interim = mergeTranscripts(interim, alternative.transcript).text
    }
  }

  // The trailing space keeps this safe to concatenate; `finish` collapses it.
  return { final: final === '' ? '' : `${final} `, interim, confidences }
}

function createRecognition(continuous: boolean): SpeechRecognition | null {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!Ctor) return null

  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = continuous
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  return recognition
}

export function isRecognitionSupported(): boolean {
  return hasRecognitionApi()
}

/**
 * Whether to open our own microphone stream alongside speech recognition.
 *
 * On desktop Chrome the two coexist happily, which is what powers the level
 * meter and the play-back-your-own-recording feature. On Android they do not:
 * the recognizer is starved of audio while MediaRecorder holds the microphone,
 * and every attempt comes back as `no-speech`.
 *
 * There is no feature test for this — it is a platform behaviour difference,
 * not a capability — so it comes down to a coarse mobile check. Override with
 * `?capture=1` or `?capture=0` when testing.
 */
export function shouldCaptureAudio(): boolean {
  if (typeof window === 'undefined') return false

  const override = new URLSearchParams(window.location.search).get('capture')
  if (override === '1') return true
  if (override === '0') return false

  // Being wrong towards "mobile" only costs the level meter and self-playback;
  // being wrong the other way breaks recording entirely.
  return !isMobileDevice()
}

/** Map a SpeechRecognition error string onto our own error codes. */
function mapRecognitionError(error: string): RecorderErrorCode {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'permission-denied'
    case 'audio-capture':
      return 'no-microphone'
    case 'no-speech':
      return 'no-speech'
    case 'network':
      return 'network'
    default:
      return 'service-failure'
  }
}

export interface SpeechRecorder {
  status: RecorderStatus
  /** Milliseconds recorded so far. */
  elapsedMs: number
  /** Smoothed microphone level, 0 to 1, for the recording indicator. */
  level: number
  /** Final transcript, available once status is `complete`. */
  transcript: string
  /** Recording length and recognizer confidence, for the suggestion engine. */
  meta: SpeechMeta
  /** Live partial transcript shown while speaking. */
  interimTranscript: string
  /** Object URL for the learner's own recording, or null. */
  audioUrl: string | null
  error: RecorderError | null
  recognitionSupported: boolean
  /** Auto-stop deadline for the recording in progress. */
  budgetMs: number
  start: (options?: RecordingOptions) => Promise<void>
  stop: () => void
  reset: () => void
}

export function useSpeechRecorder(): SpeechRecorder {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [level, setLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [meta, setMeta] = useState<SpeechMeta>({})
  const [interimTranscript, setInterimTranscript] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<RecorderError | null>(null)
  const [budgetMs, setBudgetMs] = useState(MIN_RECORDING_MS)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)
  const autoStopRef = useRef<number | null>(null)
  const graceRef = useRef<number | null>(null)

  /**
   * Transcript from recognition sessions that have already ended. In
   * continuous mode a passage can span several sessions, because Android
   * Chrome stops and has to be restarted between sentences.
   */
  const committedTranscriptRef = useRef('')
  /**
   * Transcript for the session currently running. Replaced wholesale on each
   * result event, never appended to — see the comment in `onresult`.
   */
  const sessionTranscriptRef = useRef('')
  /** True once the user pressed Stop or the budget ran out. */
  const stoppingRef = useRef(false)
  /** Set when recognition reports a failure, so `finish` can report it. */
  const pendingErrorRef = useRef<RecorderErrorCode | null>(null)
  /** Number of bytes captured, used to detect a silent or empty recording. */
  const audioBytesRef = useRef(0)
  /** Guards against `finish` running twice for one recording. */
  const finishedRef = useRef(false)
  /** performance.now() at the moment recording started. */
  const startedAtRef = useRef(0)
  /** How far the recognizer got: microphone open, sound arriving, speech detected. */
  const heardRef = useRef({ audio: false, sound: false, speech: false })
  /** Confidence values from sessions that have already ended. */
  const committedConfidencesRef = useRef<number[]>([])
  /** Confidence values for the running session, replaced on each result event. */
  const sessionConfidencesRef = useRef<number[]>([])
  /** Latest object URL, so it can be revoked without re-running effects. */
  const audioUrlRef = useRef<string | null>(null)

  const clearTimers = useCallback(() => {
    for (const ref of [tickRef, autoStopRef, graceRef]) {
      if (ref.current !== null) {
        window.clearTimeout(ref.current)
        window.clearInterval(ref.current)
        ref.current = null
      }
    }
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  /** Release the microphone and audio graph. */
  const releaseHardware = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close()
    }
    audioContextRef.current = null

    setLevel(0)
  }, [])

  /**
   * Fold the running session's text into the committed total.
   *
   * Merged rather than appended for the same reason results are within a
   * session: a restarted recognizer on Android sometimes opens by restating
   * the passage so far instead of carrying on from where it stopped.
   */
  const commitSession = useCallback(() => {
    if (!sessionTranscriptRef.current) {
      sessionConfidencesRef.current = []
      return
    }

    const merged = mergeTranscripts(
      committedTranscriptRef.current,
      sessionTranscriptRef.current,
    )
    committedTranscriptRef.current = merged.text

    if (merged.keep === 'incoming') {
      committedConfidencesRef.current = [...sessionConfidencesRef.current]
    } else if (merged.keep === 'both') {
      committedConfidencesRef.current.push(...sessionConfidencesRef.current)
    }

    sessionTranscriptRef.current = ''
    sessionConfidencesRef.current = []
  }, [])

  /** Settle the recording into either `complete` or `error`. */
  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true

    clearTimers()
    releaseHardware()
    commitSession()

    const text = committedTranscriptRef.current.replace(/\s+/g, ' ').trim()
    setInterimTranscript('')

    if (text.length > 0) {
      // Chrome reports confidence only for some results; average whatever
      // it gave us and omit the field entirely when it gave us nothing.
      const scores = committedConfidencesRef.current.filter((value) => value > 0)
      const confidence =
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined

      setMeta({
        durationMs: startedAtRef.current > 0 ? performance.now() - startedAtRef.current : undefined,
        confidence,
      })
      setTranscript(text)
      setStatus('complete')
      return
    }

    let code = pendingErrorRef.current
    if (!code) {
      const heard = heardRef.current

      if (heard.sound && !heard.speech) {
        // Sound arrived but the recognizer did not judge it to be speech.
        code = 'not-speech'
      } else if (heard.audio && !heard.sound) {
        // The microphone opened but stayed silent. Usually another app holds
        // it, the wrong input is selected, or it is muted in hardware.
        code = 'silent-microphone'
      } else if (!heard.audio) {
        code = 'no-audio-stream'
      } else {
        code = audioBytesRef.current < MIN_AUDIO_BYTES ? 'empty-recording' : 'no-speech'
      }
    }

    setError({ code, message: ERROR_MESSAGES[code] })
    setStatus('error')
  }, [clearTimers, commitSession, releaseHardware])

  const stop = useCallback(() => {
    // Tell `onend` this was deliberate, so it settles instead of restarting
    // for another sentence.
    stoppingRef.current = true

    // Recognition drives completion; `onend` calls finish().
    if (recognitionRef.current) {
      setStatus('processing')
      try {
        recognitionRef.current.stop()
      } catch {
        // Already stopped.
      }

      // If recognition goes quiet, settle anyway rather than hanging.
      graceRef.current = window.setTimeout(finish, RECOGNITION_GRACE_MS)
    } else {
      finish()
    }

    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
  }, [finish])

  /** Drive the level meter from the live microphone stream. */
  const startLevelMeter = useCallback((stream: MediaStream) => {
    type AudioContextCtor = typeof AudioContext
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
    if (!Ctor) return

    const context = new Ctor()
    audioContextRef.current = context

    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    context.createMediaStreamSource(stream).connect(analyser)

    const samples = new Uint8Array(analyser.frequencyBinCount)
    let smoothed = 0

    const tick = () => {
      analyser.getByteTimeDomainData(samples)

      // Root mean square around the 128 midpoint gives loudness.
      let sumSquares = 0
      for (const sample of samples) {
        const centered = (sample - 128) / 128
        sumSquares += centered * centered
      }
      const rms = Math.sqrt(sumSquares / samples.length)

      smoothed = smoothed * 0.8 + Math.min(1, rms * 4) * 0.2
      setLevel(smoothed)

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    releaseHardware()

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // Already stopped.
      }
      recognitionRef.current = null
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }

    committedTranscriptRef.current = ''
    sessionTranscriptRef.current = ''
    pendingErrorRef.current = null
    audioBytesRef.current = 0
    finishedRef.current = false
    stoppingRef.current = false
    startedAtRef.current = 0
    committedConfidencesRef.current = []
    sessionConfidencesRef.current = []
    heardRef.current = { audio: false, sound: false, speech: false }

    setStatus('idle')
    setElapsedMs(0)
    setTranscript('')
    setMeta({})
    setInterimTranscript('')
    setAudioUrl(null)
    setError(null)
  }, [clearTimers, releaseHardware])

  const start = useCallback(
    async (options: RecordingOptions = {}) => {
    const maxMs = options.maxMs ?? MIN_RECORDING_MS
    reset()
    setBudgetMs(maxMs)

    if (!isRecognitionSupported()) {
      setError({ code: 'unsupported', message: ERROR_MESSAGES.unsupported })
      setStatus('error')
      return
    }

    setStatus('requesting')
    finishedRef.current = false

    // --- Audio capture, when the platform allows it ------------------------
    // Skipped on mobile: holding the microphone here starves the recognizer.
    // The timer still works, the dot still pulses on its CSS animation, and
    // the result card already handles having no recording to play back.
    if (shouldCaptureAudio()) {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        const name = err instanceof DOMException ? err.name : ''
        const code: RecorderErrorCode =
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'permission-denied'
            : name === 'NotFoundError' || name === 'DevicesNotFoundError'
              ? 'no-microphone'
              : 'unknown'

        setError({ code, message: ERROR_MESSAGES[code] })
        setStatus('error')
        return
      }

      streamRef.current = stream

      try {
        const recorder = new MediaRecorder(stream)
        const chunks: Blob[] = []

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
            audioBytesRef.current += event.data.size
          }
        }

        recorder.onstop = () => {
          if (chunks.length === 0) return
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
          const url = URL.createObjectURL(blob)
          audioUrlRef.current = url
          setAudioUrl(url)
        }

        recorderRef.current = recorder
        recorder.start(RECORDER_TIMESLICE_MS)
      } catch {
        // Recording is a convenience; recognition can still run without it.
        recorderRef.current = null
      }

      startLevelMeter(stream)
    }

    // --- Recognition -------------------------------------------------------
    const continuous = options.continuous ?? false
    const startedAt = performance.now()
    const deadline = startedAt + maxMs

    stoppingRef.current = false

    /**
     * Create, wire and start one recognition session.
     *
     * Called again from `onend` when the recognizer stops early mid-passage,
     * which Android Chrome does routinely even with `continuous` set.
     */
    const launchRecognition = (): boolean => {
      const recognition = createRecognition(continuous)
      if (!recognition) return false

      recognition.onresult = (event) => {
        const { final, interim, confidences } = collectSessionTranscript(event.results)

        // Replaced, never appended — see collectSessionTranscript.
        sessionTranscriptRef.current = final
        sessionConfidencesRef.current = confidences
        setInterimTranscript(interim)
      }

      // Lifecycle events, used to tell apart "the microphone never delivered
      // any audio" from "we heard you but could not make out words". Without
      // these both look identical, and they need completely different advice.
      recognition.onaudiostart = () => {
        heardRef.current.audio = true
      }
      recognition.onsoundstart = () => {
        heardRef.current.sound = true
      }
      recognition.onspeechstart = () => {
        heardRef.current.speech = true
      }

      recognition.onerror = (event) => {
        // `aborted` is what a deliberate cancel looks like, not a failure.
        if (event.error === 'aborted') return
        // `no-speech` between sentences is normal in continuous mode; only
        // treat it as fatal once nothing at all has been captured.
        if (event.error === 'no-speech' && continuous) return
        pendingErrorRef.current = mapRecognitionError(event.error)
      }

      recognition.onend = () => {
        // Roll this session's text into the running total before any restart,
        // because a new session resets `event.results`.
        commitSession()

        const timeLeft = performance.now() < deadline - 500
        const shouldContinue =
          continuous && !stoppingRef.current && !finishedRef.current && timeLeft &&
          pendingErrorRef.current === null

        if (shouldContinue && launchRecognition()) return

        finish()
      }

      recognitionRef.current = recognition

      try {
        recognition.start()
        return true
      } catch {
        return false
      }
    }

    if (!launchRecognition()) {
      releaseHardware()
      const code: RecorderErrorCode = isRecognitionSupported() ? 'service-failure' : 'unsupported'
      setError({ code, message: ERROR_MESSAGES[code] })
      setStatus('error')
      return
    }

    // --- Timers ------------------------------------------------------------
    startedAtRef.current = startedAt
    setElapsedMs(0)
    setStatus('recording')

    tickRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt)
    }, 100)

      autoStopRef.current = window.setTimeout(stop, maxMs)
    },
    [commitSession, finish, releaseHardware, reset, startLevelMeter, stop],
  )

  // Release the microphone and any object URL if the page unmounts mid-session.
  useEffect(() => {
    return () => {
      clearTimers()
      releaseHardware()
      recognitionRef.current?.abort()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [clearTimers, releaseHardware])

  return {
    status,
    elapsedMs,
    level,
    transcript,
    meta,
    interimTranscript,
    audioUrl,
    error,
    recognitionSupported: isRecognitionSupported(),
    budgetMs,
    start,
    stop,
    reset,
  }
}
