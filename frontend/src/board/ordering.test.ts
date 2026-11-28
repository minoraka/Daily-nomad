import { describe, expect, test } from 'vitest'
import type { TaskStatus } from '../api/types'
import { makeTask, userRef } from '../test/fixtures'
import { applyDrop, computeDrop, ownIndexAt } from './ordering'

let seq = 0
const mk = (owner: number, status: TaskStatus = 'todo') => makeTask({ id: ++seq, owner: userRef(owner), status })
const A = 1, B = 2

describe('ownIndexAt', () => {
  test('counts only owner tasks before index', () => {
    const col = [mk(A), mk(B), mk(A), mk(B)]
    expect(ownIndexAt(col, A, 3)).toBe(2)
    expect(ownIndexAt(col, A, 0)).toBe(0)
    expect(ownIndexAt(col, B, 4)).toBe(2)
  })
  test('empty column', () => {
    expect(ownIndexAt([], A, 0)).toBe(0)
  })
})

describe('computeDrop', () => {
  test('drop on a card in another column inserts before it', () => {
    const a1 = mk(A, 'todo'), b1 = mk(B, 'done'), a2 = mk(A, 'done')
    const d = computeDrop([a1, b1, a2], a1.id, `task-${a2.id}`)
    expect(d).toEqual({ status: 'done', position: 0 })
  })
  test('drop on a column appends after own cards', () => {
    const a1 = mk(A, 'todo'), a2 = mk(A, 'done'), b1 = mk(B, 'done')
    expect(computeDrop([a1, a2, b1], a1.id, 'col-done')).toEqual({ status: 'done', position: 1 })
  })
  test('moving down within a column lands after the target', () => {
    const a1 = mk(A), a2 = mk(A), a3 = mk(A)
    expect(computeDrop([a1, a2, a3], a1.id, `task-${a3.id}`)).toEqual({ status: 'todo', position: 2 })
  })
  test('moving up within a column lands before the target', () => {
    const a1 = mk(A), a2 = mk(A), a3 = mk(A)
    expect(computeDrop([a1, a2, a3], a3.id, `task-${a1.id}`)).toEqual({ status: 'todo', position: 0 })
  })
  test('no-op returns null', () => {
    const a1 = mk(A)
    expect(computeDrop([a1], a1.id, `task-${a1.id}`)).toBeNull()
    expect(computeDrop([a1], a1.id, 'col-todo')).toBeNull()
  })
})

test('applyDrop puts the card into the target column', () => {
  const a1 = mk(A, 'todo'), a2 = mk(A, 'done')
  const out = applyDrop([a1, a2], a1.id, `task-${a2.id}`)
  expect(out.filter((t) => t.status === 'done').map((t) => t.id)).toEqual([a1.id, a2.id])
})
