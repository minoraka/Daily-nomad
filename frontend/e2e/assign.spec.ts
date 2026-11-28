import { expect, test, type Browser, type Page } from '@playwright/test'

async function as(browser: Browser, username: string): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  await page.goto('/login')
  await page.fill('input[autocomplete=username]', username)
  await page.fill('input[type=password]', 'demo12345')
  await page.click('button.btn-primary')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'))
  await page.goto('/board')
  await expect(page.locator('.task-card').first()).toBeVisible()
  return page
}

async function drag(page: Page, card: ReturnType<Page['locator']>, column: string) {
  const target = page.getByTestId(`column-${column}`).locator('.column-body')
  const cb = (await card.boundingBox())!
  const tb = (await target.boundingBox())!
  await page.mouse.move(cb.x + 20, cb.y + 10)
  await page.mouse.down()
  await page.mouse.move(cb.x + 40, cb.y + 30, { steps: 5 })
  await page.mouse.move(tb.x + 40, tb.y + tb.height - 5, { steps: 15 })
  await page.mouse.up()
}

const cardIn = (page: Page, column: string, title: string) =>
  page.getByTestId(`column-${column}`).locator('.task-card', { hasText: title })

test('assign → review → return with comment → accept', async ({ browser }) => {
  const teacher = await as(browser, 'demo_teacher')
  await teacher.getByTestId('add-task').click()
  await teacher.getByTestId('task-title').fill('E2E лаба')
  await teacher.getByTestId('task-save').click()
  await expect(teacher.getByTestId('flash')).toHaveText(/^Назначено \d+ студент/)

  const student = await as(browser, 'student1')
  await student.getByTestId('quick-mine').click()
  const todo = cardIn(student, 'todo', 'E2E лаба')
  await expect(todo).toBeVisible()
  await expect(todo.locator('.from-teacher')).toBeVisible()

  await drag(student, todo, 'done')
  await expect(student.getByTestId('notice')).toHaveText('Задачу принимает преподаватель')
  await expect(cardIn(student, 'done', 'E2E лаба')).toHaveCount(0)

  await drag(student, cardIn(student, 'todo', 'E2E лаба'), 'review')
  await student.reload()
  await student.getByTestId('quick-mine').click()
  await expect(cardIn(student, 'review', 'E2E лаба')).toBeVisible()

  await teacher.reload()
  await teacher.getByTestId('board-search').fill('E2E лаба')
  await teacher.getByTestId('student-filter').selectOption({ label: 'Иванова Аня' })
  await cardIn(teacher, 'review', 'E2E лаба').click()
  await teacher.getByTestId('return').click()
  await teacher.getByTestId('return-comment').fill('Добавь тесты')
  await teacher.getByTestId('return-confirm').click()
  await expect(cardIn(teacher, 'in_progress', 'E2E лаба')).toBeVisible()

  await student.reload()
  await student.getByTestId('quick-mine').click()
  const back = cardIn(student, 'in_progress', 'E2E лаба')
  await expect(back).toBeVisible()
  await back.click()
  await expect(student.getByTestId('comment').last()).toContainText('Добавь тесты')
  await student.getByTestId('detail-status').selectOption({ label: 'На проверке' })
  await expect(cardIn(student, 'review', 'E2E лаба')).toBeVisible()

  await teacher.reload()
  await teacher.getByTestId('board-search').fill('E2E лаба')
  await teacher.getByTestId('student-filter').selectOption({ label: 'Иванова Аня' })
  await cardIn(teacher, 'review', 'E2E лаба').click()
  await teacher.getByTestId('accept').click()
  await expect(cardIn(teacher, 'done', 'E2E лаба')).toBeVisible()

  await student.reload()
  await student.getByTestId('quick-mine').click()
  const done = student.getByTestId('column-done').locator('[data-draggable]', { hasText: 'E2E лаба' })
  await expect(done).toHaveAttribute('data-draggable', 'false')
})

test('search by number and overdue filter', async ({ browser }) => {
  const student = await as(browser, 'student1')
  const key = await student.locator('.t-key').first().innerText()
  await student.getByTestId('board-search').fill(key.trim())
  await expect(student.locator('.task-card')).toHaveCount(1)
  await student.getByTestId('board-search').fill('')
  await student.getByTestId('quick-overdue').click()
  await expect(student.locator('.task-card').first()).toContainText('Лабораторная 1')
  await expect(student.locator('.deadline.overdue').first()).toBeVisible()
})
