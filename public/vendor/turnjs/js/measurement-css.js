/**
 * Shared measurement CSS — single source of truth.
 * Must stay in sync with the book-content styles in index.astro.
 */
var MEASURE_CSS = {
  article:
    '#__bap_inner { font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.7;color:#3a3a3a;overflow:hidden;overflow-wrap:break-word;word-break:break-word }' +
    '#__bap_inner h1 { font-size:17px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#222 }' +
    '#__bap_inner h2 { font-size:14px;font-weight:600;margin:14px 0 6px;color:#333 }' +
    '#__bap_inner h3 { font-size:13px;font-weight:600;margin:10px 0 4px;color:#444 }' +
    '#__bap_inner p  { margin:0 0 7px;text-indent:1em }' +
    '#__bap_inner p:first-of-type { text-indent:0 }' +
    '#__bap_inner .no-indent { text-indent:0 }' +
    '#__bap_inner pre { font-size:10px;line-height:1.4;background:#f5f2eb;padding:5px 7px;margin:7px 0;border-radius:3px;white-space:pre-wrap }' +
    '#__bap_inner code { font-size:10px;background:#f5f2eb;padding:1px 3px;border-radius:2px }' +
    '#__bap_inner pre code { background:transparent;padding:0 }' +
    '#__bap_inner blockquote { margin:7px 0;padding:3px 7px 3px 9px;border-left:2px solid #c9b99a;color:#666;font-size:12px;font-style:italic }' +
    '#__bap_inner ul,#__bap_inner ol { padding-left:16px;margin:0 0 7px }' +
    '#__bap_inner li { margin-bottom:1px }' +
    '#__bap_inner .list-lvl-1 { padding-left:16px }' +
    '#__bap_inner .list-lvl-2 { padding-left:32px }' +
    '#__bap_inner .list-lvl-3 { padding-left:48px }' +
    '#__bap_inner table { width:100%;font-size:10px;border-collapse:collapse;margin:7px 0 }' +
    '#__bap_inner th,#__bap_inner td { padding:3px 5px;border-bottom:1px solid #ddd;text-align:left }' +
    '#__bap_inner img { max-width:100%;max-height:440px;margin:7px auto;display:block }' +
    '#__bap_inner .katex-display { margin:7px 0 }',

  toc:
    '#__toc { font-family:Georgia,"Times New Roman",serif;font-size:16px;line-height:1.7;color:#3a3a3a;overflow:hidden;overflow-wrap:break-word;word-break:break-word;width:300px;margin:80px auto }' +
    '#__toc h1 { font-size:28px;font-weight:700;margin:0 0 20px;text-align:center }' +
    '#__toc ul { list-style:none;padding:0;margin:0 }' +
    '#__toc li { margin-bottom:8px;font-size:15px }' +
    '#__toc a { color:#8b7355;text-decoration:none }' +
    '#__toc span { color:#aaa;font-size:12px;margin-left:6px }'
};
