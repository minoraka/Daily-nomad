import type { Me, Task, UserRef } from '../api/types'

export const userRef = (id: number, role: UserRef['role'] = 'student'): UserRef =>
  ({ id, first_name: '', last_name: '', initials: '', role })

export const makeMe = (id: number, role: Me['role'] = 'student'): Me =>
  ({ ...userRef(id, role), username: `u${id}`, group: null, streak: null })

export function makeTask(p: Partial<Task> & { id: number }): Task {
  const owner = p.owner ?? userRef(1)
  return {
    key: `SB-${p.id}`, owner, created_by: userRef(owner.id), from_teacher: false, title: `t${p.id}`, description: '',
    status: 'todo', position: 0, priority: 'medium', estimate: null, deadline: null, labels: [], is_overdue: false,
    comments_count: 0, created_at: '', updated_at: '', ...p,
  }
}
