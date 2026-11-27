import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearTokens, getAccess, onAuthLost } from '../api/client'
import * as ep from '../api/endpoints'
import type { Me, RegisterData } from '../api/types'

interface AuthValue {
  me: Me | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthCtx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    if (!getAccess()) {
      setMe(null)
      return
    }
    try {
      setMe(await ep.getMe())
    } catch {
      setMe(null)
    }
  }, [])

  useEffect(() => {
    onAuthLost(() => setMe(null))
    refreshMe().finally(() => setLoading(false))
  }, [refreshMe])

  const login = useCallback(async (u: string, p: string) => {
    await ep.login(u, p)
    await refreshMe()
  }, [refreshMe])

  const register = useCallback(async (data: RegisterData) => {
    await ep.register(data)
    await refreshMe()
  }, [refreshMe])

  const logout = useCallback(() => {
    clearTokens()
    setMe(null)
  }, [])

  return <AuthCtx.Provider value={{ me, loading, login, register, logout, refreshMe }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const v = useContext(AuthCtx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}

/** Current user, guaranteed non-null inside RequireAuth. */
export function useMe(): Me {
  const { me } = useAuth()
  if (!me) throw new Error('useMe outside RequireAuth')
  return me
}
