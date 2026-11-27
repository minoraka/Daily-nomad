import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, username: string) {
  await page.goto('/login')
  await page.fill('input[autocomplete=username]', username)
  await page.fill('input[type=password]', 'demo12345')
  await page.click('button.btn-primary')
}

async function register(page: Page, username: string) {
  await page.goto('/register')
  await page.fill('input[autocomplete=family-name]', 'Новиков')
  await page.fill('input[autocomplete=given-name]', 'Нурлан')
  await page.selectOption('select', { label: 'ИС-21' })
  await page.fill('input[autocomplete=username]', username)
  await page.fill('input[type=password]', 'Str0ng-pass!')
  await page.click('button.btn-primary')
  await expect(page.getByTestId('streak')).toBeVisible()
}

test('student: task, drag, daily, streak', async ({ page }) => {
  await register(page, 'e2e_student')
  await expect(page.getByTestId('streak-count')).toHaveText('0 дней подряд!')

  await page.goto('/board')
  await page.getByTestId('add-task').click()
  await page.getByTestId('task-title').fill('E2E задача')
  await page.getByTestId('task-save').click()
  const card = page.getByTestId('column-todo').locator('.task-card', { hasText: 'E2E задача' })
  await expect(card).toBeVisible()

  const target = page.getByTestId('column-in_progress').locator('.column-body')
  const cb = (await card.boundingBox())!
  const tb = (await target.boundingBox())!
  await page.mouse.move(cb.x + 20, cb.y + 10)
  await page.mouse.down()
  await page.mouse.move(cb.x + 40, cb.y + 30, { steps: 5 })
  await page.mouse.move(tb.x + 40, tb.y + tb.height - 5, { steps: 15 })
  await page.mouse.up()
  await page.reload()
  await expect(page.getByTestId('column-in_progress').locator('.task-card', { hasText: 'E2E задача' })).toBeVisible()

  await page.goto('/dailies')
  await page.getByTestId('write-daily').click()
  await page.getByTestId('daily-done').fill('Сделал задачу через e2e')
  await page.getByRole('button', { name: 'E2E задача' }).click()
  await page.getByTestId('daily-save').click()
  await expect(page.getByTestId('write-daily')).toHaveText('Редактировать сегодняшний')

  await page.goto('/')
  await expect(page.getByTestId('streak-count')).not.toHaveText('0 дней подряд!')
})

test('language and theme persist', async ({ page }) => {
  await login(page, 'student2')
  await expect(page.getByTestId('streak')).toBeVisible()
  await page.locator('.lang-switch button', { hasText: 'KY' }).click()
  await page.getByTestId('theme-toggle').click()
  await page.reload()
  await expect(page.locator('.nav-item.active')).toHaveText('Башкы бет')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('teacher: read-only board, group switch', async ({ page }) => {
  await login(page, 'demo_teacher')
  await expect(page.getByTestId('group-switcher')).toBeVisible()
  await expect(page).toHaveURL(/\/board/)
  await expect(page.getByTestId('column-todo').locator('.task-card').first()).toBeVisible()
  await expect(page.getByTestId('add-task')).toHaveCount(0)
  const before = await page.locator('.t-owner').allInnerTexts()
  await page.getByTestId('group-switcher').selectOption({ label: 'Поток: ИС-22' })
  await expect(page.locator('.t-owner').first()).not.toHaveText(before[0])
  await expect(page.locator('.nav-item', { hasText: 'Главная' })).toHaveCount(0)
})

test('expired session redirects to login', async ({ page }) => {
  await login(page, 'student3')
  await expect(page.getByTestId('streak')).toBeVisible()
  await page.evaluate(() => {
    localStorage.setItem('sb-access', 'broken')
    localStorage.setItem('sb-refresh', 'broken')
  })
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
})
