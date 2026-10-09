import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));

export default defineConfig({
  testDir: fileURLToPath(new URL('../../../../tests/e2e/', import.meta.url)),
  outputDir: fileURLToPath(
    new URL('../../../../test-results/', import.meta.url),
  ),
  testMatch: '*.spec.mjs',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: true,
  failOnFlakyTests: true,
  retries: 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: fileURLToPath(
          new URL(
            '../../../../test-results/browser-results.json',
            import.meta.url,
          ),
        ),
      },
    ],
    [
      fileURLToPath(
        new URL('../internal/strict-browser-reporter.mjs', import.meta.url),
      ),
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:4392',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    cwd: projectRoot,
    command: 'npm run preview -- --host 127.0.0.1 --port 4392',
    url: 'http://127.0.0.1:4392',
    reuseExistingServer: false,
  },
});
