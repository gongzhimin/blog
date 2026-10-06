# Homepage Display Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the homepage into a responsive two-column showcase for the latest 5 posts from both 'Life' and 'Blog' categories, and create dedicated archive pages for each.

**Architecture:** 
1. `index.astro` will be rewritten to use CSS Grid (`grid-cols-1 md:grid-cols-2`), querying only the top 5 recent posts for each collection.
2. We will create `src/pages/life/index.astro` to list all life posts.
3. We will create `src/pages/blog/index.astro` to list all tech posts.

**Tech Stack:** Astro, HTML, CSS

---

### Task 1: Create Life Archive Page

**Files:**
- Create: `blog/src/pages/life/index.astro`

- [ ] **Step 1: Create the Life Archive page**

This page will reuse the existing minimalist list style from the original homepage, but scoped only to the `life` collection.

```astro
---
import '../../styles/global.css';
import { getCollection } from 'astro:content';

const lifePosts = await getCollection('life');
const sortedPosts = lifePosts.sort((a, b) => {
  const dateA = a.data.pubDatetime || a.data.date;
  const dateB = b.data.pubDatetime || b.data.date;
  return dateB.valueOf() - dateA.valueOf();
});
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Essays Archive · Zhimin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <main style="max-width: 680px; margin: 0 auto; padding: 4rem 1.5rem;">
      <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
        ← Back
      </a>
      
      <header style="margin-top: 2rem; margin-bottom: 3rem;">
        <h1 style="font-size: 1.75rem; font-weight: normal; letter-spacing: 0.02em;">Essays</h1>
        <p style="color: rgb(var(--color-text-muted)); font-style: italic; font-size: 0.9rem; margin-top: 0.5rem;">All life notes and essays.</p>
      </header>

      <div style="border-top: 1px solid rgb(var(--color-border));">
        {sortedPosts.map((post) => {
          const date = post.data.pubDatetime || post.data.date;
          return (
            <article style="padding: 1rem 0; border-bottom: 1px dotted rgb(var(--color-border)); display: flex; justify-content: space-between; align-items: baseline;">
              <a href={`/life/${post.id}`} style="text-decoration: none; color: inherit;">
                <span style="font-size: 1rem;">{post.data.title}</span>
              </a>
              <time style="color: rgb(var(--color-text-muted)); font-size: 0.85rem; white-space: nowrap; margin-left: 1rem;">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </time>
            </article>
          );
        })}
      </div>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Verify Build**

Run: `cd blog && npm run build`
Expected: Passes without errors, outputting `dist/life/index.html`.

- [ ] **Step 3: Commit**

```bash
cd blog
git add src/pages/life/index.astro
git commit -m "feat: add dedicated archive page for life notes"
cd ..
```

---

### Task 2: Create Blog Archive Page

**Files:**
- Create: `blog/src/pages/blog/index.astro`

- [ ] **Step 1: Create the Blog Archive page**

Similar to Task 1, but for the `blog` collection.

```astro
---
import '../../styles/global.css';
import { getCollection } from 'astro:content';

const blogPosts = await getCollection('blog');
const sortedPosts = blogPosts.sort((a, b) => {
  const dateA = a.data.pubDatetime || a.data.date;
  const dateB = b.data.pubDatetime || b.data.date;
  return dateB.valueOf() - dateA.valueOf();
});
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Technical Archive · Zhimin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <main style="max-width: 680px; margin: 0 auto; padding: 4rem 1.5rem;">
      <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
        ← Back
      </a>
      
      <header style="margin-top: 2rem; margin-bottom: 3rem;">
        <h1 style="font-size: 1.75rem; font-weight: normal; letter-spacing: 0.02em;">Technical</h1>
        <p style="color: rgb(var(--color-text-muted)); font-style: italic; font-size: 0.9rem; margin-top: 0.5rem;">All technical writings and guides.</p>
      </header>

      <div style="border-top: 1px solid rgb(var(--color-border));">
        {sortedPosts.map((post) => {
          const date = post.data.pubDatetime || post.data.date;
          return (
            <article style="padding: 1rem 0; border-bottom: 1px dotted rgb(var(--color-border)); display: flex; justify-content: space-between; align-items: baseline;">
              <a href={`/blog/${post.id}`} style="text-decoration: none; color: inherit;">
                <span style="font-size: 1rem;">{post.data.title}</span>
              </a>
              <time style="color: rgb(var(--color-text-muted)); font-size: 0.85rem; white-space: nowrap; margin-left: 1rem;">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </time>
            </article>
          );
        })}
      </div>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Verify Build**

Run: `cd blog && npm run build`
Expected: Passes without errors, outputting `dist/blog/index.html`.

- [ ] **Step 3: Commit**

```bash
cd blog
git add src/pages/blog/index.astro
git commit -m "feat: add dedicated archive page for technical blog posts"
cd ..
```

---

### Task 3: Rewrite Homepage Layout

**Files:**
- Modify: `blog/src/pages/index.astro`
- Modify: `blog/src/styles/global.css` (add grid classes)

- [ ] **Step 1: Add utility classes to CSS**

Append simple utility classes for our grid layout to `global.css`.

```css
/* --- Layout Utilities --- */
.showcase-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  margin-top: 2rem;
}

@media (min-width: 640px) {
  .showcase-grid {
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }
}

.category-title {
  font-size: 0.9rem;
  font-style: italic;
  color: rgb(var(--color-text-muted));
  margin-bottom: 1rem;
  border-bottom: 1px solid rgb(var(--color-border));
  padding-bottom: 0.5rem;
}

.post-item {
  margin-bottom: 1.25rem;
  line-height: 1.4;
}

.post-title {
  font-size: 1.05rem;
  color: rgb(var(--color-text-primary));
  text-decoration: none;
  display: block;
}

.post-title:hover {
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-border));
}

.archive-link {
  display: inline-block;
  margin-top: 1rem;
  font-size: 0.85rem;
  color: rgb(var(--color-text-muted));
  text-decoration: none;
}

.archive-link:hover {
  color: rgb(var(--color-text-primary));
}
```

- [ ] **Step 2: Rewrite index.astro**

Completely replace the contents of `blog/src/pages/index.astro`.

```astro
---
import '../styles/global.css';
import { getCollection } from 'astro:content';

// Get and sort life posts (top 5)
const lifePosts = await getCollection('life');
const topLife = lifePosts.sort((a, b) => {
  const dateA = a.data.pubDatetime || a.data.date;
  const dateB = b.data.pubDatetime || b.data.date;
  return dateB.valueOf() - dateA.valueOf();
}).slice(0, 5);

// Get and sort blog posts (top 5)
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
    <main style="max-width: 800px; margin: 0 auto; padding: 4rem 1.5rem;">
      <!-- Header -->
      <header style="margin-bottom: 4rem; text-align: center;">
        <h1 style="font-size: 1.75rem; font-weight: normal; letter-spacing: 0.02em;">
          Zhimin
        </h1>
      </header>

      <!-- Showcase Grid -->
      <div class="showcase-grid">
        
        <!-- Left Column: Essays -->
        <section>
          <h2 class="category-title">Essays</h2>
          <div class="post-list">
            {topLife.map((post) => (
              <article class="post-item">
                <a href={`/life/${post.id}`} class="post-title">
                  {post.data.title}
                </a>
              </article>
            ))}
          </div>
          <a href="/life" class="archive-link">View all essays →</a>
        </section>

        <!-- Right Column: Technical -->
        <section>
          <h2 class="category-title">Technical</h2>
          <div class="post-list">
            {topBlog.map((post) => (
              <article class="post-item">
                <a href={`/blog/${post.id}`} class="post-title">
                  {post.data.title}
                </a>
              </article>
            ))}
          </div>
          <a href="/blog" class="archive-link">View all technical →</a>
        </section>

      </div>

      <!-- Footer -->
      <footer style="margin-top: 5rem; text-align: center; color: rgb(var(--color-text-muted)); font-size: 0.85rem;">
        <a href="/about" style="text-decoration: none; color: inherit;">About</a>
        <span style="margin: 0 0.5rem;">·</span>
        <a href="/rss.xml" style="text-decoration: none; color: inherit;">RSS</a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 3: Verify Build**

Run: `cd blog && npm run build`
Expected: Passes without errors.

- [ ] **Step 4: Commit**

```bash
cd blog
git add src/styles/global.css src/pages/index.astro
git commit -m "feat: redesign homepage to use two-column category showcase"
cd ..
```
