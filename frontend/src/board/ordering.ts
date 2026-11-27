import type { Task, TaskStatus } from '../api/types'

export const columnId = (s: TaskStatus) => `col-${s}`
export const cardId = (id: number) => `task-${id}`

/** How many of `ownerId`'s cards precede `index` in `column` (which must not contain the dragged card). */
export function ownIndexAt(column: Task[], ownerId: number, index: number): number {
  return column.slice(0, index).filter((t) => t.owner.id === ownerId).length
}

interface Target { status: TaskStatus; insertIndex: number }

function resolveTarget(tasks: Task[], activeId: number, overId: string): Target | null {
  if (overId.startsWith('col-')) {
    const status = overId.slice(4) as TaskStatus
    const col = tasks.filter((t) => t.status === status && t.id !== activeId)
    return { status, insertIndex: col.length }
  }
  const over = tasks.find((t) => cardId(t.id) === overId)
  if (!over) return null
  // Index of `over` in the full target column; for the same column this matches arrayMove semantics.
  const col = tasks.filter((t) => t.status === over.status)
  return { status: over.status, insertIndex: col.findIndex((t) => t.id === over.id) }
}

/** Server-side move parameters for dropping card `activeId` on `overId`, or null if nothing changes. */
export function computeDrop(tasks: Task[], activeId: number, overId: string): { status: TaskStatus; position: number } | null {
  const active = tasks.find((t) => t.id === activeId)
  const target = resolveTarget(tasks, activeId, overId)
  if (!active || !target) return null
  const rest = tasks.filter((t) => t.status === target.status && t.id !== activeId)
  const position = ownIndexAt(rest, active.owner.id, target.insertIndex)
  const ownBefore = tasks.filter((t) => t.status === active.status && t.owner.id === active.owner.id)
  if (target.status === active.status && ownBefore.findIndex((t) => t.id === activeId) === position) return null
  return { status: target.status, position }
}

/** Optimistic local reorder: move the card into place in the display list. */
export function applyDrop(tasks: Task[], activeId: number, overId: string): Task[] {
  const active = tasks.find((t) => t.id === activeId)
  const target = resolveTarget(tasks, activeId, overId)
  if (!active || !target) return tasks
  const moved = { ...active, status: target.status }
  const out: Task[] = []
  let seen = 0
  let placed = false
  for (const t of tasks.filter((x) => x.id !== activeId)) {
    if (!placed && t.status === target.status && seen === target.insertIndex) {
      out.push(moved)
      placed = true
    }
    if (t.status === target.status) seen++
    out.push(t)
  }
  if (!placed) out.push(moved)
  return out
}
