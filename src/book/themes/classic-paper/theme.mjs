const TOC_MEASURE_BASE_CSS =
  `#__toc{font-family:'Stempel-Garamond-W01-Roman',Georgia,"Times New Roman","Chiron Sung HK","Noto Serif SC","Songti SC","STSong","SimSun",serif;font-size:16px;line-height:1.7;overflow:hidden;overflow-wrap:break-word;word-break:break-word;width:300px;margin:80px auto}` +
  `#__toc h1{font-size:28px;font-weight:700;margin:0 0 20px;text-align:center}` +
  `#__toc ul{list-style:none;padding:0;margin:0}` +
  `#__toc li{margin-bottom:8px;font-size:15px}` +
  `#__toc a{color:#8b7355;text-decoration:none}`;

export function createClassicPaperTheme({
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  katexCSS,
}) {
  const articleContentCSS = bookContentCSS.replace(
    /\.sj-book \.book-content/g,
    "#__bap_inner",
  );
  const tocContentCSS = bookTocCSS.replace(
    /\.sj-book \.table-contents/g,
    "#__toc",
  );

  return {
    id: "classic-paper",
    name: "Classic Paper",
    runtime: {
      id: "classic-paper",
      name: "Classic Paper",
    },
    styles: {
      fontsCSS,
      bookContentCSS,
      codeHighlightCSS,
      bookTocCSS,
      visualCSS:
        katexCSS + codeHighlightCSS + fontsCSS + bookContentCSS + bookTocCSS,
    },
    measurement: {
      articleCSS: katexCSS + codeHighlightCSS + articleContentCSS,
      tocCSS: TOC_MEASURE_BASE_CSS + tocContentCSS,
    },
  };
}
