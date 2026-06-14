const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const PORT = 9000;
const SECRET_TOKEN = process.env.BLOG_WEBHOOK_TOKEN || 'zhimin_secret_post_2026';
const BLOG_ROOT = '/var/www/blog';
const IMAGE_DIR = '/public/images/mobile';

// Initialize Turndown with GFM support (for tables)
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.use(gfm);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const rawData = JSON.parse(body);
        const data = {};
        for (let key in rawData) {
          data[key.trim()] = rawData[key];
        }
        
        if (data.token !== SECRET_TOKEN) {
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        let html = data.html || '';
        let collection = data.collection || 'life';
        const date = new Date().toISOString().split('T')[0];

        if (!html) {
          res.statusCode = 400;
          return res.end('Missing html content');
        }

        const dom = new JSDOM(html);
        const document = dom.window.document;

        // 1. Process Images (Base64 extraction)
        const images = document.querySelectorAll('img');
        
        for (let img of images) {
          const src = img.getAttribute('src');
          if (src && src.startsWith('data:image/')) {
            const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const ext = match[1];
              const base64Data = match[2];
              const fileName = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
              const fullPath = path.join(BLOG_ROOT, IMAGE_DIR, fileName);
              
              if (!fs.existsSync(path.join(BLOG_ROOT, IMAGE_DIR))) {
                fs.mkdirSync(path.join(BLOG_ROOT, IMAGE_DIR), { recursive: true });
              }
              
              fs.writeFileSync(fullPath, base64Data, 'base64');
              img.setAttribute('src', `/images/mobile/${fileName}`);
            }
          }
        }

        // 2. Extract Title
        const firstH1 = document.querySelector('h1');
        let title = firstH1 ? firstH1.textContent.trim() : 'Untitled Mobile Post';
        if (firstH1) firstH1.remove();

        // 3. Convert HTML to Markdown
        const markdown = turndownService.turndown(document.body.innerHTML);

        // 4. Save Markdown File
        const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').trim() || 'post';
        const filename = `${date}-${slug}-${Math.floor(Math.random() * 1000)}.md`;
        const filepath = path.join(BLOG_ROOT, 'src/content', collection, filename);

        const fileContent = `---
title: "${title}"
description: "Posted from mobile with rich media"
date: ${date}
---

${markdown}
`;

        fs.writeFileSync(filepath, fileContent);

        // 5. Sync to GitHub ONLY (Build will be triggered by GitHub)
        // This offloads the heavy npm run build from the AWS server
        const gitCommand = `git add . && git commit -m "docs: new rich-media post from mobile [\${title}]" && git push origin main`;
        
        exec(gitCommand, { cwd: BLOG_ROOT }, (gitErr, stdout, stderr) => {
          if (gitErr) {
            console.error('Git Push Error:', stderr);
            res.statusCode = 500;
            return res.end('Git sync failed');
          }
          res.statusCode = 200;
          res.end('Post saved and synced to GitHub. Cloud build triggered.');
        });

      } catch (err) {
        console.error('Webhook Error:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1');
