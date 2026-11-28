import { LogOut, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth/AuthContext'
import { LangSwitch, ThemeToggle } from './Prefs'

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const me = useMe()
  const { logout } = useAuth()
  const { t } = useTranslation()
  return (
    <header className="topbar">
      <button className="icon-btn burger" onClick={onMenu} aria-label={t('nav.menu')}>
        <Menu size={18} />
      </button>
      <div className="topbar-right">
        <Link to={`/users/${me.id}`} className="topbar-name">{me.first_name || me.username}</Link>
        <span className="topbar-meta">{t(`role.${me.role}`)}{me.group ? ` · ${me.group.name}` : ''}</span>
        <ThemeToggle />
        <LangSwitch />
        <button className="icon-btn" onClick={logout} title={t('top.logout')} aria-label={t('top.logout')}>
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}
