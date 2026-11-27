import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Streak } from '../api/types'
import { bishkekToday, formatDay } from '../i18n/format'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export function StreakCard({ streak, onWrite }: { streak: Streak; onWrite?: () => void }) {
  const { t, i18n } = useTranslation()
  const todayIdx = streak.week.findIndex((d) => d.is_today)
  return (
    <section className="card" data-testid="streak">
      <div className="streak-top">
        <Flame size={22} className={streak.count > 0 ? 'flame lit' : 'flame'} />
        <div>
          <div className="streak-title" data-testid="streak-count">{t('streak.days', { count: streak.count })}</div>
          <div className="muted small">{t('streak.hint')}</div>
        </div>
        {onWrite && (
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onWrite}>
            {t('dailies.write')}
          </button>
        )}
      </div>
      <div className="streak-days">
        {streak.week.map((d, i) => (
          <div key={d.date} className={d.is_today ? 'streak-day today' : 'streak-day'} title={formatDay(d.date, i18n.language)}>
            <span>{t(`days.${DAY_KEYS[i]}`)}</span>
            <Flame size={16} className={d.has_daily ? 'flame lit' : 'flame'} />
          </div>
        ))}
      </div>
      <div className="streak-foot">
        <div>
          <strong>{t('streak.today', { date: formatDay(bishkekToday(), i18n.language) })}</strong>
          <div className="streak-bar" />
        </div>
        {todayIdx >= 0 && <span>{t('streak.day_of', { n: todayIdx + 1 })}</span>}
      </div>
    </section>
  )
}
