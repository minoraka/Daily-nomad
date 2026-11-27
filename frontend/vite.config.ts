/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(['/api', '/admin', '/static'].map((p) => [p, process.env.API_TARGET ?? 'http://localhost:8000'])),
  },
  test: { exclude: ["e2e/**", "node_modules/**"], environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
