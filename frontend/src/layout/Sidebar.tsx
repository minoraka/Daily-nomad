import { CircleUser, House, LayoutGrid, PenLine } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth/AuthContext'

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const me = useMe()
  const { t } = useTranslation()
  const items = [
    ...(me.role === 'student' ? [{ to: '/', icon: House, label: t('nav.home'), end: true }] : []),
    { to: '/board', icon: LayoutGrid, label: t('nav.board'), end: false },
    { to: '/dailies', icon: PenLine, label: t('nav.dailies'), end: false },
    ...(me.role === 'student' ? [{ to: `/users/${me.id}`, icon: CircleUser, label: t('nav.profile'), end: false }] : []),
  ]
  return (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="sidebar-logo">{t('app.name')}</div>
      <nav>
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
