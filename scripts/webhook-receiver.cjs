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

const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndownService.use(gfm);

const server = http.createServer((req, res) => {
  console.log('--- RAW HTTP REQUEST ---');
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log('BODY RECEIVED:', body); // CRITICAL DEBUG LINE
      try {
        if (!body) {
          console.error('ERROR: Empty body');
          res.statusCode = 400;
          return res.end('Empty Body');
        }

        const rawData = JSON.parse(body);
        // Trim keys
        const data = {};
        for (let key in rawData) { data[key.trim()] = rawData[key]; }
        
        if (data.token !== SECRET_TOKEN) {
          console.error('ERROR: Token mismatch');
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        // Support both "html" (from rich media) and "raw" (from text shortcut)
        let htmlContent = data.html || '';
        if (!htmlContent && data.raw) {
          // Wrap raw text in basic HTML so the parser handles it the same way
          htmlContent = '<h1>' + data.raw.split('\n')[0] + '</h1><p>' + data.raw.split('\n').slice(1).join('<br>') + '</p>';
        }

        if (!htmlContent) {
          console.error('ERROR: No content found in fields html or raw');
          res.statusCode = 400;
          return res.end('Missing content');
        }

        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        // 1. Process Images
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
              if (!fs.existsSync(path.join(BLOG_ROOT, IMAGE_DIR))) fs.mkdirSync(path.join(BLOG_ROOT, IMAGE_DIR), { recursive: true });
              fs.writeFileSync(fullPath, base64Data, 'base64');
              img.setAttribute('src', `/images/mobile/${fileName}`);
            }
          }
        }

        // 2. Extract Title
        const firstH1 = document.querySelector('h1');
        let title = firstH1 ? firstH1.textContent.trim() : 'Untitled Post';
        if (firstH1) firstH1.remove();

        // 3. Markdown
        const markdown = turndownService.turndown(document.body.innerHTML);

        // 4. Save
        const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').trim() || 'post';
        const filename = `${new Date().toISOString().split('T')[0]}-${slug}-${Math.floor(Math.random() * 1000)}.md`;
        const filepath = path.join(BLOG_ROOT, 'src/content/life', filename);

        fs.writeFileSync(filepath, `---
title: "${title}"
description: "Posted from mobile"
date: ${new Date().toISOString().split('T')[0]}
---

${markdown}
`);

        // 5. Push and Sync
        exec('git add . && git commit -m "docs: mobile post [${title}]" && git push origin main', { cwd: BLOG_ROOT }, (err) => {
          console.log('Build and push sequence triggered');
          res.statusCode = 200;
          res.end('Success');
        });

      } catch (err) {
        console.error('JSON PARSE ERROR:', err.message);
        res.statusCode = 400;
        res.end('Error');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1');
