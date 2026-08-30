interface HeaderProps {
  /** Shown on the right, e.g. "3 / 10". Omitted on the home page. */
  counter?: string
  onHome?: () => void
}

export function Header({ counter, onHome }: HeaderProps) {
  return (
    <header className="header">
      <button className="header__brand" onClick={onHome} disabled={!onHome} type="button">
        <span className="header__mark" aria-hidden="true">
          🎙
        </span>
        SpeakBetter
      </button>
      {counter && <span className="header__counter">{counter}</span>}
    </header>
  )
}
