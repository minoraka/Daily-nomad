/** Format an ISO date (YYYY-MM-DD) as "27 ноября" in the given language; falls back to ru. */
const KY_MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь',
  'ноябрь', 'декабрь']

export function formatDay(iso: string, lang: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number)
  // Many browsers ship without Kyrgyz ICU data, so format ky by hand.
  if (lang === 'ky') return `${withYear ? `${y}-ж. ` : ''}${d}-${KY_MONTHS[m - 1]}`
  const date = new Date(y, m - 1, d)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' } : {}) }
  try {
    return new Intl.DateTimeFormat(lang, opts).format(date)
  } catch {
    return new Intl.DateTimeFormat('ru', opts).format(date)
  }
}

/** Today's date in Asia/Bishkek as YYYY-MM-DD (the server's notion of "today"). */
export function bishkekToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bishkek' }).format(new Date())
}
