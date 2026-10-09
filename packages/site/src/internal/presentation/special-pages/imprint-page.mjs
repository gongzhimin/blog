import { escapeText } from './text.mjs';

/** Title leaf reverse; the year is captured once during the build. */
export function imprintPage(content) {
  return {
    className: 'own-size even book-page--imprint',
    html: `<div class="book-content special-page imprint-page"><div class="imprint-page__container"><h2 class="imprint-page__heading">${escapeText(content.imprintHeading)}</h2><div class="imprint-page__rule"></div><p class="imprint-page__item"><strong>书名：</strong>${escapeText(content.title)}</p><p class="imprint-page__item"><strong>作者：</strong>${escapeText(content.author)}</p><p class="imprint-page__item"><strong>版本：</strong>${escapeText(content.version)}</p><p class="imprint-page__item"><strong>出版时间：</strong>${escapeText(content.year)} 年</p><div class="imprint-page__statement">${content.statements.map((text) => `<p>${escapeText(text)}</p>`).join('')}<p class="imprint-page__copyright">&copy; ${escapeText(content.year)} ${escapeText(content.author)}. ${escapeText(content.rights)}</p></div></div></div>`,
  };
}
