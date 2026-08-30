/**
 * Minimal typings for the Web Speech API.
 *
 * The recognition half is not in TypeScript's bundled DOM library, so the
 * pieces this app uses are declared here.
 */

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

/**
 * `no-speech`, `audio-capture`, `not-allowed`, `network`, `aborted`,
 * `service-not-allowed`, `language-not-supported`.
 */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: ((event: Event) => void) | null
  onstart: ((event: Event) => void) | null
  /** The recognizer has opened the microphone. */
  onaudiostart: ((event: Event) => void) | null
  /** Any sound at all reached the recognizer, speech or not. */
  onsoundstart: ((event: Event) => void) | null
  /** The recognizer decided the sound was speech. */
  onspeechstart: ((event: Event) => void) | null
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition
  new (): SpeechRecognition
}

interface Window {
  SpeechRecognition?: typeof SpeechRecognition
  webkitSpeechRecognition?: typeof SpeechRecognition
}
