import { ChevronRight, LayoutGrid, PenLine } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listDailies, listTasks } from '../api/endpoints'
import type { Daily, Task } from '../api/types'
import { useAuth, useMe } from '../auth/AuthContext'
import { DailyItem } from '../dailies/DailyItem'
import { StreakCard } from '../dailies/StreakCard'
import { Page } from '../layout/AppLayout'
import { ProfileHead } from '../layout/ProfileHead'

export default function Home() {
  const { t } = useTranslation()
  const me = useMe()
  const { refreshMe } = useAuth()
  const nav = useNavigate()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [dailies, setDailies] = useState<Daily[] | null>(null)

  useEffect(() => {
    refreshMe()
    listTasks({ owner: me.id, status: 'in_progress' }).then(setTasks, () => setTasks([]))
    if (me.group) listDailies({ group: me.group.id }).then((r) => setDailies(r.results.slice(0, 5)), () => setDailies([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.id])

  // On Sunday the strip has no "today"; the button then simply leads to the feed.
  const wroteToday = me.streak?.week.some((d) => d.is_today && d.has_daily) ?? true

  return (
    <Page>
      <ProfileHead user={me} />
      {me.streak && (
        <StreakCard streak={me.streak} onWrite={!wroteToday ? () => nav('/dailies') : undefined} />
      )}
      <section className="card">
        <Link to={`/board?student=${me.id}`} className="card-header" style={{ textDecoration: 'none' }}>
          <LayoutGrid size={15} /> {t('home.my_in_progress')}
          <span className="chev"><ChevronRight size={18} /></span>
        </Link>
        {tasks?.length === 0 && <div className="empty">{t('home.empty_tasks')}</div>}
        <div className="list">
          {tasks?.map((task) => (
            <Link key={task.id} to={`/board?student=${me.id}`} className="list-row">
              <div>
                <span className="badge badge-in_progress">{t('status.in_progress')}</span>
                <div className="title">{task.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="card">
        <Link to="/dailies" className="card-header" style={{ textDecoration: 'none' }}>
          <PenLine size={15} /> {t('home.recent_dailies')}
          <span className="chev"><ChevronRight size={18} /></span>
        </Link>
        {dailies?.length === 0 && <div className="empty">{t('dailies.empty')}</div>}
        <div className="list">
          {dailies?.map((d) => <div key={d.id} className="list-row"><DailyItem daily={d} compact /></div>)}
        </div>
      </section>
    </Page>
  )
}
