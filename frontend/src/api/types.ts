export type Role = 'student' | 'teacher'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done']
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']
export const ESTIMATES = [1, 2, 3, 5, 8] as const

export interface Group { id: number; name: string }
export interface Author { id: number; first_name: string; last_name: string; initials: string }
export interface StreakDay { date: string; has_daily: boolean; is_today: boolean }
export interface Streak { count: number; week: StreakDay[] }
export interface Me extends Author {
  username: string
  role: Role
  group: Group | null
  streak: Streak | null
}
export type UserRef = Author & { role: Role }
export interface Task {
  id: number
  key: string
  owner: Author
  created_by: UserRef
  from_teacher: boolean
  title: string
  description: string
  status: TaskStatus
  position: number
  priority: Priority
  estimate: number | null
  deadline: string | null
  labels: string[]
  is_overdue: boolean
  comments_count: number
  created_at: string
  updated_at: string
}
export interface TaskInput {
  title: string
  description: string
  priority: Priority
  estimate: number | null
  deadline: string | null
  labels: string[]
}
export type AssignInput = TaskInput & ({ assignees: number[] } | { group: number })
export interface Comment {
  id: number
  task: number
  author: UserRef
  text: string
  created_at: string
  can_delete: boolean
}
export interface Daily {
  id: number
  author: Author
  date: string
  done: string
  plans: string
  blockers: string
  tasks: { id: number; key: string; title: string; status: TaskStatus }[]
  can_edit: boolean
  created_at: string
}
export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface RegisterData {
  username: string
  password: string
  first_name: string
  last_name: string
  role: Role
  group?: number | null
}
export interface DailyInput { done: string; plans: string; blockers: string; task_ids: number[] }
/** Field → messages, as returned by DRF on 400. */
export type FieldErrors = Record<string, string[]>
