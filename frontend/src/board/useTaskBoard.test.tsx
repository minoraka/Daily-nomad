import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { Task } from '../api/types'
import '../i18n'

const task: Task = { id: 1, owner: { id: 1, first_name: '', last_name: '', initials: '' }, title: 'a', description: '',
  status: 'todo', position: 0, created_at: '', updated_at: '' }

vi.mock('../api/endpoints', () => ({
  listTasks: vi.fn(async () => [task]),
  moveTask: vi.fn(async () => { throw new Error('403') }),
}))

import { useTaskBoard } from './useTaskBoard'

test('failed move keeps the error visible after reload', async () => {
  const { result } = renderHook(() => useTaskBoard({ group: 1 }))
  await waitFor(() => expect(result.current.tasks).not.toBeNull())
  await act(() => result.current.onDrop(task, 'col-done'))
  await waitFor(() => expect(result.current.tasks?.[0].status).toBe('todo'))
  expect(result.current.error).toBe('Не удалось переместить задачу')
})
