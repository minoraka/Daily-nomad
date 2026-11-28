import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { Me } from '../api/types'

const me = { id: 1, username: 'a', first_name: 'A', last_name: 'B', initials: 'BA', role: 'student', group: null,
  streak: null } as Me
const getMe = vi.fn()
vi.mock('../api/endpoints', () => ({ getMe: () => getMe() }))

import { setTokens } from '../api/client'
import { AuthProvider, useAuth } from './AuthContext'

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

beforeEach(() => {
  localStorage.clear()
  setTokens('a', 'r')
  getMe.mockReset()
})

test('network error on /auth/me/ keeps the user logged in', async () => {
  getMe.mockResolvedValueOnce(me)
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.me).not.toBeNull())
  getMe.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { isAxiosError: true }))
  await act(() => result.current.refreshMe())
  expect(result.current.me).toEqual(me)
})

test('401 on /auth/me/ logs out', async () => {
  getMe.mockResolvedValueOnce(me)
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current.me).not.toBeNull())
  getMe.mockRejectedValueOnce(Object.assign(new Error('401'), { isAxiosError: true, response: { status: 401 } }))
  await act(() => result.current.refreshMe())
  expect(result.current.me).toBeNull()
})
