import { defineConfig } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

const databaseUrl = process.env.TEST_DATABASE_URL || parseEnv(readFileSync('../backend/.env', 'utf8')).TEST_DATABASE_URL
if (!databaseUrl || new URL(databaseUrl).pathname !== '/northside_test') throw new Error('Configure local TEST_DATABASE_URL first')

// Browser checks use only the dedicated local PostgreSQL test database.
export default defineConfig({
  testDir: './tests/http',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: '.\\.venv\\Scripts\\python.exe -m tests.prepare_browser && .\\.venv\\Scripts\\python.exe -m uvicorn tests.browser_app:app --factory --host 127.0.0.1 --port 8001',
      cwd: '../backend',
      url: 'http://127.0.0.1:8001/api/v1/health/ready',
      env: { CORS_ORIGINS: '["http://127.0.0.1:5174"]', DATABASE_URL: databaseUrl },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { VITE_API_MODE: 'http', VITE_API_BASE_URL: 'http://127.0.0.1:8001/api/v1' },
      reuseExistingServer: false,
    },
  ],
})
