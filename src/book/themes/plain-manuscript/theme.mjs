const MANUSCRIPT_SURFACE_CSS = `
/* plain-manuscript theme */
.sj-book .own-size {
  background: #fbfaf4 !important;
  background-image:
    linear-gradient(to bottom, rgba(80,70,50,.035) 0 1px, transparent 1px 27px),
    linear-gradient(135deg, #fffdf8 0%, #f7f2e8 100%) !important;
}
`;

const MANUSCRIPT_CONTENT_CSS = `
.sj-book .book-content {
  width: 380px;
  margin: 54px auto 0;
  color: #2f2c27;
  font-family: Georgia, "Times New Roman", "Chiron Sung HK", "Noto Serif SC", "Songti SC", serif;
  font-size: 15px;
  line-height: 1.72;
}

.sj-book .book-content h1 {
  margin: 0 0 12px;
  color: #25221f;
  font-size: 20px;
  line-height: 1.3;
  text-align: left;
}

.sj-book .book-content p {
  margin: 0 0 10px;
  text-indent: 2em;
}

.sj-book .book-content a {
  color: #584f44;
}
`;

const MANUSCRIPT_TOC_CSS = `
.sj-book .table-contents {
  font-family: Georgia, "Times New Roman", "Chiron Sung HK", "Noto Serif SC", "Songti SC", serif;
  color: #2f2c27;
  font-size: 15px;
  line-height: 1.7;
}

.sj-book .table-contents h1 {
  margin: 0 0 18px;
  font-size: 22px;
  text-align: left;
}

.sj-book .table-contents ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sj-book .table-contents li {
  margin: 0 0 8px;
}

.sj-book .table-contents a {
  color: #584f44;
  text-decoration: none;
}
`;

function toArticleMeasure(css) {
  return css.replace(/\.sj-book \.book-content/g, "#__bap_inner");
}

function toTocMeasure(css) {
  return css.replace(/\.sj-book \.table-contents/g, "#__toc");
}

export function createPlainManuscriptTheme({
  fontsCSS,
  codeHighlightCSS,
  katexCSS,
}) {
  const visualCSS =
    katexCSS +
    codeHighlightCSS +
    fontsCSS +
    MANUSCRIPT_SURFACE_CSS +
    MANUSCRIPT_CONTENT_CSS +
    MANUSCRIPT_TOC_CSS;

  return {
    id: "plain-manuscript",
    name: "Plain Manuscript",
    runtime: {
      id: "plain-manuscript",
      name: "Plain Manuscript",
    },
    styles: {
      fontsCSS,
      bookContentCSS: MANUSCRIPT_CONTENT_CSS,
      codeHighlightCSS,
      bookTocCSS: MANUSCRIPT_TOC_CSS,
      visualCSS,
    },
    measurement: {
      articleCSS:
        katexCSS + codeHighlightCSS + toArticleMeasure(MANUSCRIPT_CONTENT_CSS),
      tocCSS: toTocMeasure(MANUSCRIPT_TOC_CSS),
    },
  };
}
