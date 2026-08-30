/**
 * Recently practiced custom sentences, stored in localStorage.
 *
 * Retyping a sentence for every retry is tedious, so the last few are kept
 * and offered as one-click chips.
 */

const STORAGE_KEY = 'speakbetter.custom.v1'

/** How many recent sentences to remember. */
const MAX_REMEMBERED = 5

export function loadCustomSentences(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_REMEMBERED)
  } catch {
    return []
  }
}

/** Move a sentence to the front of the list and return the new list. */
export function rememberCustomSentence(sentence: string): string[] {
  const existing = loadCustomSentences().filter(
    (item) => item.toLowerCase() !== sentence.toLowerCase(),
  )
  const updated = [sentence, ...existing].slice(0, MAX_REMEMBERED)

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage unavailable; the sentence still works for this session.
  }

  return updated
}

export function clearCustomSentences(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
