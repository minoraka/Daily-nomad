import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../api/types'
import { useMe } from '../auth/AuthContext'
import { BoardColumns } from '../board/BoardColumns'
import { TaskModal } from '../board/TaskModal'
import { useTaskBoard } from '../board/useTaskBoard'
import { Page } from '../layout/AppLayout'
import { GroupSwitcher, StudentFilter } from '../layout/GroupSwitcher'
import { useScope } from '../layout/useScope'

export default function Board() {
  const { t } = useTranslation()
  const me = useMe()
  const scope = useScope()
  const board = useTaskBoard(scope.groupId ? { group: scope.groupId, owner: scope.studentId ?? undefined } : null)
  const [modal, setModal] = useState<{ task: Task | null } | null>(null)
  const canEdit = (task: Task) => task.owner.id === me.id
  const canAdd = me.role === 'student' && scope.isOwnGroup

  return (
    <Page title={t('board.title')} wide>
      <div className="toolbar">
        <GroupSwitcher groups={scope.groups} value={scope.groupId} onChange={scope.setGroup} />
        <StudentFilter groupId={scope.groupId} value={scope.studentId} onChange={scope.setStudent} />
      </div>
      {board.error && <div className="form-error" style={{ textAlign: 'center' }}>{board.error}</div>}
      {board.tasks === null ? (
        <div className="empty">{t('common.loading')}</div>
      ) : (
        <BoardColumns tasks={board.tasks} me={me} onDrop={board.onDrop}
          onOpen={(task) => setModal({ task })} onAdd={canAdd ? () => setModal({ task: null }) : undefined} />
      )}
      {modal && (
        <TaskModal task={modal.task} editable={modal.task ? canEdit(modal.task) : true}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); board.reload() }} />
      )}
    </Page>
  )
}
