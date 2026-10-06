# Visual & Typography Tweaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CSS-based typography tweaks (Drop Caps, Ornamental Dividers, Refined Blockquotes) to enhance the editorial/print aesthetic of the blog.

**Architecture:** We will apply all changes to the central `blog/src/styles/global.css` file. The Drop Caps will be scoped specifically to the `<article>` tag within the `LifeLayout.astro` by targeting `.life-article > p:first-of-type::first-letter`. Dividers and Blockquotes will be applied globally to Markdown-rendered content via standard HTML tags (`hr` and `blockquote`).

**Tech Stack:** Astro, CSS

---

### Task 1: Scope Life Articles for Drop Caps

**Files:**
- Modify: `blog/src/layouts/LifeLayout.astro:37-39`

- [ ] **Step 1: Add CSS class to Life article wrapper**

Modify the `<article>` tag to include a specific class so we can target it for the drop cap styling without affecting normal blog posts.

```astro
      <!-- Article content -->
      <article class="life-article" style="font-size: 1.1rem; line-height: 1.8;">
        <slot />
      </article>
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/layouts/LifeLayout.astro
git commit -m "style: add life-article class for scoped typography"
cd ..
```

---

### Task 2: Implement Drop Caps for Life Articles

**Files:**
- Modify: `blog/src/styles/global.css` (append at the end)

- [ ] **Step 1: Add Drop Cap CSS**

Append the following CSS to the end of `global.css` to target the first letter of the first paragraph in life articles.

```css
/* --- Typography Tweaks --- */

/* 1. Drop Caps for Life Articles */
.life-article > p:first-of-type::first-letter {
  float: left;
  font-size: 3.5em;
  line-height: 0.8;
  padding-top: 0.1em;
  padding-right: 0.1em;
  margin-left: -0.05em;
  color: rgb(var(--color-text-secondary));
  font-family: var(--font-serif);
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: implement drop caps for life articles"
cd ..
```

---

### Task 3: Implement Ornamental Dividers

**Files:**
- Modify: `blog/src/styles/global.css` (append at the end)

- [ ] **Step 1: Add Divider CSS**

Append the following CSS to `global.css` to style the `<hr>` elements as ornamental asterisks.

```css
/* 2. Ornamental Dividers */
article hr {
  border: none;
  background: transparent;
  margin: 3rem 0;
  text-align: center;
  height: auto;
}

article hr::after {
  content: "* * *";
  display: inline-block;
  color: rgb(var(--color-text-muted));
  font-size: 1.2em;
  letter-spacing: 0.5em;
  margin-left: 0.5em; /* Compensate for letter-spacing on the last char */
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: replace horizontal rules with ornamental dividers"
cd ..
```

---

### Task 4: Implement Refined Blockquotes

**Files:**
- Modify: `blog/src/styles/global.css` (append at the end)

- [ ] **Step 1: Add Blockquote CSS**

Append the following CSS to `global.css` to style the `<blockquote>` elements with a classic double-quote decoration.

```css
/* 3. Refined Blockquotes */
article blockquote {
  border-left: none;
  font-style: italic;
  color: rgb(var(--color-text-secondary));
  margin: 2rem 2.5rem;
  padding: 0;
  position: relative;
}

article blockquote::before {
  content: "“";
  position: absolute;
  top: -0.2em;
  left: -0.6em;
  font-size: 4em;
  line-height: 1;
  color: rgb(var(--color-text-muted));
  opacity: 0.3;
  font-family: var(--font-serif);
}

article blockquote p {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: implement refined blockquote styling"
cd ..
```
