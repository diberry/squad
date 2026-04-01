import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4322/squad/',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'npm run build && npx astro preview --port 4322',
    port: 4322,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
