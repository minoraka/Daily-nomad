export type Role = 'student' | 'teacher'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done']

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
export interface Task {
  id: number
  owner: Author
  title: string
  description: string
  status: TaskStatus
  position: number
  created_at: string
  updated_at: string
}
export interface Daily {
  id: number
  author: Author
  date: string
  done: string
  plans: string
  blockers: string
  tasks: { id: number; title: string; status: TaskStatus }[]
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
