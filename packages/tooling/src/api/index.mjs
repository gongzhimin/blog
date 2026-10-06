import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const verifyCli = fileURLToPath(new URL('../cli/verify.mjs', import.meta.url));
const validModes = new Set(['all', 'docs', 'boundaries']);

/**
 * Run the repository's read-only engineering checks and return one report.
 *
 * @param {{root?: string, mode?: 'all'|'docs'|'boundaries'}} [input]
 * @returns {{ok:boolean,mode:string,diagnostics:string[],stdout:string,stderr:string}}
 */
export function inspectRepository(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      mode: 'all',
      diagnostics: ['Input must be an object'],
      stdout: '',
      stderr: '',
    };
  }
  const { root = process.cwd(), mode = 'all' } = input;
  if (!validModes.has(mode)) {
    return {
      ok: false,
      mode,
      diagnostics: [`Unsupported inspection mode: ${mode}`],
      stdout: '',
      stderr: '',
    };
  }
  if (typeof root !== 'string' || root.trim() === '') {
    return {
      ok: false,
      mode,
      diagnostics: ['root must be a non-empty directory path'],
      stdout: '',
      stderr: '',
    };
  }

  const child = spawnSync(process.execPath, [verifyCli, mode], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';
  const diagnostics = stderr
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);

  if (child.error) diagnostics.push(child.error.message);
  if (child.status !== 0 && diagnostics.length === 0)
    diagnostics.push(`Inspection process exited with status ${child.status}`);

  return {
    ok: child.status === 0,
    mode,
    diagnostics,
    stdout,
    stderr,
  };
}
