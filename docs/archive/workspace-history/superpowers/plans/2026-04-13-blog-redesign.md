# Blog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing Astro blog into an editorial-style personal blog with warm color scheme, Georgia serif font, minimal list homepage, and Giscus comments.

**Architecture:** Static site with Astro, using Tailwind CSS for styling and custom CSS variables for theming. Two content collections (blog for tech, life for personal notes) with separate layouts. Giscus for comments via GitHub Discussions.

**Tech Stack:** Astro, Tailwind CSS, Georgia font, Giscus, @astrojs/rss

---

## Task 1: Install Dependencies

**Files:**
- Modify: `blog/package.json`

- [ ] **Step 1: Install RSS and icon dependencies**

```bash
cd /Users/zhimin/Workshop/try-claude/blog
npm install @astrojs/rss
npm install astro-icon
```

- [ ] **Step 2: Verify package.json updated**

```bash
cat package.json | grep -A 5 '"dependencies"'
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "deps: install @astrojs/rss and astro-icon"
```

---

## Task 2: Configure Global CSS with Warm Color Scheme

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Replace Tailwind CSS with warm editorial theme**

```css
@import "tailwindcss";

/* Warm Editorial Theme - Light Mode */
:root,
html[data-theme="light"] {
  /* Background colors */
  --color-bg: 250, 246, 240;        /* #faf6f0 - warm cream */
  --color-card: 245, 239, 232;      /* #f5efe8 - light beige */

  /* Text colors */
  --color-text-primary: 61, 43, 31;   /* #3d2b1f - dark brown */
  --color-text-secondary: 92, 64, 51; /* #5c4033 - medium brown */
  --color-text-muted: 139, 115, 85;   /* #8b7355 - light brown */

  /* Accent colors */
  --color-accent: 139, 115, 85;       /* #8b7355 - muted brown */
  --color-code-bg: 232, 221, 208;      /* #e8ddd0 - warm code bg */

  /* Border colors */
  --color-border: 212, 197, 181;       /* #d4c5b5 - warm border */

  /* Font */
  --font-serif: Georgia, 'Times New Roman', serif;
}

/* Base styles */
html {
  font-family: var(--font-serif);
  background-color: rgb(var(--color-bg));
  color: rgb(var(--color-text-primary));
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  color: rgb(var(--color-text-primary));
}

body {
  line-height: 1.7;
}

/* Links */
a {
  color: rgb(var(--color-text-primary));
  text-decoration: underline;
  text-decoration-color: rgb(var(--color-border));
  text-underline-offset: 2px;
}

a:hover {
  text-decoration-color: rgb(var(--color-text-primary));
}

/* Code blocks */
pre, code {
  background-color: rgb(var(--color-code-bg));
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

pre {
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

/* Selection */
::selection {
  background-color: rgb(var(--color-accent) / 0.3);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: apply warm editorial color scheme and Georgia font"
```

---

## Task 3: Transform Homepage to Minimal List Layout

**Files:**
- Modify: `blog/src/pages/index.astro`

- [ ] **Step 1: Read current index.astro**

```bash
cat /Users/zhimin/Workshop/try-claude/blog/src/pages/index.astro
```

- [ ] **Step 2: Replace with minimal list layout**

```astro
---
import { getCollection } from 'astro:content';

// Get all posts from both collections
const blogPosts = await getCollection('blog');
const lifePosts = await getCollection('life');

// Combine and sort by date (newest first)
const allPosts = [...blogPosts, ...lifePosts].sort(
  (a, b) => b.data.pubDatetime.valueOf() - a.data.pubDatetime.valueOf()
);
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Zhimin's Blog</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body>
    <main style="max-width: 680px; margin: 0 auto; padding: 4rem 1.5rem;">
      <!-- Header -->
      <header style="margin-bottom: 3rem; text-align: center;">
        <h1 style="font-size: 1.75rem; font-weight: normal; letter-spacing: 0.02em; margin-bottom: 0.5rem;">
          Zhimin's Blog
        </h1>
        <p style="color: rgb(var(--color-text-muted)); font-size: 0.9rem;">
          记录生活与技术的思考
        </p>
      </header>

      <!-- Post List -->
      <div style="border-top: 1px solid rgb(var(--color-border));">
        {allPosts.map((post) => (
          <article style="padding: 1rem 0; border-bottom: 1px dotted rgb(var(--color-border)); display: flex; justify-content: space-between; align-items: baseline;">
            <a href={`/${post.collection}/${post.slug}`} style="text-decoration: none; color: inherit;">
              <span style="font-size: 1rem;">{post.data.title}</span>
            </a>
            <time style="color: rgb(var(--color-text-muted)); font-size: 0.85rem; white-space: nowrap; margin-left: 1rem;">
              {post.data.pubDatetime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </time>
          </article>
        ))}
      </div>

      <!-- Footer -->
      <footer style="margin-top: 4rem; text-align: center; color: rgb(var(--color-text-muted)); font-size: 0.85rem;">
        <a href="/about" style="text-decoration: none; color: rgb(var(--color-text-muted));">About</a>
        <span style="margin: 0 0.5rem;">·</span>
        <a href="/rss.xml" style="text-decoration: none; color: rgb(var(--color-text-muted));">RSS</a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 3: Build and verify**

```bash
cd /Users/zhimin/Workshop/try-claude/blog
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: transform homepage to minimal list layout"
```

---

## Task 4: Create Life Notes Layout (Editorial Style)

**Files:**
- Create: `blog/src/layouts/LifeLayout.astro`

- [ ] **Step 1: Create LifeLayout.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';

type Props = CollectionEntry<'life'>['data'];

const { title, pubDatetime, description } = Astro.props;

const formattedDate = pubDatetime.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · Zhimin's Blog</title>
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body>
    <main style="max-width: 640px; margin: 0 auto; padding: 4rem 1.5rem;">
      <!-- Back link -->
      <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
        ← Back
      </a>

      <!-- Article header -->
      <header style="margin-top: 2rem; margin-bottom: 2rem;">
        <time style="display: block; color: rgb(var(--color-text-muted)); font-size: 0.9rem; margin-bottom: 0.5rem;">
          {formattedDate}
        </time>
        <h1 style="font-size: 2rem; font-weight: normal; line-height: 1.3; margin-bottom: 0.5rem;">
          {title}
        </h1>
      </header>

      <!-- Article content -->
      <article style="font-size: 1.1rem; line-height: 1.8;">
        <slot />
      </article>

      <!-- Footer -->
      <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgb(var(--color-border));">
        <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
          ← Back to all posts
        </a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Create life collection pages**

Create `blog/src/pages/life/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import LifeLayout from '../../layouts/LifeLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('life');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<LifeLayout {...post.data}>
  <Content />
</LifeLayout>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/LifeLayout.astro src/pages/life/
git commit -m "feat: create life notes editorial layout"
```

---

## Task 5: Create Tech Articles Layout

**Files:**
- Create: `blog/src/layouts/BlogLayout.astro`

- [ ] **Step 1: Create BlogLayout.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';

type Props = CollectionEntry<'blog'>['data'];

const { title, pubDatetime, description, tags } = Astro.props;

const formattedDate = pubDatetime.toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · Zhimin's Blog</title>
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body>
    <main style="max-width: 720px; margin: 0 auto; padding: 4rem 1.5rem;">
      <!-- Back link -->
      <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
        ← Back
      </a>

      <!-- Article header -->
      <header style="margin-top: 2rem; margin-bottom: 2rem;">
        <time style="display: block; color: rgb(var(--color-text-muted)); font-size: 0.9rem; margin-bottom: 0.5rem;">
          {formattedDate}
        </time>
        <h1 style="font-size: 1.75rem; font-weight: normal; line-height: 1.3; margin-bottom: 0.75rem;">
          {title}
        </h1>
        {tags && tags.length > 0 && (
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            {tags.map((tag) => (
              <span style="padding: 0.25rem 0.75rem; background-color: rgb(var(--color-card)); color: rgb(var(--color-text-secondary)); font-size: 0.8rem; border-radius: 2px;">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <!-- Article content -->
      <article style="font-size: 1rem; line-height: 1.8;">
        <slot />
      </article>

      <!-- Footer -->
      <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgb(var(--color-border));">
        <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
          ← Back to all posts
        </a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Update blog post page to use layout**

Create or modify `blog/src/pages/blog/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import BlogLayout from '../../layouts/BlogLayout.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<BlogLayout {...post.data}>
  <Content />
</BlogLayout>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BlogLayout.astro src/pages/blog/
git commit -m "feat: create tech articles layout with tags"
```

---

## Task 6: Create About Page

**Files:**
- Create: `blog/src/pages/about.astro`

- [ ] **Step 1: Create about page**

```astro
---
---

<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>About · Zhimin's Blog</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body>
    <main style="max-width: 640px; margin: 0 auto; padding: 4rem 1.5rem;">
      <!-- Back link -->
      <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
        ← Back
      </a>

      <!-- About content -->
      <div style="margin-top: 3rem;">
        <!-- Profile header -->
        <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
          <div style="width: 56px; height: 56px; background-color: rgb(var(--color-card)); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: rgb(var(--color-text-primary)); flex-shrink: 0;">
            Z
          </div>
          <div>
            <h1 style="font-size: 1.5rem; font-weight: normal; margin-bottom: 0.25rem;">
              Zhimin
            </h1>
            <p style="color: rgb(var(--color-text-muted)); font-size: 0.9rem; margin: 0;">
              计算机专业 · 杭州
            </p>
          </div>
        </div>

        <!-- Bio -->
        <div style="font-size: 1rem; line-height: 1.8; color: rgb(var(--color-text-secondary));">
          <p style="margin-top: 0;">
            记录生活与技术的思考，喜欢用文字留住瞬间。
          </p>
          <p style="margin-top: 1rem;">
            在这里你会找到关于编程、技术探索、生活感悟的文章。
          </p>
        </div>

        <!-- Social links -->
        <div style="display: flex; gap: 0.75rem; margin-top: 2rem;">
          <a href="https://github.com" style="width: 40px; height: 40px; background-color: rgb(var(--color-text-primary)); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none;">
            <span style="color: rgb(var(--color-bg)); font-size: 12px; font-weight: bold;">GH</span>
          </a>
          <a href="https://twitter.com" style="width: 40px; height: 40px; background-color: rgb(var(--color-text-primary)); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none;">
            <span style="color: rgb(var(--color-bg)); font-size: 12px; font-weight: bold;">X</span>
          </a>
          <a href="mailto:hi@zhimin.ink" style="width: 40px; height: 40px; background-color: rgb(var(--color-text-primary)); border-radius: 4px; display: flex; align-items: center; justify-content: center; text-decoration: none;">
            <span style="color: rgb(var(--color-bg)); font-size: 12px;">@</span>
          </a>
        </div>
      </div>

      <!-- Footer -->
      <footer style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgb(var(--color-border));">
        <a href="/" style="color: rgb(var(--color-text-muted)); text-decoration: none; font-size: 0.9rem;">
          ← Back to all posts
        </a>
      </footer>
    </main>
  </body>
</html>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat: create about page with detailed info layout"
```

---

## Task 7: Configure RSS Subscription

**Files:**
- Create: `blog/src/pages/rss.xml.js`

- [ ] **Step 1: Create RSS feed endpoint**

```javascript
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const blogPosts = await getCollection('blog');
  const lifePosts = await getCollection('life');

  const allPosts = [...blogPosts, ...lifePosts].sort(
    (a, b) => b.data.pubDatetime.valueOf() - a.data.pubDatetime.valueOf()
  );

  return rss({
    title: "Zhimin's Blog",
    description: '记录生活与技术的思考',
    site: context.site,
    items: allPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDatetime,
      description: post.data.description,
      link: `/${post.collection}/${post.slug}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
```

- [ ] **Step 2: Update astro.config.mjs to set site URL**

Read current config, then update:

```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zhimin.ink',
  vite: {
    plugins: [tailwindcss()]
  }
});
```

- [ ] **Step 3: Verify RSS works**

```bash
npm run build
# Check dist/rss.xml exists
ls -la dist/rss.xml
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.js astro.config.mjs
git commit -m "feat: add RSS feed with all posts"
```

---

## Task 8: Integrate Giscus Comments

**Files:**
- Create: `blog/src/components/Giscus.astro`
- Modify: `blog/src/layouts/BlogLayout.astro`
- Modify: `blog/src/layouts/LifeLayout.astro`

- [ ] **Step 1: Create Giscus component**

```astro
---
---

<div class="giscus" style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgb(var(--color-border));">
  <script src="https://giscus.app/client.js"
    data-repo="YOUR_USERNAME/YOUR_REPO"
    data-repo-id="YOUR_REPO_ID"
    data-category="Announcements"
    data-category-id="DIC_kwDOA"
    data-mapping="pathname"
    data-strict="0"
    data-reactions-enabled="1"
    data-emit-metadata="0"
    data-input-position="top"
    data-theme="light"
    data-lang="zh-CN"
    data-loading="lazy"
    crossorigin="anonymous"
    async>
  </script>
</div>
```

**Note:** Replace `YOUR_USERNAME/YOUR_REPO` and `YOUR_REPO_ID` with actual values from your GitHub repository. Visit https://giscus.app to get your configuration.

- [ ] **Step 2: Add Giscus to BlogLayout**

In `BlogLayout.astro`, add `<Giscus />` before the footer closing tag.

```astro
import Giscus from '../../components/Giscus.astro';
```

And add the component in the template before `<footer>`.

- [ ] **Step 3: Add Giscus to LifeLayout**

Same changes as Step 2 for LifeLayout.astro.

- [ ] **Step 4: Commit (with placeholder config)**

```bash
git add src/components/Giscus.astro src/layouts/BlogLayout.astro src/layouts/LifeLayout.astro
git commit -m "feat: integrate Giscus comments (config placeholder)"
```

---

## Task 9: Deploy and Verify

**Files:**
- None (deployment)

- [ ] **Step 1: Push changes to production**

```bash
cd /Users/zhimin/Workshop/try-claude/blog
git add .
git commit -m "feat: complete blog redesign with editorial theme"
git push blog-production main
```

- [ ] **Step 2: Wait for deployment and verify**

```bash
sleep 10
curl https://zhimin.ink
curl https://zhimin.ink/about
curl https://zhimin.ink/rss.xml
```

- [ ] **Step 3: Check for any errors in build output**

Check the git hook output or SSH to server and run:
```bash
cd /var/www/blog
sudo npm run build
```

---

## Summary

| Task | Description | Time |
|------|-------------|------|
| 1 | Install dependencies (RSS, icons) | 5 min |
| 2 | Configure warm color scheme CSS | 10 min |
| 3 | Transform homepage to minimal list | 15 min |
| 4 | Create life notes editorial layout | 15 min |
| 5 | Create tech articles layout | 15 min |
| 6 | Create about page | 15 min |
| 7 | Configure RSS subscription | 10 min |
| 8 | Integrate Giscus comments | 10 min |
| 9 | Deploy and verify | 10 min |

**Total: ~1.5-2 hours**

---

## Giscus Setup Instructions

After deployment, visit https://giscus.app to configure:

1. Select your GitHub repository
2. Choose "Announcements" as the discussion category
3. Copy the generated `data-repo-id` and other values
4. Update `src/components/Giscus.astro` with your values
5. Enable GitHub Discussions on your repository
6. Push the updated config
