import { escapeText } from './text.mjs';

/** Title leaf front; receives build-time metadata, not quote attribution. */
export function titlePage(content) {
  return {
    className: 'own-size book-page--title',
    artwork: 'titlePage',
    html: `<div class="book-content special-page title-page"><div class="title-page__container"><div class="title-page__header"><span class="title-page__tag">${escapeText(content.collectionLabel)}</span></div><h1 class="title-page__title">${escapeText(content.title)}</h1><div class="title-page__rule"></div><p class="title-page__subtitle">${escapeText(content.subtitle)}</p><div class="title-page__footer"><span class="title-page__author">${escapeText(content.author)}</span><span class="title-page__edition">${escapeText(content.editionLabel)}</span></div></div></div>`,
  };
}
