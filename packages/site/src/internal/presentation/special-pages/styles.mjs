import { createSpecialPages } from './index.mjs';

/** Sprite styles are bound to roles, never to estimated final page numbers. */
export function specialPageStyles(cover) {
  const pages = createSpecialPages({});
  return (
    Object.values(pages)
      .filter((page) => page.artwork)
      .map((page) => {
        const roleClass = page.className
          .split(' ')
          .find((name) => name.startsWith('book-page--'));
        const positions = cover.positions;
        const position =
          positions[page.artwork] ||
          (page.artwork === 'titlePage'
            ? positions.backInside
            : positions.back);
        return `.sj-book .${roleClass} {
      background-color: white;
      background-image: url(${cover.image}) !important;
      background-repeat: no-repeat;
      background-size: ${cover.backgroundSize};
      background-position: ${position} !important;
    }`;
      })
      .join('\n') +
    '\n.sj-book .book-page--title.own-size::before { content: none; background-image: none; }'
  );
}
