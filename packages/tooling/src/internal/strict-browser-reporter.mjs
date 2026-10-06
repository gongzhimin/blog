/** Fail acceptance even when Playwright considers skips or expected failures successful. */
export default class StrictBrowserReporter {
  count = 0;
  violations = 0;

  onTestEnd(test, result) {
    this.count++;
    if (
      test.expectedStatus !== 'passed' ||
      result.status !== 'passed' ||
      result.retry !== 0
    )
      this.violations++;
  }

  onEnd(result) {
    return {
      status:
        result.status === 'passed' && this.count > 0 && this.violations === 0
          ? 'passed'
          : 'failed',
    };
  }
}
