import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteDaily, getTodayDaily } from '../api/endpoints'
import type { Daily } from '../api/types'
import { useAuth, useMe } from '../auth/AuthContext'
import { DailyForm } from '../dailies/DailyForm'
import { DailyItem } from '../dailies/DailyItem'
import { useDailies } from '../dailies/useDailies'
import { Page } from '../layout/AppLayout'
import { GroupSwitcher, StudentFilter } from '../layout/GroupSwitcher'
import { useScope } from '../layout/useScope'

export default function Dailies() {
  const { t } = useTranslation()
  const me = useMe()
  const { refreshMe } = useAuth()
  const scope = useScope()
  const feed = useDailies(scope.groupId ? { group: scope.groupId, author: scope.studentId ?? undefined } : null)
  const [today, setToday] = useState<Daily | null | undefined>(undefined)
  const [editing, setEditing] = useState<Daily | 'new' | null>(null)

  useEffect(() => {
    if (me.role === 'student') getTodayDaily().then(setToday, () => setToday(null))
  }, [me.role])

  async function saved(d: Daily) {
    setEditing(null)
    setToday(d)
    feed.reload()
    refreshMe()
  }

  async function remove(d: Daily) {
    if (!confirm(t('dailies.confirm_delete'))) return
    await deleteDaily(d.id)
    setToday(null)
    feed.reload()
    refreshMe()
  }

  return (
    <Page title={t('dailies.title')}>
      <div className="toolbar">
        <GroupSwitcher groups={scope.groups} value={scope.groupId} onChange={scope.setGroup} />
        <StudentFilter groupId={scope.groupId} value={scope.studentId} onChange={scope.setStudent} />
      </div>
      {me.role === 'student' && today !== undefined && !editing && (
        <button className="btn btn-primary" onClick={() => setEditing(today ?? 'new')} data-testid="write-daily">
          {today ? t('dailies.edit_today') : t('dailies.write')}
        </button>
      )}
      {editing && (
        <DailyForm initial={editing === 'new' ? null : editing} onSaved={saved} onCancel={() => setEditing(null)} />
      )}
      {feed.error && <div className="form-error">{t('common.error')}</div>}
      {feed.items === null ? (
        <div className="empty">{t('common.loading')}</div>
      ) : feed.items.length === 0 ? (
        <div className="card empty">{t('dailies.empty')}</div>
      ) : (
        feed.items.map((d) => <DailyItem key={d.id} daily={d} onEdit={setEditing} onDelete={remove} />)
      )}
      {feed.hasMore && <button className="btn" onClick={feed.loadMore}>{t('dailies.load_more')}</button>}
    </Page>
  )
}
