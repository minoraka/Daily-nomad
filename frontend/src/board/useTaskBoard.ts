import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addComment, listTasks, moveTask, type TaskQuery } from '../api/endpoints'
import type { Me, Task } from '../api/types'
import { applyDrop, computeDrop } from './ordering'
import { canMove, needsReturnDialog } from './policy'

export interface PendingReturn { task: Task; overId: string }

/**
 * Loads tasks for `query` and handles drag-and-drop: optimistic update, client-side permission check,
 * and the teacher's "return to work" dialog for backward moves.
 */
export function useTaskBoard(query: TaskQuery | null, me: Me) {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pendingReturn, setPendingReturn] = useState<PendingReturn | null>(null)
  const key = JSON.stringify(query)

  const reload = useCallback(async (keepError = false) => {
    if (!query) return
    try {
      setTasks(await listTasks(query))
      if (!keepError) setError(null)
    } catch {
      setError(t('common.error'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, t])

  useEffect(() => {
    reload()
  }, [reload])

  const perform = async (task: Task, overId: string, comment = '') => {
    if (!tasks) return
    const drop = computeDrop(tasks, task.id, overId)
    if (!drop) return
    setTasks(applyDrop(tasks, task.id, overId))
    let failed = false
    try {
      if (comment.trim()) await addComment(task.id, comment.trim())
      await moveTask(task.id, drop.status, drop.position)
    } catch {
      failed = true
      setError(t('board.move_error'))
    }
    await reload(failed)
  }

  const onDrop = async (task: Task, overId: string) => {
    if (!tasks) return
    setNotice(null)
    const drop = computeDrop(tasks, task.id, overId)
    if (!drop) return
    if (!canMove(me, task, drop.status)) {
      setNotice(t('board.only_teacher_accepts'))
      return
    }
    if (me.role === 'teacher' && needsReturnDialog(task.status, drop.status)) {
      setPendingReturn({ task, overId })
      return
    }
    await perform(task, overId)
  }

  const confirmReturn = async (comment: string) => {
    if (!pendingReturn) return
    const { task, overId } = pendingReturn
    setPendingReturn(null)
    await perform(task, overId, comment)
  }

  const cancelReturn = () => setPendingReturn(null)

  return { tasks, error, notice, reload, onDrop, pendingReturn, confirmReturn, cancelReturn }
}
