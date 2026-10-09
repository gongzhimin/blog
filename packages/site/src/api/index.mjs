import { buildBook } from '@myblog/book-build';
import { createAstroBlogDocument } from '../internal/sources/astro-blog-source.mjs';
import { buildHomepageStyles } from '../internal/presentation/build-homepage-styles.mjs';
import { createSpecialPages } from '../internal/presentation/special-pages/index.mjs';

export { inspectHomepageConfig } from './homepage-config.mjs';

/**
 * Compose the page model used by the primary flipbook homepage.
 * Collection adaptation, Book Build, theme attachment, styles, and quote
 * fallback are one Site task; Astro remains responsible for rendering HTML.
 *
 * @param {{lifePosts:object[],blogPosts:object[],bookConfig:object,dailyQuote?:object|null,theme:object}} input
 * @returns {{ok:true,value:{document:object,runConfig:object,homepageStyles:string,quote:{english:string,chinese:string,author:string}}}|{ok:false,diagnostics:Array<{code:string,phase:string,message:string}>}}
 */
export function buildHomepageModel(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return {
      ok: false,
      diagnostics: [
        diagnostic('SITE_INPUT_INVALID', 'input', 'input must be an object'),
      ],
    };
  const { lifePosts, blogPosts, bookConfig, dailyQuote, theme } = input;
  let document;
  try {
    document = createAstroBlogDocument({ lifePosts, blogPosts });
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnostic('SITE_INPUT_INVALID', 'input', error)],
    };
  }

  const book = buildBook({ document, config: bookConfig });
  if (!book.ok) {
    return {
      ok: false,
      diagnostics: book.diagnostics.map((item) => ({
        code: item.code,
        phase: `book-${item.phase}`,
        message: item.message,
      })),
    };
  }

  try {
    const runConfig = book.value.config;
    runConfig.theme = theme.runtime;
    runConfig.specialPages = createSpecialPages(runConfig);
    const nav = bookConfig.nav;
    const footer = bookConfig.footer;
    const homepageStyles = buildHomepageStyles({
      book: bookConfig.book,
      cover: bookConfig.book.coverSprite,
      footer,
      light: {
        nav: nav.light,
        footer: footer.light,
        background: bookConfig.backgrounds.light,
      },
      mobileCanvas: bookConfig.book.mobileCanvas,
      mobileContentPage: bookConfig.book.mobileContentPage,
      nav,
      theme,
    });
    return {
      ok: true,
      value: {
        document,
        runConfig,
        homepageStyles,
        quote: {
          english: dailyQuote?.english || footer.content.quoteEnglish,
          chinese: dailyQuote?.chinese || footer.content.quoteChinese,
          author: dailyQuote?.author || footer.content.author,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [diagnostic('SITE_MODEL_FAILED', 'compose', error)],
    };
  }
}

function diagnostic(code, phase, error) {
  return {
    code,
    phase,
    message: error instanceof Error ? error.message : String(error),
  };
}
