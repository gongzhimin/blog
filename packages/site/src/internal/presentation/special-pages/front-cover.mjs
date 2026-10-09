/** Front cover content. Artwork remains in the configured sprite. */
export function frontCover() {
  return {
    className: 'hard book-page--front-cover',
    html: '<div class="side"></div>',
    artwork: 'front',
  };
}
