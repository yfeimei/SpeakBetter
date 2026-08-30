import type { WordResult as WordResultData } from '../types'

const STATUS_MARK: Record<WordResultData['status'], string> = {
  correct: '✓',
  problem: '⚠',
  missing: '⚠',
  extra: '+',
}

const STATUS_LABEL: Record<WordResultData['status'], string> = {
  correct: 'spoken correctly',
  problem: 'sounded different',
  missing: 'missed',
  extra: 'extra word',
}

interface WordResultProps {
  result: WordResultData
}

/**
 * One word of the sentence with its verdict mark underneath, matching the
 * layout in section 6 of the design document.
 */
export function WordResult({ result }: WordResultProps) {
  const { word, status, spoken } = result

  const title =
    status === 'problem' && spoken
      ? `"${word}" sounded like "${spoken}"`
      : `"${word}" — ${STATUS_LABEL[status]}`

  return (
    <span className={`word word--${status}`} title={title}>
      <span className="word__text">{word}</span>
      <span className="word__mark" aria-hidden="true">
        {STATUS_MARK[status]}
      </span>
      <span className="sr-only">{STATUS_LABEL[status]}</span>
    </span>
  )
}
