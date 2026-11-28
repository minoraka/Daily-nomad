import { beforeEach, describe, expect, test, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import { api, getAccess, onAuthLost, setTokens } from './client'
import i18n from '../i18n'

describe('api client', () => {
  let mock: MockAdapter
  let refreshMock: MockAdapter
  beforeEach(() => {
    localStorage.clear()
    mock = new MockAdapter(api)
    refreshMock = new MockAdapter(axios)
    setTokens('old-access', 'refresh-1')
  })

  test('sends bearer token', async () => {
    mock.onGet('/tasks/').reply((cfg) => [200, { auth: cfg.headers?.Authorization }])
    const r = await api.get('/tasks/')
    expect(r.data.auth).toBe('Bearer old-access')
  })

  test('401 refreshes once and retries', async () => {
    mock.onGet('/tasks/').replyOnce(401).onGet('/tasks/').reply((cfg) => [200, { auth: cfg.headers?.Authorization }])
    refreshMock.onPost('/api/auth/token/refresh/').reply(200, { access: 'new-access' })
    const r = await api.get('/tasks/')
    expect(r.data.auth).toBe('Bearer new-access')
    expect(getAccess()).toBe('new-access')
  })

  test('parallel 401s share one refresh', async () => {
    mock.onGet('/a/').replyOnce(401).onGet('/a/').reply(200, 'a')
    mock.onGet('/b/').replyOnce(401).onGet('/b/').reply(200, 'b')
    refreshMock.onPost('/api/auth/token/refresh/').reply(200, { access: 'new-access' })
    const [a, b] = await Promise.all([api.get('/a/'), api.get('/b/')])
    expect([a.data, b.data]).toEqual(['a', 'b'])
    expect(refreshMock.history.post.length).toBe(1)
  })

  test('failed refresh clears tokens and fires onAuthLost', async () => {
    const lost = vi.fn()
    onAuthLost(lost)
    mock.onGet('/tasks/').reply(401)
    refreshMock.onPost('/api/auth/token/refresh/').reply(401)
    await expect(api.get('/tasks/')).rejects.toBeTruthy()
    expect(getAccess()).toBeNull()
    expect(lost).toHaveBeenCalledOnce()
  })

  test('login 401 is not refreshed', async () => {
    mock.onPost('/auth/token/').reply(401, { detail: 'bad' })
    await expect(api.post('/auth/token/', {})).rejects.toBeTruthy()
    expect(refreshMock.history.post.length).toBe(0)
  })

  test('sends Accept-Language from i18n', async () => {
    await i18n.changeLanguage('ky')
    mock.onGet('/x/').reply((cfg) => [200, cfg.headers?.['Accept-Language']])
    expect((await api.get('/x/')).data).toBe('ky')
  })
})
