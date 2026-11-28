import { expect, test } from 'vitest'
import { labelColor } from './labels'

test('case-insensitive and stable', () => {
  expect(labelColor('Frontend')).toBe(labelColor('frontend'))
  expect(labelColor('Backend')).toMatch(/^label-c[0-7]$/)
})

test('spreads across colors', () => {
  const colors = new Set('abcdefghi'.split('').map(labelColor))
  expect(colors.size).toBeGreaterThanOrEqual(4)
})
