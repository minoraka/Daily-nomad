import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Daily } from '../api/types'
import { formatDay } from '../i18n/format'
import { Avatar, fullName } from '../layout/Avatar'

export function DailyItem({ daily, onEdit, onDelete, compact = false }: {
  daily: Daily
  onEdit?: (d: Daily) => void
  onDelete?: (d: Daily) => void
  compact?: boolean
}) {
  const { t, i18n } = useTranslation()
  const blocks = (['done', 'plans', 'blockers'] as const).filter((k) => daily[k].trim())
  return (
    <article className={compact ? 'daily' : 'daily card'} data-testid="daily">
      <div className="daily-head">
        <Avatar author={daily.author} />
        <div>
          <Link className="user-link" to={`/users/${daily.author.id}`}>{fullName(daily.author)}</Link>
          <div className="when">{formatDay(daily.date, i18n.language)}</div>
        </div>
        {daily.can_edit && (onEdit || onDelete) && (
          <div className="actions">
            {onEdit && <button className="btn btn-sm" onClick={() => onEdit(daily)}>{t('dailies.edit')}</button>}
            {onDelete && <button className="btn btn-sm btn-danger" onClick={() => onDelete(daily)}>{t('dailies.delete')}</button>}
          </div>
        )}
      </div>
      {blocks.map((k) => (
        <div key={k} className={`daily-block ${k}`}>
          <div className="label">{t(`dailies.${k}`)}</div>
          <div className="pre">{compact && k === 'done' && daily[k].length > 200 ? daily[k].slice(0, 200) + '…' : daily[k]}</div>
        </div>
      ))}
      {!compact && daily.tasks.length > 0 && (
        <div className="chips">
          {daily.tasks.map((task) => (
            <span key={task.id} className="chip">
              <span className={`badge badge-${task.status}`}>{t(`status.${task.status}`)}</span>
              {task.title}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
