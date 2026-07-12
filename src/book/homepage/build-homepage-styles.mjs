export function buildHomepageStyles({
  book,
  cover,
  footer,
  light,
  mobileCanvas,
  mobileContentPage,
  nav,
  theme,
}) {
  const paperTexture = book.paperTexture || {};
  const paperTextureCSS = paperTexture.enabled
    ? `
  .sj-book .own-size {
    --paper-x: 50%;
    --paper-y: 50%;
    position: relative;
  }

  .sj-book .own-size::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background-image: url("${paperTexture.image}");
    background-repeat: no-repeat;
    background-size: ${paperTexture.size || "auto"};
    background-position: var(--paper-x) var(--paper-y);
    opacity: ${paperTexture.opacity ?? 0.08};
    mix-blend-mode: ${paperTexture.blendMode || "multiply"};
  }

  .sj-book .own-size .book-content,
  .sj-book .own-size .table-contents {
    position: relative;
    z-index: 1;
  }

  .sj-book .own-size .page-number {
    z-index: 1;
  }
`
    : "";

  return `
  html {
    min-height: 100%;
    background: ${light.background.fabric};
  }

  body {
    min-height: 100vh;
    overflow-x: auto !important;
    overflow-y: auto !important;
    color: #3a3a3a;
  }

  .site-nav {
    position: sticky;
    top: 0;
    z-index: 1000;
    width: 100%;
    height: ${nav.height}px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-bottom: 1px solid ${light.nav.border};
    background: rgba(232, 228, 222, 0.88);
    backdrop-filter: blur(8px);
    box-sizing: border-box;
  }

  .site-nav .inner {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: ${book.canvasWidth}px;
    margin: 0 auto;
  }

  .nav-slogan {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    color: ${light.nav.sloganText};
    font-size: ${nav.sloganFontSize}px;
  }

  .site-nav .brand {
    color: ${light.nav.brandText};
    font-size: ${nav.brand.fontSize}px;
    letter-spacing: 0.08em;
    text-decoration: none;
  }

  .site-nav .links {
    display: flex;
    align-items: center;
    gap: ${nav.links.gap}px;
  }

  .site-nav .links a {
    color: ${light.nav.linkText};
    font-size: ${nav.links.fontSize}px;
    text-decoration: none;
  }

  .site-nav .links a:hover {
    color: ${light.nav.linkHover};
  }

  #canvas {
    visibility: hidden;
    width: ${book.canvasWidth}px !important;
    height: ${book.height}px !important;
    margin: 0 auto !important;
    padding: ${book.gap}px 0 !important;
  }

  .sj-book {
    width: ${book.width}px !important;
    height: ${book.height}px !important;
  }

  .sj-book .hard {
    width: ${book.hardPage.width}px;
    height: ${book.hardPage.height}px;
  }

  .sj-book .own-size {
    width: ${book.contentPage.width}px;
    height: ${book.contentPage.height}px;
    isolation: isolate;
  }

  .sj-book .p1 .side {
    width: ${book.spineStrip.width}px !important;
    left: ${book.spineStrip.left}px !important;
  }

  .sj-book .depth {
    top: ${book.depth.top}px;
    height: ${book.depth.height}px;
  }

  /* ── Cover sprites & content surface ───────────────── */
  .sj-book .p1,
  .sj-book .p2,
  .sj-book .p3 {
    background-color: white;
    background-image: url(${cover.image}) !important;
    background-repeat: no-repeat;
    background-size: ${cover.backgroundSize};
  }
  .sj-book .p1  { background-position: ${cover.positions.front} !important; }
  .sj-book .p2  { background-position: ${cover.positions.frontInside} !important; }
  .sj-book .p3  { background-position: ${cover.positions.backInside} !important; }
  /* Back-cover pages are injected at runtime by orchestrator.js to avoid stale
     estimated page numbers. */

  /* ── Paper texture ──────────────────────────────────────── */
  .sj-book .own-size {
    background-color: #f2f1ec;
    background-image:
      linear-gradient(to bottom,
        rgba(60,55,48,0.035) 0%,
        transparent 10%,
        transparent 88%,
        rgba(60,55,48,0.032) 100%),
      radial-gradient(ellipse at 48% 36%,
        rgba(255,255,255,0.48) 0%,
        rgba(255,255,255,0.16) 38%,
        transparent 72%),
      linear-gradient(135deg,
        #fbfaf5 0%,
        #f2f1ec 48%,
        #e8e5dc 100%);
  }
  .sj-book .own-size.odd  { background-image: linear-gradient(to left,  #e8e5dc 95%, #cdc8bc 100%), linear-gradient(to bottom, rgba(60,55,48,0.035) 0%, transparent 10%, transparent 88%, rgba(60,55,48,0.032) 100%), radial-gradient(ellipse at 48% 36%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.16) 38%, transparent 72%), linear-gradient(135deg, #fbfaf5 0%, #f2f1ec 48%, #e8e5dc 100%); }
  .sj-book .own-size.even { background-image: linear-gradient(to right, #e8e5dc 95%, #cdc8bc 100%), linear-gradient(to bottom, rgba(60,55,48,0.035) 0%, transparent 10%, transparent 88%, rgba(60,55,48,0.032) 100%), radial-gradient(ellipse at 48% 36%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.16) 38%, transparent 72%), linear-gradient(135deg, #fbfaf5 0%, #f2f1ec 48%, #e8e5dc 100%); }
${paperTextureCSS}

  .site-footer {
    text-align: center;
    padding: ${footer.padding.top}px 0 ${footer.padding.bottom}px;
    color: ${light.footer.text};
    font-size: ${footer.fontSize}px;
    border-top: 1px solid ${light.footer.border};
  }

  .site-footer .footer-inner {
    width: ${book.canvasWidth}px;
    margin: 0 auto;
  }

  .site-footer .quote {
    color: ${light.footer.quote};
    font-style: italic;
    margin-bottom: 6px;
  }

  .site-footer .copyright {
    color: ${light.footer.copyright};
    font-size: ${footer.copyrightFontSize}px;
    margin-top: 8px;
    text-align: center;
  }

  /* ── Custom cursor ──────────────────────────────────────── */
  html, a, button, [role="button"] { cursor: none; }

  .cursor-dot {
    position: fixed;
    top: 0; left: 0;
    width: 24px; height: 24px;
    border-radius: 50%;
    background: #E8773C;
    pointer-events: none;
    z-index: 99999;
    will-change: transform;
    transition: width 0.2s, height 0.2s;
  }

  .cursor-dot.hover-link {
    width: 36px; height: 36px;
    opacity: 0.55;
  }

  @media (hover: none) {
    html { cursor: auto; }
    .cursor-dot { display: none; }
  }

  /* ── Mobile 64K single-page ─────────────────────────────── */
  @media (max-width: ${book.mobileBreakpoint}px) {
    #canvas { width: ${mobileCanvas.width}px !important; height: auto !important; padding: ${mobileCanvas.paddingY}px 0 !important; }
    .sj-book { width: ${mobileContentPage.width}px !important; height: ${mobileContentPage.height}px !important; }
    .sj-book .hard,
    .sj-book .own-size { width: ${mobileContentPage.width}px !important; height: ${mobileContentPage.height}px !important; }
    #slider-bar { display: none; }
    body { overflow-x: hidden !important; }

    .site-nav { height: 44px; padding: 0; }
    .site-nav .inner { width: ${mobileCanvas.width}px; }
    .nav-slogan { display: none; }
    .site-nav .brand { font-size: 13px; }
    .site-nav .links { gap: 12px; }
    .site-nav .links a { font-size: 11px; }

    .site-footer { padding: 4px 0 24px; font-size: 11px; }
    .site-footer .footer-inner { width: ${mobileCanvas.width}px; }
    .site-footer .quote { font-size: 11px; }
    .site-footer .copyright { font-size: 10px; }
  }
` + theme.styles.visualCSS;
}
