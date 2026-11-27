import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGS } from '../i18n'
import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()
  const label = theme === 'dark' ? t('top.theme_light') : t('top.theme_dark')
  return (
    <button className="icon-btn" onClick={toggle} title={label} aria-label={label} data-testid="theme-toggle">
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

export function LangSwitch() {
  const { i18n, t } = useTranslation()
  return (
    <div className="lang-switch" role="group" aria-label={t('top.language')}>
      {LANGS.map((l) => (
        <button key={l} className={i18n.language === l ? 'active' : ''} onClick={() => i18n.changeLanguage(l)}
          aria-pressed={i18n.language === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
