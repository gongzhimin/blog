export type CheckResult = {
  id: string;
  label: string;
  ok: boolean;
  error: string;
};
export type HealthReport = { ok: boolean; results: CheckResult[] };
/** Executes the production profile only when called; requires an authorized Linux host. */
export function runHealthChecks(): Promise<HealthReport>;
