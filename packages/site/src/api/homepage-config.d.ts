export type HomepageConfigInspection =
  | { ok: true; schema: Record<string, unknown> }
  | { ok: false; schema: Record<string, unknown>; diagnostic: string };

/**
 * Build the editor schema and validate one legacy homepage configuration.
 * This integration entry is used by Tooling's reference generator.
 *
 * @param config Configuration object to validate; it is not modified.
 * @returns The schema and either successful validation or one diagnostic.
 */
export function inspectHomepageConfig(
  config: Record<string, unknown>,
): HomepageConfigInspection;
