import { describe, expect, test } from 'vitest'
import type { Me, TaskStatus } from '../api/types'
import { makeMe, makeTask, userRef } from '../test/fixtures'
import { canComment, canDrag, canEditFields, canMove, isBackward } from './policy'

const student = makeMe(1), other = makeMe(2), teacher = makeMe(3, 'teacher')
const task = (createdBy: Me, status: TaskStatus = 'todo') => makeTask({
  id: 10, owner: userRef(student.id), created_by: userRef(createdBy.id, createdBy.role),
  from_teacher: createdBy.role === 'teacher', status,
})
const teacherTask = (s: TaskStatus = 'todo') => task(teacher, s)
const personalTask = (s: TaskStatus = 'todo') => task(student, s)

describe('teacher task', () => {
  test('assignee cannot drop into done', () => expect(canMove(student, teacherTask('review'), 'done')).toBe(false))
  test('assignee can move to review', () => expect(canMove(student, teacherTask('in_progress'), 'review')).toBe(true))
  test('assignee cannot drag accepted task', () => expect(canDrag(student, teacherTask('done'))).toBe(false))
  test('assignee can drag open task', () => expect(canDrag(student, teacherTask('todo'))).toBe(true))
  test('assignee cannot edit fields, teacher can', () => {
    expect(canEditFields(student, teacherTask())).toBe(false)
    expect(canEditFields(teacher, teacherTask())).toBe(true)
  })
  test('teacher moves anywhere', () => expect(canMove(teacher, teacherTask('done'), 'todo')).toBe(true))
  test('other student cannot drag', () => expect(canDrag(other, teacherTask())).toBe(false))
})

describe('personal task', () => {
  test('owner moves anywhere', () => expect(canMove(student, personalTask('review'), 'done')).toBe(true))
  test('teacher cannot drag or edit', () => {
    expect(canDrag(teacher, personalTask())).toBe(false)
    expect(canEditFields(teacher, personalTask())).toBe(false)
  })
})

test('comment rights', () => {
  expect(canComment(student, personalTask())).toBe(true)
  expect(canComment(teacher, personalTask())).toBe(true)
  expect(canComment(other, personalTask())).toBe(false)
})

test('isBackward', () => {
  expect(isBackward('review', 'in_progress')).toBe(true)
  expect(isBackward('done', 'todo')).toBe(true)
  expect(isBackward('todo', 'review')).toBe(false)
  expect(isBackward('review', 'review')).toBe(false)
})
