/**
 * Render smoke tests.
 *
 * These render the real component tree to a string, which catches broken
 * props, bad imports, and crashes on the paths a browser test would exercise
 * first. Interactive behavior is left to manual testing in a browser.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { Home } from '../pages/Home'
import { Practice } from '../pages/Practice'
import { ResultCard } from './ResultCard'
import { ProgressCard } from './ProgressCard'
import { SupportNotice } from './SupportNotice'
import { analyzeSpeech, analyzeText } from '../services/api'
import type { SessionRecord } from '../types'

const noop = () => {}

const DOC_SENTENCE = 'I think this is a good idea.'

const SESSIONS: SessionRecord[] = [
  {
    id: 'a',
    date: new Date().toISOString(),
    score: 92,
    exerciseId: 1,
    level: 'beginner',
    sentence: 'I like coffee.',
  },
  {
    id: 'b',
    date: new Date(Date.now() - 86_400_000).toISOString(),
    score: 79,
    exerciseId: 2,
    level: 'beginner',
    sentence: 'My name is John.',
  },
]

describe('Home', () => {
  it('shows the title, tagline, and start button from section 3', () => {
    const html = renderToString(
      <Home
        sessions={SESSIONS}
        selectedLevel="beginner"
        onSelectLevel={noop}
        onStart={noop}
        onStartCustom={noop}
        onClearHistory={noop}
      />,
    )

    expect(html).toContain('SpeakBetter')
    expect(html).toContain('Your Personal English Coach')
    expect(html).toContain('Practice speaking. Get feedback. Improve.')
    expect(html).toContain('Start Practicing')
  })

  it('says in the footer that transcription happens outside the app', () => {
    // The README documents this; a learner deciding whether to speak reads the
    // page, not the README.
    const html = renderToString(
      <Home
        sessions={SESSIONS}
        selectedLevel="beginner"
        onSelectLevel={noop}
        onStart={noop}
        onStartCustom={noop}
        onClearHistory={noop}
      />,
    )

    expect(html).toContain('done by your browser, not by SpeakBetter')
    expect(html).toContain('never uploads your voice')
  })

  it('no longer claims that everything runs in your browser', () => {
    // The old footer wording was the exact overclaim the README warns against:
    // recognition leaves the device even though the app never uploads a thing.
    const html = renderToString(
      <Home
        sessions={[]}
        selectedLevel="beginner"
        onSelectLevel={noop}
        onStart={noop}
        onStartCustom={noop}
        onClearHistory={noop}
      />,
    )

    expect(html).not.toContain('Everything runs in your browser')
  })

  it('offers all three difficulty levels', () => {
    const html = renderToString(
      <Home
        sessions={[]}
        selectedLevel="intermediate"
        onSelectLevel={noop}
        onStart={noop}
        onStartCustom={noop}
        onClearHistory={noop}
      />,
    )

    expect(html).toContain('Beginner')
    expect(html).toContain('Intermediate')
    expect(html).toContain('Advanced')
  })
})

describe('SupportNotice', () => {
  /** Stand in for a browser, since the platform check has no feature test. */
  const asBrowser = (userAgent: string, maxTouchPoints = 0) => {
    vi.stubGlobal('window', { SpeechRecognition: function Recognition() {} })
    vi.stubGlobal('navigator', { userAgent, maxTouchPoints })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recommends a computer to someone already on one', () => {
    asBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0')

    expect(renderToString(<SupportNotice />)).toContain('Best used on a desktop or laptop')
  })

  it('warns rather than recommends on a phone', () => {
    asBrowser('Mozilla/5.0 (Linux; Android 14; SM-S911B) Chrome/140.0.0.0 Mobile Safari/537.36', 5)

    const html = renderToString(<SupportNotice />)

    expect(html).toContain('works best on a computer')
    expect(html).not.toContain('Best used on a desktop or laptop')
  })

  it('says nothing on the practice page when the browser is supported', () => {
    asBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0')

    expect(renderToString(<SupportNotice variant="compact" />)).toBe('')
  })
})

describe('ProgressCard', () => {
  it('renders the statistics from section 11', () => {
    const html = renderToString(<ProgressCard sessions={SESSIONS} />)

    expect(html).toContain('Practice Sessions')
    expect(html).toContain('Average Match')
    expect(html).toContain('Best Score')
    expect(html).toContain('Last Session')
    expect(html).toContain('Today')
    expect(html).toContain('Yesterday')
  })

  it('invites a first recording when there is no history', () => {
    const html = renderToString(<ProgressCard sessions={[]} />)
    expect(html).toContain('No practice yet')
  })
})

describe('ResultCard', () => {
  it('renders the score, every word, the feedback, and the tip', () => {
    const result = analyzeText(DOC_SENTENCE, 'I tink this is a good idea')

    const html = renderToString(
      <ResultCard
        result={result}
        audioUrl={null}
        speaking={false}
        onListen={noop}
        onTryAgain={noop}
        onNext={noop}
        previousScore={76}
      />,
    )

    expect(html).toContain('Your Result')
    expect(html).toContain('86')
    expect(html).toContain('Speaking Match')
    expect(html).toContain('word--problem')
    expect(html).toContain('tongue')
    expect(html).toContain('Try Again')
    // Improvement over the previous attempt.
    expect(html).toContain('10')
  })

  it('renders the Compare block with both the model and the learner audio', () => {
    const result = analyzeText(DOC_SENTENCE, 'I tink this is a good idea')

    const html = renderToString(
      <ResultCard
        result={result}
        audioUrl="blob:http://localhost/fake-recording"
        speaking={false}
        onListen={noop}
        onTryAgain={noop}
        onNext={noop}
        previousScore={null}
      />,
    )

    expect(html).toContain('Compare')
    expect(html).toContain('Correct')
    expect(html).toContain('<audio')
    expect(html).toContain('blob:http://localhost/fake-recording')
  })

  it('explains when no recording is available to play back', () => {
    const result = analyzeText(DOC_SENTENCE, 'I tink this is a good idea')

    const html = renderToString(
      <ResultCard
        result={result}
        audioUrl={null}
        speaking={false}
        onListen={noop}
        onTryAgain={noop}
        onNext={noop}
        previousScore={null}
      />,
    )

    expect(html).not.toContain('<audio')
    expect(html).toContain('could not be saved')
  })

  it('always shows something to work on next', () => {
    const perfect = analyzeSpeech(1, 'I like coffee')

    const html = renderToString(
      <ResultCard
        result={perfect}
        audioUrl={null}
        speaking={false}
        onListen={noop}
        onTryAgain={noop}
        onNext={noop}
        previousScore={null}
      />,
    )

    expect(html).toContain('100')
    expect(html).toContain('What to work on next')
    expect(html).toContain('Ready for something harder')
  })
})

describe('Practice', () => {
  it('renders the first sentence, the counter, and the record control', () => {
    const html = renderToString(
      <Practice level="beginner" onChangeLevel={noop} onHome={noop} onAttemptScored={noop} />,
    )

    expect(html).toContain('Practice Sentence')
    expect(html).toContain('I like coffee.')
    expect(html).toContain('1 / 10')
    expect(html).toContain('Listen')
    expect(html).toContain('Record')
  })
})
