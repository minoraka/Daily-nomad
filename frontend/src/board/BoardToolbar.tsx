import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { QUICK_FILTERS, type Quick } from './filters'

export function BoardToolbar({ query, onQuery, quick, onQuick, isTeacher }: {
  query: string
  onQuery: (q: string) => void
  quick: Set<Quick>
  onQuick: (q: Set<Quick>) => void
  isTeacher: boolean
}) {
  const { t } = useTranslation()
  const toggle = (f: Quick) => {
    const next = new Set(quick)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    onQuick(next)
  }
  return (
    <div className="board-toolbar">
      <label className="search">
        <Search size={14} />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t('board.search')}
          aria-label={t('board.search')} data-testid="board-search" />
      </label>
      {QUICK_FILTERS.filter((f) => !(isTeacher && f === 'mine')).map((f) => (
        <button key={f} className={quick.has(f) ? 'quick active' : 'quick'} aria-pressed={quick.has(f)}
          onClick={() => toggle(f)} data-testid={`quick-${f}`}>
          {t(`quick.${f}`)}
        </button>
      ))}
    </div>
  )
}
