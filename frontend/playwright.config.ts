import { defineConfig } from '@playwright/test'

const DB = `${process.cwd()}/test-results/e2e.sqlite3`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5174', viewport: { width: 1280, height: 900 } },
  webServer: [
    {
      command: `mkdir -p test-results && rm -f ${DB} && cd ../backend && SQLITE_PATH=${DB} .venv/bin/python manage.py migrate -v0 && SQLITE_PATH=${DB} .venv/bin/python manage.py seed_demo && SQLITE_PATH=${DB} .venv/bin/python manage.py runserver 8001 --noreload`,
      url: 'http://localhost:8001/api/groups/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'API_TARGET=http://localhost:8001 npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174',
      reuseExistingServer: false,
    },
  ],
})
