import { buildBookRuntime } from '../internal/assembler/build-book-runtime.mjs';
import {
  renderMarkdown,
  stripLeadingTitle,
  romanTocPage,
} from '../internal/renderers/markdown-renderer.mjs';
import { validateBookConfig } from '../internal/config/book-config.mjs';

export { renderArticle } from './content.mjs';
export { createBookTheme } from './book-theme.mjs';

/** Build a book payload using the package defaults. */
export function buildBook({ document, config }) {
  try {
    validateBookConfig(config);
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'BOOK_CONFIG_INVALID',
          phase: 'validate',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }

  try {
    return {
      ok: true,
      value: buildBookRuntime({
        document,
        bookConfig: config,
        renderMarkdown,
        stripLeadingTitle,
        romanTocPage,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'BOOK_BUILD_FAILED',
          phase: 'build',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}
