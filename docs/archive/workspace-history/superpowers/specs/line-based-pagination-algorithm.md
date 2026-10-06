---
title: "Line-Based Pagination Algorithm"
date: 2026-06-28
status: design
---

# Line-Based Pagination Algorithm

## Problem

All previous pagination approaches failed because they tried to **split HTML elements into pieces at build time**. A `<p>` split into two `<p>`s loses its original rendering context — each fragment becomes an independent block element with its own margins, line breaks, and text flow. The result never matches the original single-`<p>` rendering.

## Core Insight

**Never split HTML. Record positions.**

Instead of producing `<p>first 23 chars</p>` and `<p>remaining chars</p>`, record `{ elIdx: 0, textStart: 0, textEnd: 23 }`. The original HTML stays intact. At reconstruction time, extract exactly the needed text range from the original `rawHTML`.

## Data Structure: ArticleLayout

```ts
ArticleLayout = {
  elements: ElementDescriptor[];
  lines: LineDescriptor[];
}

ElementDescriptor = {
  tag: string;               // 'p' | 'h1' | 'pre' | 'table' | 'img' | ...
  rawHTML: string;           // original outerHTML, never modified
  plainText: string;         // textContent, used for offset mapping
  totalH: number;            // total rendered height (px)

  // For elements that can't be split by text offset:
  useDirectHTML?: boolean;   // true for <table>, <img>, <hr>, .katex-display
}

LineDescriptor = {
  elIdx: number;             // index into elements[]
  textStart: number;         // offset in elements[elIdx].plainText
  textEnd: number;           // offset in elements[elIdx].plainText
  h: number;                 // measured line height (px)
  gap: number;               // 0 for mid-element lines;
                             // = collapsed margin for first line of an element
}
```

### Gap semantics

- **Mid-element lines** (`elIdx` same as previous line): `gap = 0`. Text flows continuously; browser handles line breaks naturally.
- **First line of a new element**: `gap = this element's top − previous element's bottom`. This captures the actual rendered spacing including margin collapsing.

### useDirectHTML semantics

Elements that cannot be meaningfully split by character offset (`<table>`, `<img>`, `<hr>`, `.katex-display`) store their complete HTML per "line" (per `<tr>` for tables, per element for atomic blocks). At reconstruction time, these are output as-is rather than extracting text ranges.

---

## Algorithm: Three Steps

### Step 1 — measureLayout() [Puppeteer, runs in browser]

```
Input:  body HTML, CSS
Output: ArticleLayout

1. Render all HTML in a .book-content container
2. For each direct child element:
   a. Get bounding rect, computed style
   b. Determine element type:
      - text elements (p, h1-h6, blockquote, li):
        * Use caretPositionFromPoint(x, probeY) at each line-height interval
        * Record { elIdx, textStart, textEnd, h } for each detected line
        * If single-line: record one line with full text range
      - <pre>:
        * Split textContent by '\n'
        * Record one line per text line
      - <table>:
        * Each <tr> is one line
        * Store html: row.outerHTML, useDirectHTML: true
      - <img>, <hr>, .katex-display:
        * Single line
        * Store html: el.outerHTML, useDirectHTML: true
3. Compute gap for each line:
   - First line of first element: gap = 0
   - First line of element N: gap = element[N].top - element[N-1].bottom
   - Mid-element lines: gap = 0
```

### Step 2 — paginate() [Pure JS, no DOM]

```
Input:  ArticleLayout, maxH
Output: page breaks (array of line index ranges)

curH = 0
breaks = []
currentPageStart = 0

for i, line in enumerate(lines):
  lineH = line.h + line.gap
  if curH + lineH > maxH:
    breaks.push([currentPageStart, i])
    currentPageStart = i
    curH = lineH
  else:
    curH += lineH

breaks.push([currentPageStart, lines.length])
return breaks
```

### Step 3 — buildPageHTML() [Pure JS, no DOM]

```
Input:  ArticleLayout, page breaks
Output: chunks[] (one HTML string per page)

for each [start, end] in breaks:
  pageHTML = []

  // Group consecutive lines from the same element
  i = start
  while i < end:
    j = i
    while j < end && lines[j].elIdx === lines[i].elIdx:
      j++

    el = elements[lines[i].elIdx]
    if el.useDirectHTML:
      pageHTML.push(el.rawHTML)  // or the stored html for this line
    else:
      textStart = lines[i].textStart
      textEnd   = lines[j-1].textEnd
      htmlFragment = textOffsetToHTML(el.rawHTML, el.plainText, textStart, textEnd)
      isFirstGroup = (i === start)

      if isFirstGroup:
        pageHTML.push(wrapInTag(el.tag, htmlFragment))
      else:
        pageHTML.push(wrapInTag(el.tag, htmlFragment, 'no-indent'))

    i = j

  chunks.push(pageHTML.join('\n'))
```

---

## Helper Functions

### textOffsetToHTML(rawHTML, plainText, start, end)

Maps character offsets in `plainText` to byte offsets in `rawHTML`, safely skipping HTML tags.

```
visCount = 0, inTag = false, htmlStart = -1, htmlEnd = -1
for i in 0..rawHTML.length:
  ch = rawHTML[i]
  if ch === '<': inTag = true
  else if ch === '>': inTag = false
  else if !inTag:
    if visCount === start: htmlStart = i
    if visCount === end:   htmlEnd = i; break
    visCount++
return rawHTML.substring(htmlStart, htmlEnd)
```

### wrapInTag(tag, html, extraClass?)

```
openTag = match first '<tag ...>' from rawHTML
if extraClass && openTag has 'class="..."':
  openTag = replace class value with 'class="... extraClass"'
else if extraClass:
  openTag = '<tag class="extraClass">'
return openTag + html + '</tag>'
```

---

## CSS Requirement

`.book-content .no-indent { text-indent: 0 }` — already exists in the codebase.

---

## Key Design Decisions

1. **Lines are positions, not HTML fragments.** This preserves the original element's rendering context.

2. **gap is measured at element boundaries only.** Within an element, the browser handles line spacing naturally. The only "unknown" spacing is at element boundaries, where `gap = measuredTop − previousBottom` captures reality.

3. **useDirectHTML for atomic elements.** Tables, images, formulas can't be meaningfully split by character offset. Their lines store complete HTML.

4. **Zero DOM manipulation during pagination.** Steps 2 and 3 are pure data transforms.

5. **No height estimation.** Every `line.h` and `line.gap` comes from `getBoundingClientRect()` in a real browser.

---

## Comparison With Previous Approaches

| Aspect | Before | Now |
|--------|--------|-----|
| Line representation | Split HTML fragments | Character offsets in original HTML |
| Page break decision | Accumulate estimated heights / detect overflow visually | Accumulate measured line heights |
| HTML output | Reconstructed from fragments, format lost | Extracted from original rawHTML, format preserved |
| Element rendering context | Broken (N small elements) | Preserved (original element structure) |
| Splitting logic | Complex per-tag split functions | None; defined at line level |
| Margin collapse | Manually tracked, diverged after splits | Measured once, stored in gap |

---

## Fundamental Limitation: Text Identity Problem

### The Problem

Even though the algorithm correctly:

1. Measures every line's exact pixel height in a real browser
2. Records every line's character offset in the original text
3. Preserves the original HTML structure when extracting page content

**it still cannot produce pixel-perfect pagination.** The reason is fundamental:

**A text fragment renders differently than the same text as part of the whole.**

```
Original paragraph (100 chars):
  "排版是排列文字的艺术和技巧目的是让书面语言在展示时清晰可读美观中英
   文混排的一个核心挑战在于中文字符是等宽的方块字"

Extract chars 20-43 as an independent paragraph:
  "技巧目的是让书面语言在展示时清晰可读美观中英文混排的一个核心挑战"

These two fragments contain the SAME characters in the SAME order.
But the browser may break them at DIFFERENT positions.
```

Why? The browser's line-breaking algorithm considers the **entire paragraph** when deciding breakpoints. A character at position 25 might be at the end of a line in the full paragraph, but at the beginning of a line in the extracted fragment — because the text before it (positions 0-19) is missing, changing the entire layout computation.

**Build-time measurement measures "text A". Actual rendering renders "text B" (a subset of A). The browser layouts are different because the inputs are different.**

### Why This Is Unavoidable

- **CSS can't help**: No CSS property says "render this `<p>` as if it contains 100 characters but only show characters 20-43".
- **Build-time can't predict**: The only way to know how a substring renders is to actually render that substring. But the substring is only known after pagination decisions are made — which depend on the rendering. Circular.
- **Browser API doesn't exist**: No browser API allows querying "how would this text render if it started from character N?"

### Impact on All Approaches

| Approach | Why It Ultimately Fails |
|----------|------------------------|
| Estimate heights | Can't know actual rendered height without rendering |
| Measure in Puppeteer | Measures full text, not paginated fragments |
| Line-based offsets | Extract position X-Y → different text → different layout |
| Split into N elements | N independent elements ≠ 1 element with N lines |

### Remaining Viable Paths

**Path A: Accept imperfection (Current)**
Keep the current Puppeteer-measured line approach. The measurements are as accurate as build-time can get. Accept that there will be minor discrepancies (a few pixels here and there) because the paginated fragments don't render identically to the original whole.

**Path B: Never split block elements**
If a block element doesn't fit on the current page, move it entirely to the next page. This guarantees correct rendering (no text identity problem) at the cost of potentially large gaps at page bottoms. Works well for short-form content; problematic for long paragraphs.

**Path C: Runtime measurement**
Ship the complete HTML to the browser. Let JavaScript in the browser measure actual rendered heights, split content dynamically, and inject into Turn.js pages. This eliminates the text identity problem because measurement and rendering happen in the same context with the same text. Requires significant changes to `book-app.js`.

**Path D: Hybrid — build-time measurement, runtime correction**
Pre-compute layout at build time (current approach). At runtime in the browser, measure the actual height of each injected page and adjust — if too tall, move last element to next page; if too short, pull from next page. Small runtime overhead, but corrects build-time inaccuracies with real measurements.
