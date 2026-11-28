import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ru from './ru.json'
import en from './en.json'
import ky from './ky.json'

export const LANGS = ['ru', 'en', 'ky'] as const
export type Lang = (typeof LANGS)[number]
const KEY = 'sb-lang'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
const initial: Lang = (LANGS as readonly string[]).includes(stored ?? '') ? (stored as Lang) : 'ru'

i18n.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en }, ky: { translation: ky } },
  lng: initial,
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(KEY, lng)
  document.documentElement.lang = lng
})
if (typeof document !== 'undefined') document.documentElement.lang = initial

export default i18n
