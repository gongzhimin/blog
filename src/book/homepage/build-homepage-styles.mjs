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
    padding: 0 24px;
    border-bottom: 1px solid ${light.nav.border};
    background: rgba(232, 228, 222, 0.88);
    backdrop-filter: blur(8px);
    box-sizing: border-box;
  }

  .site-nav .inner {
    display: flex;
    align-items: center;
    gap: ${nav.innerGap}px;
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

  /* ── Soft matte paper material ───────────────────────────── */
  :root {
    --paper-base: #fbf8f1;
    --paper-warm: #f5eee3;
    --paper-edge: #e7dccb;
    --paper-edge-deep: #d4c5af;
    --paper-fiber: rgba(86, 68, 46, 0.072);
    --paper-speck: rgba(70, 52, 34, 0.082);
    --paper-light: rgba(255, 255, 255, 0.22);
    --paper-shadow-soft: rgba(64, 48, 32, 0.12);
    --paper-shadow-thin: rgba(64, 48, 32, 0.07);
  }

  .sj-book .page {
    box-shadow:
      0 0 14px rgba(64, 48, 32, 0.12),
      inset 0 0 0 1px rgba(92, 72, 48, 0.035);
  }

  .sj-book .own-size {
    position: relative;
    overflow: hidden;
    background-color: var(--paper-base);
    background-image:
      linear-gradient(180deg,
        var(--paper-light) 0%,
        rgba(255,255,255,0.06) 28%,
        transparent 54%),
      linear-gradient(90deg,
        rgba(82,58,34,0.034) 0%,
        transparent 10%,
        transparent 90%,
        rgba(82,58,34,0.028) 100%),
      linear-gradient(135deg,
        var(--paper-base) 0%,
        var(--paper-warm) 58%,
        var(--paper-edge) 100%);
  }

  .sj-book .own-size::before,
  .sj-book .own-size::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  .sj-book .own-size::before {
    opacity: 0.052;
    mix-blend-mode: multiply;
    background-image:
      radial-gradient(circle at 20% 30%, var(--paper-speck) 0 1px, transparent 1.45px),
      radial-gradient(circle at 70% 62%, rgba(70,52,34,0.06) 0 1px, transparent 1.4px),
      radial-gradient(circle at 42% 78%, rgba(255,255,255,0.72) 0 1px, transparent 1.55px);
    background-size: 38px 42px, 54px 48px, 46px 52px;
  }

  .sj-book .own-size::after {
    opacity: 0.038;
    background:
      repeating-linear-gradient(
        92deg,
        transparent 0 9px,
        var(--paper-fiber) 10px,
        transparent 11px
      );
  }

  .sj-book .book-content,
  .sj-book .table-contents {
    position: relative;
    z-index: 1;
  }
  .sj-book .own-size.odd  { background-image: linear-gradient(to left, var(--paper-edge) 0, transparent 7%, transparent 95%, var(--paper-edge-deep) 100%), linear-gradient(180deg, var(--paper-light) 0%, rgba(255,255,255,0.06) 28%, transparent 54%), linear-gradient(135deg, var(--paper-base) 0%, var(--paper-warm) 58%, var(--paper-edge) 100%); }
  .sj-book .own-size.even { background-image: linear-gradient(to right, var(--paper-edge) 0, transparent 7%, transparent 95%, var(--paper-edge-deep) 100%), linear-gradient(180deg, var(--paper-light) 0%, rgba(255,255,255,0.06) 28%, transparent 54%), linear-gradient(135deg, var(--paper-base) 0%, var(--paper-warm) 58%, var(--paper-edge) 100%); }

  .sj-book .depth {
    background-color: var(--paper-edge);
    background-image:
      linear-gradient(90deg, rgba(74,54,34,0.18), rgba(255,255,255,0.14), rgba(74,54,34,0.1)),
      repeating-linear-gradient(180deg, rgba(86,68,46,0.16) 0 1px, transparent 1px 3px);
    opacity: 0.74;
  }

  .site-footer {
    text-align: center;
    padding: ${footer.padding.top}px 24px ${footer.padding.bottom}px;
    color: ${light.footer.text};
    font-size: ${footer.fontSize}px;
    border-top: 1px solid ${light.footer.border};
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
  }

  /* ── Mobile 64K single-page ─────────────────────────────── */
  @media (max-width: ${book.mobileBreakpoint}px) {
    #canvas { width: ${mobileCanvas.width}px !important; height: auto !important; padding: ${mobileCanvas.paddingY}px 0 !important; }
    .sj-book { width: ${mobileContentPage.width}px !important; height: ${mobileContentPage.height}px !important; }
    .sj-book .hard,
    .sj-book .own-size { width: ${mobileContentPage.width}px !important; height: ${mobileContentPage.height}px !important; }
    #slider-bar { display: none; }
    body { overflow-x: hidden !important; }

    .site-nav { height: 44px; padding: 0 12px; }
    .site-nav .brand { font-size: 13px; }
    .site-nav .links { gap: 12px; }
    .site-nav .links a { font-size: 11px; }

    .site-footer { max-width: ${mobileCanvas.width}px; margin: 0 auto; padding: 4px 12px 24px; font-size: 11px; }
    .site-footer .quote { font-size: 11px; }
    .site-footer .copyright { font-size: 10px; }
  }
` + theme.styles.visualCSS;
}
