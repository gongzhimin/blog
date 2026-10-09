/** Inside back cover; its physical page is assigned only after pagination. */
export function backInside() {
  return {
    className: 'hard fixed back-side book-page--back-inside',
    artwork: 'backInside',
    html: '<div class="book-content special-page back-inside-page"></div>',
  };
}
