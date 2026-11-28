// Mirror of backend/board/policy.py — keep both in sync.
import { STATUSES, type Me, type Task, type TaskStatus } from '../api/types'

export const isTeacherTask = (t: Task) => t.from_teacher

export function canEditFields(me: Me, t: Task): boolean {
  return isTeacherTask(t) ? me.role === 'teacher' : me.id === t.owner.id
}

export function canMove(me: Me, t: Task, to: TaskStatus): boolean {
  if (!isTeacherTask(t)) return me.id === t.owner.id
  if (me.role === 'teacher') return true
  return me.id === t.owner.id && t.status !== 'done' && to !== 'done'
}

export const canDrag = (me: Me, t: Task) => STATUSES.some((s) => canMove(me, t, s))
export const canDelete = canEditFields
export const canComment = (me: Me, t: Task) => me.id === t.owner.id || me.role === 'teacher'
export const isBackward = (from: TaskStatus, to: TaskStatus) => STATUSES.indexOf(to) < STATUSES.indexOf(from)

/** Teacher sends a task back out of "review" or "done": ask for an optional comment first. */
export const needsReturnDialog = (from: TaskStatus, to: TaskStatus) =>
  (from === 'review' || from === 'done') && isBackward(from, to)
