# Interactions & Subtle Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement lightweight, CSS-based animations (page fade-in, elegant link hovers, staggered list reveal) to enhance the site's polish while maintaining its quiet editorial feel.

**Architecture:** All animations will be defined as reusable `@keyframes` in `global.css`. Staggered delays will be applied via CSS nth-child selectors to ensure no JS dependency.

**Tech Stack:** Astro, CSS

---

### Task 1: Define Keyframes and Page Fade-in

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Add Keyframes and Page Animation**

Append the base animations to `global.css`. We will target the `main` tag globally to ensure all pages fade in consistently.

```css
/* --- Animations --- */

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

main {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: add global page fade-in animation"
cd ..
```

---

### Task 2: Implement Elegant Link Hovers

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Refactor link styles**

Update the `a` tag styles in `global.css` to use a background-gradient based "expanding underline" instead of the standard text-decoration.

```css
/* Refined Links */
a {
  color: rgb(var(--color-text-primary));
  text-decoration: none;
  background-image: linear-gradient(rgb(var(--color-border)), rgb(var(--color-border)));
  background-size: 0% 1px;
  background-repeat: no-repeat;
  background-position: left bottom;
  transition: background-size 0.3s ease-out;
  padding-bottom: 2px;
}

a:hover {
  background-size: 100% 1px;
}

/* Specific overrides for muted links (back links, footer) */
a[style*="color: rgb(var(--color-text-muted))"],
.archive-link,
footer a {
  background-image: linear-gradient(rgb(var(--color-text-muted)), rgb(var(--color-text-muted)));
}
```

- [ ] **Step 2: Commit**

```bash
cd blog
git add src/styles/global.css
git commit -m "style: implement elegant expanding underline for link hovers"
cd ..
```

---

### Task 3: Implement Staggered List Reveal

**Files:**
- Modify: `blog/src/styles/global.css`

- [ ] **Step 1: Add staggered delay classes**

Add a generic animation class and a loop of nth-child delays to `global.css`.

```css
/* Staggered Reveal */
.stagger-item {
  opacity: 0; /* Start hidden before animation kicks in */
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.stagger-item:nth-child(1) { animation-delay: 0.05s; }
.stagger-item:nth-child(2) { animation-delay: 0.10s; }
.stagger-item:nth-child(3) { animation-delay: 0.15s; }
.stagger-item:nth-child(4) { animation-delay: 0.20s; }
.stagger-item:nth-child(5) { animation-delay: 0.25s; }
.stagger-item:nth-child(6) { animation-delay: 0.30s; }
.stagger-item:nth-child(7) { animation-delay: 0.35s; }
.stagger-item:nth-child(8) { animation-delay: 0.40s; }
.stagger-item:nth-child(9) { animation-delay: 0.45s; }
.stagger-item:nth-child(10) { animation-delay: 0.50s; }
```

- [ ] **Step 2: Apply class to homepage and archives**

We need to add the `stagger-item` class to the repeating elements.

Modify `blog/src/pages/index.astro`:
```astro
        <!-- Left Column: Essays -->
        <section>
          <h2 class="category-title">Essays</h2>
          <div class="post-list">
            {topLife.map((post) => (
              <article class="post-item stagger-item">
                <a href={`/life/${post.id}`} class="post-title">
                  {post.data.title}
                </a>
              </article>
            ))}
          </div>
          <a href="/life" class="archive-link stagger-item">View all essays →</a>
        </section>
```
(Repeat for Technical column)

Modify `blog/src/pages/blog/index.astro` and `blog/src/pages/life/index.astro`:
```astro
      <div style="border-top: 1px solid rgb(var(--color-border));">
        {sortedPosts.map((post) => {
          const date = post.data.pubDatetime || post.data.date;
          return (
            <article class="stagger-item" style="padding: 1rem 0; border-bottom: 1px dotted rgb(var(--color-border)); display: flex; justify-content: space-between; align-items: baseline;">
              <!-- ... -->
            </article>
          );
        })}
      </div>
```

- [ ] **Step 3: Commit**

```bash
cd blog
git add src/styles/global.css src/pages/index.astro src/pages/blog/index.astro src/pages/life/index.astro
git commit -m "style: implement staggered reveal for article lists"
cd ..
```
