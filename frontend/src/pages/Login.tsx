import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Field, FormErrors } from '../layout/Field'
import { AuthShell } from './AuthShell'

export default function Login() {
  const { t } = useTranslation()
  const { me, login } = useAuth()
  const nav = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  if (me) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await login(username, password)
      nav(from, { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title={t('auth.login_title')}>
      <form onSubmit={submit} className="form">
        <Field label={t('auth.username')} errors={errors.username}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label={t('auth.password')} errors={errors.password}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password" required />
        </Field>
        <FormErrors errors={errors.detail} />
        <button className="btn btn-primary" disabled={busy}>{t('auth.login_btn')}</button>
        <p className="muted small">
          {t('auth.no_account')} <Link to="/register">{t('auth.register_btn')}</Link>
        </p>
      </form>
    </AuthShell>
  )
}
