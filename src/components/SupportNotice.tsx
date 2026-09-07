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

  // Everything below is what any browser with recognition sees, phones
  // included: the same one-line note rather than a longer warning, so the
  // page reads the same everywhere. Browsers without recognition were
  // handled above and already say more.
  return (
    <div className="notice notice--info" role="note">
      <p>
        <strong>Best used on a desktop or laptop.</strong> Speech recognition is most accurate in
        Chrome or Edge.
      </p>
    </div>
  )
}
