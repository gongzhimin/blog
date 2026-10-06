import { test as base, expect } from '@playwright/test';

export { expect };

// Browser exceptions and failed first-party assets invalidate successful UI assertions.
export const test = base.extend({
  runtimeEvidence: [
    async ({ page, baseURL }, use, testInfo) => {
      const errors = [];
      const origin = new URL(baseURL).origin;
      const pageError = (error) => errors.push(`pageerror: ${error.message}`);
      const responseError = (response) => {
        const url = new URL(response.url());
        if (url.origin === origin && response.status() >= 400)
          errors.push(`HTTP ${response.status()}: ${url.pathname}`);
      };
      const requestError = (request) => {
        const url = new URL(request.url());
        if (url.origin === origin)
          errors.push(
            `requestfailed: ${url.pathname}: ${request.failure()?.errorText}`,
          );
      };
      page.on('pageerror', pageError);
      page.on('response', responseError);
      page.on('requestfailed', requestError);
      try {
        await use();
      } finally {
        page.off('pageerror', pageError);
        page.off('response', responseError);
        page.off('requestfailed', requestError);
        if (errors.length)
          await testInfo.attach('browser-runtime-errors', {
            body: JSON.stringify(errors, null, 2),
            contentType: 'application/json',
          });
        expect(
          errors,
          'Uncaught browser errors or failed first-party resources',
        ).toEqual([]);
      }
    },
    { auto: true },
  ],
});
