import { getPlatformSupport } from '../services/platform'

interface SupportNoticeProps {
  /**
   * `warning` is the box for a browser that cannot listen at all, and nothing
   * when it can. It belongs at the top of a page, where someone reads it
   * before reaching for Record.
   *
   * `note` is the plain line recommending a computer, for the home page
   * footer. It stays quiet when the warning has already said more.
   */
  variant?: 'warning' | 'note'
}

/**
 * Tells the visitor up front whether their browser can actually do this.
 *
 * Worth being explicit rather than letting someone discover it when the
 * Record button fails: the whole app depends on browser speech recognition,
 * and that support is uneven.
 */
export function SupportNotice({ variant = 'warning' }: SupportNoticeProps) {
  const support = getPlatformSupport()

  if (support === 'no-recognition') {
    // The footer note would only repeat, in weaker words, what this warning
    // already says about needing Chrome or Edge on a computer.
    if (variant === 'note') return null

    return (
      <div className="notice notice--warning" role="status">
        <p>
          <strong>This browser can&rsquo;t listen to speech.</strong> SpeakBetter uses the
          browser&rsquo;s built-in speech recognition, which this one doesn&rsquo;t provide. Please
          open it in Google Chrome or Microsoft Edge on a laptop or desktop.
        </p>
        <p>You can still read the sentences and use Listen.</p>
      </div>
    )
  }

  if (variant === 'warning') return null

  // What any browser with recognition sees, phones included: the same line
  // everywhere, as bare text that takes the styling of whatever it sits in —
  // currently the home page footer, alongside the privacy paragraphs. A
  // recommendation is not a problem to solve, so it does not need a box.
  return (
    <p>
      <strong>Best used on a desktop or laptop.</strong> Speech recognition is most accurate in
      Chrome or Edge.
    </p>
  )
}
