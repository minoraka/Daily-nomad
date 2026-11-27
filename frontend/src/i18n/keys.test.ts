import { expect, test } from 'vitest'
import ru from './ru.json'
import en from './en.json'
import ky from './ky.json'

const PLURAL = /_(one|few|many|other)$/
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`.replace(PLURAL, '')],
  )
}
const uniq = (a: string[]) => [...new Set(a)].sort()

test('all languages have the same keys', () => {
  expect(uniq(keys(en))).toEqual(uniq(keys(ru)))
  expect(uniq(keys(ky))).toEqual(uniq(keys(ru)))
})
