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
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const rawData = JSON.parse(body);
        const data = {};
        for (let key in rawData) { data[key.trim()] = rawData[key]; }
        
        if (data.token !== SECRET_TOKEN) {
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        let htmlContent = '';
        let title = 'Untitled Post';

        if (data.raw) {
          const lines = data.raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            title = lines[0];
            const rest = lines.slice(1).join('\n\n');
            htmlContent = '<h1>' + title + '</h1>' + (rest ? '<p>' + rest.replace(/\n/g, '<br>') + '</p>' : '');
          }
        } else if (data.html) {
          htmlContent = data.html;
        }

        if (!htmlContent) {
          res.statusCode = 400;
          return res.end('Missing content');
        }

        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        // Process Images
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

        const h1 = document.querySelector('h1');
        if (h1) {
          title = h1.textContent.trim() || title;
          h1.remove();
        }

        const markdown = turndownService.turndown(document.body.innerHTML);
        const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').trim() || 'post';
        const date = new Date().toISOString().split('T')[0];
        const filename = `${date}-${slug}-${Math.floor(Math.random() * 1000)}.md`;
        const filepath = path.join(BLOG_ROOT, 'src/content/life', filename);

        fs.writeFileSync(filepath, `---
title: "${title}"
description: "Posted from mobile"
date: ${date}
---

${markdown}
`);

        // SYNC AND PUSH with robust title injection
        const commitMsg = `docs: mobile post [${title}]`;
        const gitCmd = `git add . && git commit -m "${commitMsg.replace(/"/g, '\\"')}" && git push origin main`;
        
        exec(gitCmd, { cwd: BLOG_ROOT }, (err, stdout, stderr) => {
          if (err) {
            console.error('GIT ERROR:', stderr);
            res.statusCode = 500;
            return res.end('Git sync failed');
          }
          res.statusCode = 200;
          res.end('Success');
        });

      } catch (err) {
        console.error('JSON ERROR:', err);
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
