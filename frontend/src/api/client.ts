import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import i18n from '../i18n'

const ACCESS = 'sb-access'
const REFRESH = 'sb-refresh'

export const api = axios.create({ baseURL: '/api' })

export const getAccess = () => localStorage.getItem(ACCESS)
export const getRefresh = () => localStorage.getItem(REFRESH)
export function setTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS, access)
  if (refresh) localStorage.setItem(REFRESH, refresh)
}
export function clearTokens() {
  localStorage.removeItem(ACCESS)
  localStorage.removeItem(REFRESH)
}

let authLost: () => void = () => {}
export function onAuthLost(cb: () => void) {
  authLost = cb
}

api.interceptors.request.use((cfg) => {
  const token = getAccess()
  if (token) cfg.headers.set('Authorization', `Bearer ${token}`)
  cfg.headers.set('Accept-Language', i18n.language || 'ru')
  return cfg
})

let refreshing: Promise<string> | null = null

function refreshAccess(): Promise<string> {
  if (!refreshing) {
    const refresh = getRefresh()
    refreshing = (refresh
      ? axios.post<{ access: string }>('/api/auth/token/refresh/', { refresh }).then((r) => {
          setTokens(r.data.access)
          return r.data.access
        })
      : Promise.reject(new Error('no refresh token'))
    ).finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const cfg = error.config as RetryConfig | undefined
  const isAuthCall = cfg?.url?.startsWith('/auth/token')
  if (error.response?.status !== 401 || !cfg || cfg._retried || isAuthCall || !getRefresh()) {
    throw error
  }
  cfg._retried = true
  try {
    const access = await refreshAccess()
    cfg.headers.set('Authorization', `Bearer ${access}`)
    return api(cfg)
  } catch {
    clearTokens()
    authLost()
    throw error
  }
})

/** Extract DRF field errors from an axios error (empty object if none). */
export function fieldErrors(e: unknown): Record<string, string[]> {
  const data = (e as AxiosError)?.response?.data
  if (!data || typeof data !== 'object') return {}
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : [String(v)]]),
  )
}
