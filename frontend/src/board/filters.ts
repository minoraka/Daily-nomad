import type { Me, Task } from '../api/types'

export type Quick = 'mine' | 'teacher' | 'overdue' | 'review'
export const QUICK_FILTERS: Quick[] = ['mine', 'teacher', 'overdue', 'review']

/** Title substring (case-insensitive) or task number: "SB-25", "sb25", "sb 25", "25". */
export function matchesQuery(t: Task, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  if (t.title.toLowerCase().includes(q)) return true
  const num = q.replace(/^sb/, '').replace(/[-\s]/g, '')
  return /^\d+$/.test(num) && Number(num) === t.id
}

function matchesQuick(t: Task, f: Quick, me: Me): boolean {
  switch (f) {
    case 'mine': return me.role === 'teacher' ? t.from_teacher : t.owner.id === me.id
    case 'teacher': return t.from_teacher
    case 'overdue': return t.is_overdue
    case 'review': return t.status === 'review'
  }
}

export function filterTasks(tasks: Task[], opts: { query: string; quick: Set<Quick> }, me: Me): Task[] {
  return tasks.filter((t) => matchesQuery(t, opts.query) && [...opts.quick].every((f) => matchesQuick(t, f, me)))
}
