import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getUser } from '../api/endpoints'
import type { Me, Task } from '../api/types'
import { useMe } from '../auth/AuthContext'
import { BoardColumns } from '../board/BoardColumns'
import { TaskModal } from '../board/TaskModal'
import { useTaskBoard } from '../board/useTaskBoard'
import { DailyItem } from '../dailies/DailyItem'
import { StreakCard } from '../dailies/StreakCard'
import { useDailies } from '../dailies/useDailies'
import { Page } from '../layout/AppLayout'
import { PillTabs } from '../layout/PillTabs'
import { ProfileHead } from '../layout/ProfileHead'

type Tab = 'board' | 'dailies'

export default function Profile() {
  const { t } = useTranslation()
  const me = useMe()
  const id = Number(useParams().id)
  const [user, setUser] = useState<Me | null | 'missing'>(null)
  const [tab, setTab] = useState<Tab>('board')
  const [modal, setModal] = useState<{ task: Task | null } | null>(null)
  const isStudent = user !== null && user !== 'missing' && user.role === 'student'
  const board = useTaskBoard(isStudent ? { owner: id } : null)
  const feed = useDailies(isStudent ? { author: id } : null)

  useEffect(() => {
    setUser(null)
    getUser(id).then(setUser, () => setUser('missing'))
  }, [id])

  if (user === null) return <Page><div className="empty">{t('common.loading')}</div></Page>
  if (user === 'missing') return <Page><div className="card empty">{t('common.not_found')}</div></Page>

  const mine = user.id === me.id
  return (
    <Page wide={tab === 'board' && isStudent}>
      <div className="page" style={{ width: '100%' }}>
        <ProfileHead user={user} />
        {user.streak && <StreakCard streak={user.streak} />}
        {!isStudent && <div className="card empty">{t('profile.teacher_note')}</div>}
        {isStudent && (
          <PillTabs<Tab> value={tab} onChange={setTab}
            tabs={[{ key: 'board', label: t('profile.board') }, { key: 'dailies', label: t('profile.dailies') }]} />
        )}
      </div>
      {isStudent && tab === 'board' && board.tasks && (
        <BoardColumns tasks={board.tasks} canEdit={() => mine} onDrop={board.onDrop} showOwner={false}
          onOpen={(task) => setModal({ task })} onAdd={mine ? () => setModal({ task: null }) : undefined} />
      )}
      {isStudent && tab === 'dailies' && (
        <div className="page" style={{ width: '100%' }}>
          {feed.items?.length === 0 && <div className="card empty">{t('dailies.empty')}</div>}
          {feed.items?.map((d) => <DailyItem key={d.id} daily={d} />)}
          {feed.hasMore && <button className="btn" onClick={feed.loadMore}>{t('dailies.load_more')}</button>}
        </div>
      )}
      {modal && (
        <TaskModal task={modal.task} editable={mine} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); board.reload() }} />
      )}
    </Page>
  )
}
