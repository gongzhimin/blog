import {
  buildBook,
  createBookTheme,
  type BookConfig,
  type BookDocument,
} from '@myblog/book-build';
import {
  buildHomepageModel,
  inspectHomepageConfig,
  type SiteHomepageInput,
} from '@myblog/site';
import { paginateBook, type BookRuntimePayload } from '@myblog/book-runtime';
import { startServer } from '@myblog/publishing';
import { runHealthChecks } from '@myblog/operations';
import { inspectRepository } from '@myblog/tooling';

declare const payload: BookRuntimePayload;
const pagination = paginateBook(payload);
if (pagination.ok) {
  const page: number = pagination.value.bodyStart;
  void page;
}
const server = startServer();
server.close();
const health = runHealthChecks();
health.then((report) => {
  const ok: boolean = report.results[0].ok;
  void ok;
});
const inspection = inspectRepository({ mode: 'boundaries' });
const diagnostics: string[] = inspection.diagnostics;
void diagnostics;
// @ts-expect-error Pagination requires a structured payload.
paginateBook('invalid');
// @ts-expect-error Publishing does not accept caller ports or configuration.
startServer({});
// @ts-expect-error Operations has no arbitrary shell command input.
runHealthChecks({ command: 'unsafe' });
// @ts-expect-error Inspection accepts only documented modes.
inspectRepository({ mode: 'tests' });

// Compile-only controls: unused @ts-expect-error means an API silently became any.
declare const document: BookDocument;
declare const config: BookConfig;
declare const homepageInput: SiteHomepageInput;

const book = buildBook({ document, config });
if (book.ok) {
  const measured = paginateBook(book.value.config);
  if (measured.ok) {
    const mapped: number = measured.value.bodyStart;
    void mapped;
  }
  const id: string = book.value.document.id;
  void id;
} else {
  const phase: 'validate' | 'build' = book.diagnostics[0].phase;
  void phase;
}
const homepage = buildHomepageModel(homepageInput);
if (homepage.ok) {
  paginateBook(homepage.value.runConfig);
  const quote: string = homepage.value.quote.english;
  void quote;
}
inspectHomepageConfig({});

// @ts-expect-error A document cannot be replaced with an untyped string.
buildBook({ document: 'invalid', config });
createBookTheme('classic-paper', {
  // @ts-expect-error CSS inputs are strings, not numbers.
  fontsCSS: 42,
  bookContentCSS: '',
  codeHighlightCSS: '',
  bookTocCSS: '',
});
// @ts-expect-error The Site task requires collection/config/theme inputs.
buildHomepageModel({});
// @ts-expect-error Inspection accepts a configuration object.
inspectHomepageConfig(42);
