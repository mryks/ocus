import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: '.', workers: 1, timeout: 90000, reporter: [['list']],
  use: { baseURL: process.env.OCUS_TEST_BASE_URL ?? 'http://127.0.0.1:8788', channel: 'msedge', trace: 'off' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', channel: 'msedge' } },
  ],
})
