import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { getGroups } from '../api/endpoints'
import type { Group, Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Field, FormErrors } from '../layout/Field'
import { PillTabs } from '../layout/PillTabs'
import { AuthShell } from './AuthShell'

export default function Register() {
  const { t } = useTranslation()
  const { me, register } = useAuth()
  const nav = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '' })
  const [role, setRole] = useState<Role>('student')
  const [group, setGroup] = useState<number | ''>('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getGroups().then(setGroups, () => setGroups([]))
  }, [])

  if (me) return <Navigate to="/" replace />

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await register({ ...form, role, group: role === 'student' && group !== '' ? group : null })
      nav('/', { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title={t('auth.register_title')}>
      <form onSubmit={submit} className="form">
        <Field group label={t('auth.role')} errors={errors.role}>
          <PillTabs<Role> value={role} onChange={setRole}
            tabs={[{ key: 'student', label: t('role.student') }, { key: 'teacher', label: t('role.teacher') }]} />
        </Field>
        <div className="row-2">
          <Field label={t('auth.last_name')} errors={errors.last_name}>
            <input value={form.last_name} onChange={set('last_name')} required autoComplete="family-name" />
          </Field>
          <Field label={t('auth.first_name')} errors={errors.first_name}>
            <input value={form.first_name} onChange={set('first_name')} required autoComplete="given-name" />
          </Field>
        </div>
        {role === 'student' && (
          <Field label={t('auth.group')} errors={errors.group}>
            {groups && groups.length === 0 ? (
              <span className="muted small">{t('auth.no_groups')}</span>
            ) : (
              <select value={group} onChange={(e) => setGroup(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">{t('auth.choose_group')}</option>
                {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label={t('auth.username')} errors={errors.username}>
          <input value={form.username} onChange={set('username')} required autoComplete="username" />
        </Field>
        <Field label={t('auth.password')} errors={errors.password}>
          <input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
        </Field>
        <FormErrors errors={[...(errors.non_field_errors ?? []), ...(errors.detail ?? [])]} />
        <button className="btn btn-primary" disabled={busy}>{t('auth.register_btn')}</button>
        <p className="muted small">
          {t('auth.have_account')} <Link to="/login">{t('auth.login_btn')}</Link>
        </p>
      </form>
    </AuthShell>
  )
}
