interface PrivacyNoticeProps {
  /**
   * `full` explains the whole picture and renders as bare paragraphs, so it
   * takes the styling of whatever it sits in — currently the home page footer.
   * `compact` is the one-line version that sits under the Record button.
   */
  variant?: 'full' | 'compact'
}

/**
 * Tells the learner that speaking sends their voice to a third party.
 *
 * Worth saying in the interface rather than only in the README. Recognition
 * runs through the browser's own speech service, not through this app, and
 * "it all happens in your browser" is easy to read as "my voice stays on this
 * device" — which is not true. Someone deciding whether to press Record
 * should be able to see that where they are standing.
 *
 * Deliberately names no single company: Chrome sends audio to Google and Edge
 * sends it to Microsoft, and sniffing the user agent to choose between them
 * would be both brittle and beside the point.
 */
export function PrivacyNotice({ variant = 'full' }: PrivacyNoticeProps) {
  if (variant === 'compact') {
    return (
      <p className="privacy-line">
        Recording sends your voice to your browser&rsquo;s speech service to turn it into text.
        SpeakBetter never uploads or saves it.
      </p>
    )
  }

  return (
    <>
      <p>
        Turning speech into text is done by your browser, not by SpeakBetter &mdash; and your
        browser does it by sending the audio to its own speech service, Google&rsquo;s in Chrome and
        Microsoft&rsquo;s in Edge.
      </p>
      <p>
        SpeakBetter itself never uploads your voice and never writes it to disk. Your recording is
        held in the page only long enough to play back, and your scores stay on this device.
      </p>
    </>
  )
}
