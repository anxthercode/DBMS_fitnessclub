import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/mock',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    env: { VITE_API_MODE: 'mock', VITE_TEST_CONTROLS: 'true' },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
