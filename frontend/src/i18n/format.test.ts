import { expect, test } from 'vitest'
import { formatDay } from './format'

test('ru', () => expect(formatDay('2026-11-27', 'ru')).toBe('27 ноября'))
test('en', () => expect(formatDay('2026-11-27', 'en')).toBe('November 27'))
test('ky uses Kyrgyz month names', () => expect(formatDay('2026-11-27', 'ky')).toBe('27-ноябрь'))
test('ky with year', () => expect(formatDay('2026-01-05', 'ky', true)).toBe('2026-ж. 5-январь'))
