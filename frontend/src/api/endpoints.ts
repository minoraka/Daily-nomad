import { api, setTokens } from './client'
import type { Author, Daily, DailyInput, Group, Me, Paginated, RegisterData, Task, TaskStatus } from './types'

export async function login(username: string, password: string) {
  const r = await api.post<{ access: string; refresh: string }>('/auth/token/', { username, password })
  setTokens(r.data.access, r.data.refresh)
}
export async function register(data: RegisterData) {
  const r = await api.post<{ access: string; refresh: string; user: Me }>('/auth/register/', data)
  setTokens(r.data.access, r.data.refresh)
  return r.data.user
}
export const getMe = () => api.get<Me>('/auth/me/').then((r) => r.data)
export const getUser = (id: number) => api.get<Me>(`/users/${id}/`).then((r) => r.data)
export const getGroups = () => api.get<Group[]>('/groups/').then((r) => r.data)
export const getGroupStudents = (groupId: number) =>
  api.get<Author[]>(`/groups/${groupId}/students/`).then((r) => r.data)

export interface TaskQuery { group?: number; owner?: number; status?: TaskStatus }
export const listTasks = (params: TaskQuery) => api.get<Task[]>('/tasks/', { params }).then((r) => r.data)
export const createTask = (data: { title: string; description?: string }) =>
  api.post<Task>('/tasks/', data).then((r) => r.data)
export const updateTask = (id: number, data: Partial<Pick<Task, 'title' | 'description' | 'status'>>) =>
  api.patch<Task>(`/tasks/${id}/`, data).then((r) => r.data)
export const deleteTask = (id: number) => api.delete(`/tasks/${id}/`)
export const moveTask = (id: number, status: TaskStatus, position: number) =>
  api.post<Task>(`/tasks/${id}/move/`, { status, position }).then((r) => r.data)

export interface DailyQuery { group?: number; author?: number; page?: number }
export const listDailies = (params: DailyQuery) =>
  api.get<Paginated<Daily>>('/dailies/', { params }).then((r) => r.data)
export const getTodayDaily = () =>
  api.get<Daily>('/dailies/today/').then(
    (r) => r.data,
    (e) => {
      if (e?.response?.status === 404) return null
      throw e
    },
  )
export const createDaily = (data: DailyInput) => api.post<Daily>('/dailies/', data).then((r) => r.data)
export const updateDaily = (id: number, data: Partial<DailyInput>) =>
  api.patch<Daily>(`/dailies/${id}/`, data).then((r) => r.data)
export const deleteDaily = (id: number) => api.delete(`/dailies/${id}/`)
