import { getPlatformSupport } from '../services/platform'

interface SupportNoticeProps {
  /**
   * `full` shows a one-line note on the home page. `compact` shows nothing
   * when everything is supported, for use on the practice page.
   */
  variant?: 'full' | 'compact'
}

/**
 * Tells the visitor up front whether their browser can actually do this.
 *
 * Worth being explicit rather than letting someone discover it when the
 * Record button fails: the whole app depends on browser speech recognition,
 * and that support is uneven.
 */
export function SupportNotice({ variant = 'full' }: SupportNoticeProps) {
  const support = getPlatformSupport()

  if (support === 'mobile') {
    return (
      <div className="notice notice--warning" role="status">
        <p>
          <strong>SpeakBetter works best on a computer.</strong> It relies on your browser&rsquo;s
          built-in speech recognition, which is currently only reliable in Chrome or Edge on a
          laptop or desktop. On a phone it may mishear you or miss words entirely, so your score
          won&rsquo;t reflect how well you actually spoke.
        </p>
        <p>You&rsquo;re welcome to look around — just open this page on a computer to practice.</p>
      </div>
    )
  }

  if (support === 'no-recognition') {
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

  if (variant === 'compact') return null

  return (
    <p className="support-line">
      Works in Chrome and Edge on a laptop or desktop. Phone browsers aren&rsquo;t supported yet.
    </p>
  )
}
