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

// Compile-only controls: unused @ts-expect-error means an API silently became any.
declare const document: BookDocument;
declare const config: BookConfig;
declare const homepageInput: SiteHomepageInput;

const book = buildBook({ document, config });
if (book.ok) {
  const id: string = book.value.document.id;
  void id;
} else {
  const phase: 'validate' | 'build' = book.diagnostics[0].phase;
  void phase;
}
const homepage = buildHomepageModel(homepageInput);
if (homepage.ok) {
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
