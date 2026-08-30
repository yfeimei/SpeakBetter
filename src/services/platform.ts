/**
 * Platform capability checks.
 *
 * SpeakBetter depends on the browser's own speech recognition, and support for
 * it varies more by platform than by anything the app controls. These helpers
 * keep that judgement in one place so the UI and the recorder agree.
 */

export type PlatformSupport =
  /** Chrome or Edge on a computer: everything works. */
  | 'full'
  /** A phone or tablet: recognition is unreliable here. */
  | 'mobile'
  /** A desktop browser with no speech recognition at all, e.g. Firefox. */
  | 'no-recognition'

export function hasRecognitionApi(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  )
}

/**
 * Whether this is a phone or tablet.
 *
 * There is no feature test for it — the difference that matters is how the
 * platform arbitrates microphone access, not what APIs it exposes — so this
 * comes down to a coarse check. Either signal is enough: `userAgentData.mobile`
 * is the more reliable one where it exists, but it reports false in
 * desktop-mode tabs and wherever Client Hints are not populated.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData

  return (
    uaData?.mobile === true ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac, distinguishable only by touch support.
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  )
}

export function getPlatformSupport(): PlatformSupport {
  if (!hasRecognitionApi()) return 'no-recognition'
  if (isMobileDevice()) return 'mobile'
  return 'full'
}
