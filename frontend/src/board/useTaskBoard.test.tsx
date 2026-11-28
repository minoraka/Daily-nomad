import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import '../i18n'
import type { Task } from '../api/types'
import { makeMe, makeTask, userRef } from '../test/fixtures'

const calls: string[] = []
let tasks: Task[] = []
const moveTask = vi.fn(async () => { calls.push('move') })
const addComment = vi.fn(async () => { calls.push('comment') })
vi.mock('../api/endpoints', () => ({
  listTasks: vi.fn(async () => tasks),
  moveTask: (...a: unknown[]) => (moveTask as (...x: unknown[]) => Promise<void>)(...a),
  addComment: (...a: unknown[]) => (addComment as (...x: unknown[]) => Promise<void>)(...a),
}))

import { useTaskBoard } from './useTaskBoard'

const student = makeMe(1), teacher = makeMe(9, 'teacher')
const teacherTask = (status: Task['status']) =>
  makeTask({ id: 5, status, created_by: userRef(9, 'teacher'), from_teacher: true })

beforeEach(() => {
  calls.length = 0
  moveTask.mockClear()
  addComment.mockClear()
})

async function setup(me = student) {
  const hook = renderHook(() => useTaskBoard({ group: 1 }, me))
  await waitFor(() => expect(hook.result.current.tasks).not.toBeNull())
  return hook.result
}

test('failed move keeps the error visible after reload', async () => {
  tasks = [makeTask({ id: 1 })]
  moveTask.mockRejectedValueOnce(new Error('403'))
  const r = await setup()
  await act(() => r.current.onDrop(tasks[0], 'col-done'))
  await waitFor(() => expect(r.current.tasks?.[0].status).toBe('todo'))
  expect(r.current.error).toBe('Не удалось переместить задачу')
})

test('student drop of teacher task into done is blocked without request', async () => {
  tasks = [teacherTask('review')]
  const r = await setup()
  await act(() => r.current.onDrop(tasks[0], 'col-done'))
  expect(moveTask).not.toHaveBeenCalled()
  expect(r.current.notice).toBe('Задачу принимает преподаватель')
})

test('teacher backward drop opens return dialog', async () => {
  tasks = [teacherTask('review')]
  const r = await setup(teacher)
  await act(() => r.current.onDrop(tasks[0], 'col-in_progress'))
  expect(moveTask).not.toHaveBeenCalled()
  expect(r.current.pendingReturn?.task.id).toBe(5)
})

test('confirmReturn with text adds comment then moves', async () => {
  tasks = [teacherTask('review')]
  const r = await setup(teacher)
  await act(() => r.current.onDrop(tasks[0], 'col-in_progress'))
  await act(() => r.current.confirmReturn('Добавь тесты'))
  expect(calls).toEqual(['comment', 'move'])
  expect(addComment).toHaveBeenCalledWith(5, 'Добавь тесты')
  expect(moveTask).toHaveBeenCalledWith(5, 'in_progress', 0)
  expect(r.current.pendingReturn).toBeNull()
})

test('confirmReturn without text only moves', async () => {
  tasks = [teacherTask('review')]
  const r = await setup(teacher)
  await act(() => r.current.onDrop(tasks[0], 'col-in_progress'))
  await act(() => r.current.confirmReturn('   '))
  expect(calls).toEqual(['move'])
})

test('cancelled return does not move', async () => {
  tasks = [teacherTask('review')]
  const r = await setup(teacher)
  await act(() => r.current.onDrop(tasks[0], 'col-in_progress'))
  act(() => r.current.cancelReturn())
  expect(moveTask).not.toHaveBeenCalled()
  expect(r.current.pendingReturn).toBeNull()
  expect(r.current.tasks?.[0].status).toBe('review')
})
