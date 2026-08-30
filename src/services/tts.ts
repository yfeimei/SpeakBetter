/**
 * Text-to-speech, using the browser's built-in SpeechSynthesis engine.
 *
 * Provides the model pronunciation the learner listens to before recording.
 */

export type SpeakRate = 'normal' | 'slow'

const RATES: Record<SpeakRate, number> = {
  normal: 0.95,
  slow: 0.6,
}

/** Voice list loads asynchronously in most browsers, so it is cached here. */
let cachedVoice: SpeechSynthesisVoice | null = null

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Prefer a natural-sounding US English voice, then any English voice, then
 * whatever the browser gives us.
 */
function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice

  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const preferred =
    voices.find((v) => v.lang === 'en-US' && /natural|google|samantha|aria/i.test(v.name)) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]

  cachedVoice = preferred
  return preferred
}

/** Warm the voice cache. Safe to call more than once. */
export function primeVoices(): void {
  if (!isSpeechSynthesisSupported()) return
  pickVoice()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null
    pickVoice()
  })
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.cancel()
}

/**
 * Speak a sentence. Resolves when playback finishes, rejects if the engine
 * reports an error.
 */
export function speak(text: string, rate: SpeakRate = 'normal'): Promise<void> {
  if (!isSpeechSynthesisSupported()) {
    return Promise.reject(new Error('This browser does not support text-to-speech.'))
  }

  // Never let two utterances overlap.
  window.speechSynthesis.cancel()

  return new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'en-US'
    utterance.rate = RATES[rate]
    utterance.pitch = 1

    utterance.onend = () => resolve()
    utterance.onerror = (event) => {
      // Cancelling an utterance fires an error; that is not a real failure.
      if (event.error === 'interrupted' || event.error === 'canceled') {
        resolve()
        return
      }
      reject(new Error('Playback failed. Please try again.'))
    }

    window.speechSynthesis.speak(utterance)
  })
}
