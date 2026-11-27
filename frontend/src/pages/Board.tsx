import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listTasks, moveTask } from '../api/endpoints'
import type { Task } from '../api/types'
import { useMe } from '../auth/AuthContext'
import { BoardColumns } from '../board/BoardColumns'
import { applyDrop, computeDrop } from '../board/ordering'
import { TaskModal } from '../board/TaskModal'
import { Page } from '../layout/AppLayout'
import { GroupSwitcher, StudentFilter } from '../layout/GroupSwitcher'
import { useScope } from '../layout/useScope'

export default function Board() {
  const { t } = useTranslation()
  const me = useMe()
  const scope = useScope()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ task: Task | null } | null>(null)

  const load = useCallback(async () => {
    if (!scope.groupId) return
    try {
      setTasks(await listTasks({ group: scope.groupId, owner: scope.studentId ?? undefined }))
      setError(null)
    } catch {
      setError(t('common.error'))
    }
  }, [scope.groupId, scope.studentId, t])

  useEffect(() => {
    load()
  }, [load])

  const canEdit = (task: Task) => task.owner.id === me.id

  async function onDrop(task: Task, overId: string) {
    if (!tasks) return
    const drop = computeDrop(tasks, task.id, overId)
    if (!drop) return
    setTasks(applyDrop(tasks, task.id, overId))
    try {
      await moveTask(task.id, drop.status, drop.position)
    } catch {
      setError(t('board.move_error'))
    }
    load()
  }

  const canAdd = me.role === 'student' && scope.isOwnGroup

  return (
    <Page title={t('board.title')} wide>
      <div className="toolbar">
        <GroupSwitcher groups={scope.groups} value={scope.groupId} onChange={scope.setGroup} />
        <StudentFilter groupId={scope.groupId} value={scope.studentId} onChange={scope.setStudent} />
      </div>
      {error && <div className="form-error" style={{ textAlign: 'center' }}>{error}</div>}
      {tasks === null ? (
        <div className="empty">{t('common.loading')}</div>
      ) : (
        <BoardColumns tasks={tasks} canEdit={canEdit} onDrop={onDrop}
          onOpen={(task) => setModal({ task })} onAdd={canAdd ? () => setModal({ task: null }) : undefined} />
      )}
      {modal && (
        <TaskModal task={modal.task} editable={modal.task ? canEdit(modal.task) : true}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </Page>
  )
}
