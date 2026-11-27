import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listTasks, moveTask, type TaskQuery } from '../api/endpoints'
import type { Task } from '../api/types'
import { applyDrop, computeDrop } from './ordering'

/** Loads tasks for `query` and handles drag-and-drop moves with optimistic update. */
export function useTaskBoard(query: TaskQuery | null) {
  const { t } = useTranslation()
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(query)

  const reload = useCallback(async () => {
    if (!query) return
    try {
      setTasks(await listTasks(query))
      setError(null)
    } catch {
      setError(t('common.error'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, t])

  useEffect(() => {
    reload()
  }, [reload])

  const onDrop = async (task: Task, overId: string) => {
    if (!tasks) return
    const drop = computeDrop(tasks, task.id, overId)
    if (!drop) return
    setTasks(applyDrop(tasks, task.id, overId))
    try {
      await moveTask(task.id, drop.status, drop.position)
    } catch {
      setError(t('board.move_error'))
    }
    reload()
  }

  return { tasks, error, reload, onDrop }
}
