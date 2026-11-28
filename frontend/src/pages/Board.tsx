import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Task } from '../api/types'
import { useMe } from '../auth/AuthContext'
import { BoardColumns } from '../board/BoardColumns'
import { BoardToolbar } from '../board/BoardToolbar'
import { filterTasks, type Quick } from '../board/filters'
import { TaskForm } from '../board/TaskForm'
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
  const [open, setOpen] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')
  const [quick, setQuick] = useState<Set<Quick>>(new Set())
  const [flash, setFlash] = useState<string | null>(null)
  const isTeacher = me.role === 'teacher'
  const canAdd = isTeacher || scope.isOwnGroup
  const visible = useMemo(() => (board.tasks ? filterTasks(board.tasks, { query, quick }, me) : null),
    [board.tasks, query, quick, me])

  return (
    <Page title={t('board.title')} wide>
      <div className="toolbar">
        <GroupSwitcher groups={scope.groups} value={scope.groupId} onChange={scope.setGroup} />
        <StudentFilter groupId={scope.groupId} value={scope.studentId} onChange={scope.setStudent} />
      </div>
      <BoardToolbar query={query} onQuery={setQuery} quick={quick} onQuick={setQuick} isTeacher={isTeacher} />
      {board.error && <div className="form-error" style={{ textAlign: 'center' }}>{board.error}</div>}
      {flash && <div className="flash" data-testid="flash">{flash}</div>}
      {visible === null ? (
        <div className="empty">{t('common.loading')}</div>
      ) : (
        <BoardColumns tasks={visible} me={me} onDrop={board.onDrop} onOpen={setOpen}
          onAdd={canAdd ? () => setCreating(true) : undefined} />
      )}
      {creating && (
        <TaskForm mode={isTeacher ? 'assign' : 'personal'} groupId={scope.groupId} onClose={() => setCreating(false)}
          onSaved={(n) => {
            setCreating(false)
            if (isTeacher) setFlash(t('board.assigned', { count: n }))
            board.reload()
          }} />
      )}
      {open && (
        <TaskModal task={open} editable={open.owner.id === me.id && !open.from_teacher}
          onClose={() => setOpen(null)} onSaved={() => { setOpen(null); board.reload() }} />
      )}
    </Page>
  )
}
