import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const cssPath = new URL("../public/book-runtime/css/cursor-dot.css", import.meta.url);
const scriptPath = new URL("../public/book-runtime/js/cursor-dot.js", import.meta.url);

function runCursorDom(html, { hoverNone = false } = {}) {
  const dom = new JSDOM(html, { runScripts: "outside-only" });
  dom.window.matchMedia = () => ({ matches: hoverNone });
  dom.window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  dom.window.eval(readFileSync(scriptPath, "utf8"));
  return dom;
}

test("cursor dot css defines the branded dot, hover scale, tooltip, and mobile fallback", () => {
  const css = readFileSync(cssPath, "utf8");

  assert.match(css, /--cursor-dot-size:\s*24px/);
  assert.match(css, /--cursor-dot-hover-size:\s*36px/);
  assert.match(css, /--cursor-dot-color:\s*#E8773C/i);
  assert.match(css, /--cursor-dot-hover-color:\s*#E87438/i);
  assert.match(css, /\.cursor-dot\.hover-link/);
  assert.doesNotMatch(css, /\.cursor-dot\.is-suppressed/);
  assert.match(css, /\.cursor-dot\.is-hidden/);
  assert.match(css, /\.cursor-tooltip/);
  assert.match(css, /\.cursor-text/);
  assert.match(css, /\.site-nav\s+\.cursor-dot/);
  assert.doesNotMatch(css, /\.site-nav\s+:where\(a, button, \[role="button"\]\)/);
  assert.match(css, /@media\s*\(hover:\s*none\)/);
});

test("cursor dot shows a tooltip label for interactive elements when hover is enabled", () => {
  const dom = runCursorDom(`
    <body>
      <a href="/life" data-cursor-label="Read life">Life</a>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector("a");

  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 12, clientY: 20 }));

  const dot = document.querySelector(".cursor-dot");
  const tooltip = document.querySelector(".cursor-tooltip");
  assert.ok(dot.classList.contains("hover-link"));
  assert.equal(tooltip.textContent, "Read life");
  assert.equal(tooltip.getAttribute("aria-hidden"), "false");
});

test("cursor dot enters the navigation stacking context so only text floats above it", () => {
  const dom = runCursorDom(`
    <body data-cursor-hover="nav">
      <header class="site-nav">
        <a href="/life"><span class="cursor-text">Life</span></a>
      </header>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector("a");

  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 12, clientY: 20 }));

  assert.equal(document.querySelector(".site-nav > .cursor-dot") !== null, true);
  assert.equal(document.querySelector(".site-nav > .cursor-tooltip") !== null, true);
});

test("cursor dot enters the navigation stacking context before hovering a link", () => {
  const dom = runCursorDom(`
    <body data-cursor-hover="nav">
      <header class="site-nav">
        <a href="/life"><span class="cursor-text">Life</span></a>
      </header>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const nav = document.querySelector(".site-nav");

  nav.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 12, clientY: 20 }));

  assert.equal(document.querySelector(".site-nav > .cursor-dot") !== null, true);
  assert.equal(document.querySelector(".cursor-dot").classList.contains("hover-link"), false);
});

test("cursor dot enters the navigation stacking context when its circle intersects the nav edge", () => {
  const dom = runCursorDom(`
    <body data-cursor-hover="nav">
      <header class="site-nav">
        <a href="/life"><span class="cursor-text">Life</span></a>
      </header>
      <main id="page"></main>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const nav = document.querySelector(".site-nav");
  const page = document.querySelector("#page");
  nav.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 390,
    bottom: 44,
    width: 390,
    height: 44,
  });

  page.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 40, clientY: 50 }));

  assert.equal(document.querySelector(".site-nav > .cursor-dot") !== null, true);
  assert.equal(document.querySelector(".site-nav > .cursor-tooltip") !== null, true);
});

test("cursor dot stays visible in book corners while fold-safe mode pauses tooltip and hover", () => {
  const dom = runCursorDom(`
    <body>
      <a href="/life" data-cursor-label="Read life">Life</a>
      <div class="sj-book"></div>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector("a");
  const book = document.querySelector(".sj-book");
  book.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 500,
    bottom: 500,
    width: 400,
    height: 400,
  });

  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 20, clientY: 20 }));
  assert.equal(document.querySelector(".cursor-dot").classList.contains("hover-link"), true);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "false");

  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 110, clientY: 110 }));

  const dot = document.querySelector(".cursor-dot");
  assert.equal(dot.classList.contains("is-hidden"), false);
  assert.equal(dot.classList.contains("is-suppressed"), false);
  assert.equal(dot.classList.contains("hover-link"), false);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "true");
  assert.match(dot.getAttribute("style"), /translate3d\(98px, 98px, 0\)/);
});

test("cursor dot keeps moving but ignores hover during the Turn.js corner cooldown", () => {
  const dom = runCursorDom(`
    <body>
      <a href="/life" data-cursor-label="Read life">Life</a>
      <div class="sj-book"></div>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector("a");
  const book = document.querySelector(".sj-book");
  let now = 1_000;
  dom.window.Date.now = () => now;
  book.getBoundingClientRect = () => ({
    left: 100,
    top: 100,
    right: 500,
    bottom: 500,
    width: 400,
    height: 400,
  });

  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 110, clientY: 110 }));
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 300 }));
  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 20, clientY: 20 }));

  const dot = document.querySelector(".cursor-dot");
  assert.equal(dot.classList.contains("is-hidden"), false);
  assert.equal(dot.classList.contains("hover-link"), false);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "true");
  assert.match(dot.getAttribute("style"), /translate3d\(288px, 288px, 0\)/);

  now = 2_000;
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 300, clientY: 300 }));
  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 20, clientY: 20 }));
  assert.equal(dot.classList.contains("hover-link"), true);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "false");
});

test("cursor dot highlights table of contents links without showing a tooltip", () => {
  const dom = runCursorDom(`
    <body data-cursor-hover="nav">
      <div class="table-contents">
        <a href="?post=abc">Article One <span>1</span></a>
      </div>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector(".table-contents a");

  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 80, clientY: 120 }));

  const dot = document.querySelector(".cursor-dot");
  const tooltip = document.querySelector(".cursor-tooltip");
  assert.equal(dot.classList.contains("hover-link"), true);
  assert.equal(tooltip.classList.contains("is-visible"), false);
  assert.equal(tooltip.getAttribute("aria-hidden"), "true");
});

test("cursor dot hides when the pointer leaves the document", () => {
  const dom = runCursorDom("<body><a href=\"/\">Home</a></body>");
  const { document, MouseEvent } = dom.window;

  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 20, clientY: 30 }));
  assert.equal(document.querySelector(".cursor-dot").classList.contains("is-hidden"), false);

  document.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

  assert.equal(document.querySelector(".cursor-dot").classList.contains("is-hidden"), true);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "true");
});

test("cursor hover can be disabled per page while keeping the dot", () => {
  const dom = runCursorDom(`
    <body data-cursor-hover="false">
      <a href="/classic">Classic</a>
    </body>
  `);
  const { document, MouseEvent } = dom.window;
  const link = document.querySelector("a");

  link.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 12, clientY: 20 }));

  assert.ok(document.querySelector(".cursor-dot"));
  assert.ok(document.querySelector(".cursor-tooltip"));
  assert.equal(document.querySelector(".cursor-dot").classList.contains("hover-link"), false);
  assert.equal(document.querySelector(".cursor-tooltip").getAttribute("aria-hidden"), "true");
});

test("cursor dot is not mounted on touch-only devices", () => {
  const dom = runCursorDom("<body><a href=\"/\">Home</a></body>", { hoverNone: true });

  assert.equal(dom.window.document.querySelector(".cursor-dot"), null);
  assert.equal(dom.window.document.querySelector(".cursor-tooltip"), null);
});
