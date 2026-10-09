/** Outside back cover; keep the existing outer panel, not the inside panel. */
export function backCover() {
  return {
    className: 'hard book-page--back-cover',
    artwork: 'backOuter',
    html: '<div class="book-content special-page back-cover-page"></div>',
  };
}
