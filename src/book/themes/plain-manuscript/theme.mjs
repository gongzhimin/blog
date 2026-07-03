function toArticleMeasure(css) {
  return css.replace(/\.sj-book \.book-content/g, "#__bap_inner");
}

function toTocMeasure(css) {
  return css.replace(/\.sj-book \.table-contents/g, "#__toc");
}

export function createPlainManuscriptTheme({
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  surfaceCSS,
  katexCSS,
}) {
  const visualCSS =
    katexCSS +
    codeHighlightCSS +
    fontsCSS +
    surfaceCSS +
    bookContentCSS +
    bookTocCSS;

  return {
    id: "plain-manuscript",
    name: "Plain Manuscript",
    runtime: {
      id: "plain-manuscript",
      name: "Plain Manuscript",
    },
    styles: {
      fontsCSS,
      bookContentCSS,
      codeHighlightCSS,
      bookTocCSS,
      visualCSS,
    },
    measurement: {
      articleCSS:
        katexCSS + codeHighlightCSS + toArticleMeasure(bookContentCSS),
      tocCSS: toTocMeasure(bookTocCSS),
    },
  };
}
