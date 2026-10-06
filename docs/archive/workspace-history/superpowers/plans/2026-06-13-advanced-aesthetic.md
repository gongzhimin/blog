# Advanced Aesthetic Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the blog's design to a highly sophisticated minimalist aesthetic by refining typography contrast, implementing an asymmetric grid with aggressive whitespace, and adding subtle material details like hairline borders and custom selection colors.

**Architecture:** 
1. `global.css` will be significantly updated to redefine variables (colors, fonts), alter selection states, and refine borders to hairline thinness using pseudo-elements and opacity.
2. `index.astro` and archive pages will be restructured to use an asymmetric grid (e.g., `grid-cols-3`, with the left column empty or containing minimal meta, and the right two columns containing content).
3. The font stack will explicitly separate sans-serif (functional) and serif (reading) text.
4. Changes will be pushed to GitHub to trigger the established CI/CD pipeline for server deployment.

**Tech Stack:** Astro, CSS Grid, Tailwind-like utility concepts

---

### Task 1: Refine Global Variables, Fonts, and Selection State

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Update CSS Variables and Selection Color**

Redefine colors to be softer (no pure black), establish clear serif/sans-serif font stacks, and add a custom elegant selection color.

```css
/* Replace the :root block in global.css */
:root,
html[data-theme="light"] {
  /* Background colors - Keep warm editorial */
  --color-bg: 250, 246, 240;        /* #faf6f0 */
  --color-card: 245, 239, 232;

  /* Text colors - Refined: No pure black, softer greys */
  --color-text-primary: 42, 42, 42; /* #2A2A2A - Deep charcoal ink */
  --color-text-secondary: 80, 75, 70; /* Muted brown-grey */
  --color-text-muted: 139, 115, 85;   /* #8b7355 */
  
  /* Borders - Extremely subtle */
  --color-border: 210, 200, 190;
  
  /* Accents */
  --color-accent: 180, 150, 120;
  --color-code-bg: 240, 235, 225;

  /* Typography Tension */
  --font-serif: 'Georgia', 'Times New Roman', serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
}

body {
  font-family: var(--font-serif);
  color: rgb(var(--color-text-primary));
  background-color: rgb(var(--color-bg));
  /* Aggressive Whitespace: increase base line-height */
  line-height: 1.8;
  -webkit-font-smoothing: antialiased;
}

/* Elegant Selection */
::selection {
  background-color: rgba(210, 190, 150, 0.4);
  color: rgb(var(--color-text-primary));
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: redefine global variables for advanced typography and selection"
cd ..
```

---

### Task 2: Implement Hairline Borders and Meta Typography

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Update Typography and Borders**

Add styles for functional text (sans-serif) and redefine borders to be hairline.

```css
/* Append to global.css */

/* Functional Text (Meta, Categories, Links) */
.functional-text,
.category-title,
.archive-link,
footer a,
header a[href="/"] h1 {
  font-family: var(--font-sans);
}

.category-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgb(var(--color-text-muted));
  margin-bottom: 2rem;
  /* Hairline border */
  border-bottom: none;
  position: relative;
  padding-bottom: 1rem;
}

.category-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: rgba(var(--color-border), 0.5); /* Extremely subtle line */
}

/* Redefine post item borders to hairline */
.post-item,
article {
  border-bottom: none !important; /* override old inline styles if any */
  position: relative;
}

.post-item::after,
.archive-article::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: rgba(var(--color-border), 0.3);
}

/* Remove border from last item */
.post-item:last-child::after,
.archive-article:last-child::after {
  display: none;
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: implement hairline borders and functional sans-serif typography"
cd ..
```

---

### Task 3: Restructure Layouts for Asymmetric Grid

**Files:**
- Modify: `blog/src/styles/global.css`
- Modify: `blog/src/pages/index.astro`

- [ ] **Step 1: Define Asymmetric Grid Classes**

Update `.showcase-grid` in `global.css` and add archive layout classes.

```css
/* Update Layout Utilities in global.css */
.showcase-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4rem;
  margin-top: 4rem;
}

/* Asymmetric Grid for larger screens */
@media (min-width: 768px) {
  .showcase-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6rem; /* Aggressive whitespace */
  }
  
  .archive-grid {
    display: grid;
    grid-template-columns: 1fr 3fr;
    gap: 4rem;
    align-items: baseline;
  }
}

.post-title {
  font-size: 1.15rem;
  /* ... keep existing hover rules ... */
}
```

- [ ] **Step 2: Rewrite `index.astro`**

Update the HTML structure to apply the new semantic classes and improve spacing.

```astro
---
import '../styles/global.css';
import { getCollection } from 'astro:content';

const lifePosts = await getCollection('life');
const topLife = lifePosts.sort((a, b) => {
  const dateA = a.data.pubDatetime || a.data.date;
  const dateB = b.data.pubDatetime || b.data.date;
  return dateB.valueOf() - dateA.valueOf();
}).slice(0, 5);

const blogPosts = await getCollection('blog');
const topBlog = blogPosts.sort((a, b) => {
  const dateA = a.data.pubDatetime || a.data.date;
  const dateB = b.data.pubDatetime || b.data.date;
  return dateB.valueOf() - dateA.valueOf();
}).slice(0, 5);
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zhimin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body>
    <main style="max-width: 900px; margin: 0 auto; padding: 6rem 2rem;">
      <!-- Header -->
      <header style="margin-bottom: 6rem; display: flex; align-items: center; justify-content: center; gap: 1.5rem;">
        <a href="/" style="text-decoration: none; display: flex; align-items: center; gap: 1.5rem;">
          <img src="/logo.svg" alt="Logo" style="width: 32px; height: 32px; border-radius: 4px; display: block;" />
          <h1 class="functional-text" style="font-size: 1.25rem; font-weight: 500; letter-spacing: 0.1em; margin: 0; text-transform: uppercase;">
            Zhimin
          </h1>
        </a>
      </header>

      <!-- Showcase Grid -->
      <div class="showcase-grid">
        <!-- Left Column: Essays -->
        <section>
          <h2 class="category-title">Essays</h2>
          <div class="post-list">
            {topLife.map((post) => (
              <article class="post-item stagger-item" style="padding: 1.5rem 0;">
                <a href={`/life/${post.id}`} class="post-title">
                  {post.data.title}
                </a>
              </article>
            ))}
          </div>
          <a href="/life" class="archive-link stagger-item" style="margin-top: 2rem;">View all essays →</a>
        </section>

        <!-- Right Column: Technical -->
        <section>
          <h2 class="category-title">Technical</h2>
          <div class="post-list">
            {topBlog.map((post) => (
              <article class="post-item stagger-item" style="padding: 1.5rem 0;">
                <a href={`/blog/${post.id}`} class="post-title">
                  {post.data.title}
                </a>
              </article>
            ))}
          </div>
          <a href="/blog" class="archive-link stagger-item" style="margin-top: 2rem;">View all technical →</a>
        </section>
      </div>

      <!-- Footer -->
      <footer class="functional-text" style="margin-top: 8rem; text-align: center; color: rgb(var(--color-text-muted)); font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase;">
        <a href="/about" style="text-decoration: none; color: inherit;">About</a>
        <span style="margin: 0 1rem;">·</span>
        <a href="/rss.xml" style="text-decoration: none; color: inherit;">RSS</a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
cd blog
git add src/styles/global.css src/pages/index.astro
git commit -m "style: apply aggressive whitespace and asymmetric layouts to homepage"
cd ..
```

---

### Task 4: Push to GitHub and Trigger Deployment

**Files:**
- None directly modified, sync action.

- [ ] **Step 1: Push to remote**

```bash
cd blog
git push origin main
cd ..
```

- [ ] **Step 2: Verify**
Wait for GitHub Actions to complete and verify the changes on the live site.
