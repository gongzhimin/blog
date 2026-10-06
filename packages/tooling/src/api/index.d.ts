export type InspectionMode = 'all' | 'docs' | 'boundaries';
export type InspectRepositoryInput = { root?: string; mode?: InspectionMode };
export type InspectRepositoryReport = {
  ok: boolean;
  mode: InspectionMode;
  diagnostics: string[];
  stdout: string;
  stderr: string;
};
/** Synchronous, read-only subprocess; no network and no timeout. */
export function inspectRepository(
  input?: InspectRepositoryInput,
): InspectRepositoryReport;
