import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'

export function RequireAuth() {
  const { me, loading } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  if (loading) return <div className="center-screen muted">{t('common.loading')}</div>
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
