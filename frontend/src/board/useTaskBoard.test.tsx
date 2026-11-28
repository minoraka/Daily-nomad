import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import '../i18n'
import { makeTask } from '../test/fixtures'

const task = makeTask({ id: 1 })

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
