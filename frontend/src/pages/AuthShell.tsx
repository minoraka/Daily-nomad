import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LangSwitch, ThemeToggle } from '../layout/Prefs'

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="auth-screen">
      <div className="auth-prefs">
        <ThemeToggle />
        <LangSwitch />
      </div>
      <div className="auth-card card">
        <div className="auth-logo">{t('app.name')}</div>
        <h1 className="page-title">{title}</h1>
        {children}
      </div>
    </div>
  )
}
