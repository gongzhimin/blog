import edition from '../../../data/book-edition.json' with { type: 'json' };
import { frontCover } from './front-cover.mjs';
import { frontInside } from './front-inside.mjs';
import { titlePage } from './title-page.mjs';
import { imprintPage } from './imprint-page.mjs';
import { backInside } from './back-inside.mjs';
import { backCover } from './back-cover.mjs';

/** Compose JSON-safe page definitions once, for both initial and measured pages. */
export function createSpecialPages(runConfig, year = new Date().getFullYear()) {
  const content = {
    ...edition,
    title:
      runConfig.source?.documentTitle ||
      runConfig.footer?.content?.copyright ||
      '志民的博客',
    year,
  };
  return {
    frontCover: frontCover(content),
    frontInside: frontInside(content),
    titlePage: titlePage(content),
    imprintPage: imprintPage(content),
    backInside: backInside(content),
    backCover: backCover(content),
  };
}
