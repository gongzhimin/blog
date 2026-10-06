# Personal Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a personal blog using Astro on a personal cloud server with Git Hook auto-deployment.

**Architecture:** Astro generates static site from Markdown content. Static files served by Nginx on cloud server. Git push triggers Hook that pulls, builds, and deploys automatically.

**Tech Stack:** Astro, Markdown, Nginx, Git, Let's Encrypt (Certbot), Vultr cloud server

---

## Prerequisite: Set Up Cloud Server

### Task 1: Cloud Server Initial Setup

**Files:**
- None (server-side)

- [ ] **Step 1: Create Vultr account and deploy server**

1. Go to https://www.vultr.com
2. Sign up / Log in
3. Deploy new server:
   - Choose: Cloud Compute - Regular Performance
   - Location: Nearest to you (e.g., Singapore, Tokyo, Hong Kong)
   - OS: Ubuntu 22.04 LTS
   - Plan: $2.50/month (512MB RAM, 10GB SSD) — sufficient for static blog
   - Enable IPv6
4. Note the server IP address and root password

- [ ] **Step 2: Connect to server and update system**

```bash
ssh root@<YOUR_SERVER_IP>
# Enter password when prompted

# Update system packages
apt update && apt upgrade -y
```

- [ ] **Step 3: Install required software**

```bash
apt install -y nginx git certbot python3-certbot-nginx
```

- [ ] **Step 4: Configure Nginx for static site**

```bash
# Create nginx config
cat > /etc/nginx/sites-available/blog << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name <YOUR_DOMAIN_OR_IP>;

    root /var/www/blog;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

- [ ] **Step 5: Create directory and git user**

```bash
mkdir -p /var/www/blog
chown -R www-data:www-data /var/www/blog

# Create git user for deployment
useradd -m -s /bin/bash git
mkdir -p /home/git/blog.git
cd /home/git/blog.git
git init --bare
chown -R git:git /home/git
```

- [ ] **Step 6: Commit server setup**

```bash
# Log what you've done
echo "Server setup complete. IP: <YOUR_IP>" > ~/server-setup-notes.txt
```

---

## Local Project Setup

### Task 2: Create Astro Project

**Files:**
- Create: `blog/` (entire Astro project)

- [ ] **Step 1: Install Astro via npm**

```bash
# Create new Astro project
npm create astro@latest blog
# When prompted:
# - Where to create the project: ./blog
# - How to start the new project: Include sample files
# - Install dependencies: Yes
# - Initialize git: Yes

cd blog
```

- [ ] **Step 2: Verify Astro runs locally**

```bash
npm run dev
# Open http://localhost:4321 to verify
# Press Ctrl+C to stop
```

- [ ] **Step 3: Install blog theme (astro-paper)**

```bash
npx astro add tailwind
npm install astro-paper
```

- [ ] **Step 4: Configure astro-paper theme**

Modify `src/config.ts`:
```typescript
import { astroPaper } from "astro-paper";

export default {
  ...astroPaper,
  title: "My Blog",
  description: "Personal blog with life and tech articles",
  logo: "./src/assets/logo.png",
  postsPerPage: 10,
};
```

- [ ] **Step 5: Create content structure**

```bash
mkdir -p src/content/blog    # Technical articles
mkdir -p src/content/life    # Life notes
```

- [ ] **Step 6: Create sample content**

Create `src/content/blog/first-post.md`:
```markdown
---
title: "First Technical Post"
description: "My first technical article"
date: 2026-04-12
tags: ["tech", "introduction"]
---

# First Technical Post

This is my first technical article on this blog.

## Section 1

Content here...
```

Create `src/content/life/first-note.md`:
```markdown
---
title: "First Life Note"
description: "My first life note"
date: 2026-04-12
---

# First Life Note

This is my first life note on this blog.
```

- [ ] **Step 7: Verify build**

```bash
npm run build
# Check dist/ folder contains generated static files
```

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: initial Astro blog setup with astro-paper theme"
```

---

## Theme Customization

### Task 3: Customize Theme Appearance

**Files:**
- Modify: `src/styles/global.css` (or theme CSS variables)
- Modify: `public/favicon.svg`
- Create: `src/assets/logo.png`

- [ ] **Step 1: Review current theme**

```bash
npm run dev
# Visit http://localhost:4321 and note current colors/fonts
# Press Ctrl+C to stop
```

- [ ] **Step 2: Customize color scheme**

Find theme's CSS variables (usually in `node_modules/astro-paper/` or `src/styles/`). Common pattern:
```css
:root {
  --primary-color: #3b82f6;      /* Change to your preferred */
  --text-color: #1f2937;         /* Body text */
  --bg-color: #ffffff;           /* Background */
  --accent-color: #8b5cf6;       /* Links, highlights */
}
```

- [ ] **Step 3: Add logo**

Place logo file at `src/assets/logo.png` (recommended size: 64x64px)

- [ ] **Step 4: Customize favicon**

Replace `public/favicon.svg` with your own

- [ ] **Step 5: Verify customizations**

```bash
npm run build && npm run preview
# Visit http://localhost:4321 to verify
# Press Ctrl+C to stop
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: customize theme colors and logo"
```

---

## Git Deployment Setup

### Task 4: Configure Git Hook for Auto-Deployment

**Files:**
- Modify: `/home/git/blog.git/hooks/post-receive` (on server)

- [ ] **Step 1: Create post-receive hook on server**

On your local machine, create a file `post-receive` locally for reference:
```bash
cat > post-receive << 'EOF'
#!/bin/bash
GIT_DIR=/home/git/blog.git
WORK_TREE=/var/www/blog

git --work-tree=$WORK_TREE --git-dir=$GIT_DIR checkout -f

cd $WORK_TREE
npm install
npm run build
chown -R www-data:www-data $WORK_TREE
EOF
```

- [ ] **Step 2: Upload hook to server**

```bash
# Copy hook file to server
scp post-receive root@<YOUR_SERVER_IP>:/tmp/post-receive

# SSH to server
ssh root@<YOUR_SERVER_IP>

# Install the hook
mv /tmp/post-receive /home/git/blog.git/hooks/post-receive
chmod +x /home/git/blog.git/hooks/post-receive
chown git:git /home/git/blog.git/hooks/post-receive
```

- [ ] **Step 3: Configure Nginx to serve blog directory**

```bash
# Ensure permissions
chown -R www-data:www-data /var/www/blog
chmod -R 755 /var/www/blog
```

- [ ] **Step 4: Test the hook manually**

```bash
# From local machine
cd blog
git remote add production git@<YOUR_SERVER_IP>:/home/git/blog.git
git push production main
```

- [ ] **Step 5: Verify deployment**

Visit `http://<YOUR_SERVER_IP>` to see your blog live

---

## Domain & SSL Setup (Optional)

### Task 5: Configure Domain Name

**Files:**
- Modify: `/etc/nginx/sites-available/blog`

Skip this task if using IP address only.

- [ ] **Step 1: Register domain**

Register at Namecheap (~¥70-100/year). Point DNS to your server IP.

- [ ] **Step 2: Update Nginx config**

```bash
# On server
cat > /etc/nginx/sites-available/blog << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    root /var/www/blog;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

nginx -t && systemctl reload nginx
```

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "docs: add domain configuration"
```

---

### Task 6: Enable SSL with Let's Encrypt

**Files:**
- Modify: `/etc/nginx/sites-available/blog`

- [ ] **Step 1: Obtain SSL certificate**

```bash
# On server
certbot --nginx -d yourdomain.com
# Enter email, agree to terms, choose redirect (recommended)
```

- [ ] **Step 2: Verify SSL works**

Visit `https://yourdomain.com` and check for green lock icon

- [ ] **Step 3: Auto-renewal test**

```bash
certbot renew --dry-run
```

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "docs: add SSL configuration"
```

---

## Verification & Launch

### Task 7: Final Verification

- [ ] **Step 1: Test full workflow**

```bash
# 1. Write new post locally
cat > src/content/blog/test-post.md << 'EOF'
---
title: "Test Post"
description: "Testing the deployment workflow"
date: 2026-04-12
---

# Test Post

This is a test to verify the full deployment workflow works.
EOF

# 2. Build locally to verify no errors
npm run build

# 3. Push to deploy
git add .
git commit -m "feat: add test post"
git push production main
```

- [ ] **Step 2: Verify on live site**

Visit your blog URL and confirm the new post appears.

---

## Summary

| Task | Description | Time |
|------|-------------|------|
| 1 | Cloud server setup | ~15 min |
| 2 | Astro project setup | ~20 min |
| 3 | Theme customization | ~15 min |
| 4 | Git deployment setup | ~15 min |
| 5 | Domain configuration (optional) | ~10 min |
| 6 | SSL setup (optional) | ~10 min |
| 7 | Final verification | ~10 min |

**Total: ~1.5-2 hours** (excluding domain/SSL if skipped)
