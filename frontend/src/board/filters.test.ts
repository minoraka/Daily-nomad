import { expect, test } from 'vitest'
import { makeMe, makeTask, userRef } from '../test/fixtures'
import { filterTasks, matchesQuery, type Quick } from './filters'

const me = makeMe(1), teacher = makeMe(9, 'teacher')
const fromTeacher = { created_by: userRef(9, 'teacher'), from_teacher: true }
const tasks = [
  makeTask({ id: 25, title: 'Свёрстать форму входа' }),
  makeTask({ id: 26, title: 'Лаба', ...fromTeacher, is_overdue: true }),
  makeTask({ id: 27, title: 'Тесты', owner: userRef(2), status: 'review' }),
  makeTask({ id: 28, title: 'Старое', owner: userRef(2), is_overdue: true }),
]
const run = (query: string, quick: Quick[] = [], who = me) => filterTasks(tasks, { query, quick: new Set(quick) }, who).map((t) => t.id)

test('query by title is case-insensitive', () => expect(run('ФОРМУ')).toEqual([25]))
test.each(['SB-25', 'sb25', 'sb 25', '25'])('query %s finds key SB-25', (q) => expect(matchesQuery(tasks[0], q)).toBe(true))
test('number query does not match other ids', () => expect(matchesQuery(tasks[0], '2')).toBe(false))
test('quick filters combine with AND', () => expect(run('', ['overdue', 'teacher'])).toEqual([26]))
test('mine for student = own cards', () => expect(run('', ['mine'])).toEqual([25, 26]))
test('mine for teacher means from_teacher', () => expect(run('', ['mine'], teacher)).toEqual([26]))
test('review filter', () => expect(run('', ['review'])).toEqual([27]))
test('empty opts returns all', () => expect(run('  ')).toEqual([25, 26, 27, 28]))
