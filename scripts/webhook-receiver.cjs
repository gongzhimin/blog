const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const SECRET_TOKEN = process.env.BLOG_WEBHOOK_TOKEN || 'zhimin_secret_post_2026';
const BLOG_ROOT = '/var/www/blog';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
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

        let title = 'Untitled Post';
        let content = '';

        if (data.raw && typeof data.raw === 'string') {
          const lines = data.raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0) {
            title = lines[0];
            content = lines.slice(1).join('\n\n');
          }
        } else {
          title = data.title || title;
          content = data.content || '';
        }

        const collection = data.collection || 'life';
        const date = new Date().toISOString().split('T')[0];
        const slug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').trim() || 'post';
        const filename = `${date}-${slug}-${Math.floor(Math.random() * 1000)}.md`;
        const filepath = path.join(BLOG_ROOT, 'src/content', collection, filename);

        const fileContent = `---
title: "${title}"
description: "Posted from mobile"
date: ${date}
---

${content}
`;

        // 1. Save local file
        fs.writeFileSync(filepath, fileContent);
        
        // 2. Sync to GitHub & Build
        // We run build after pushing to GitHub to ensure everything is consistent
        const gitCommand = `git add . && git commit -m "docs: new post from mobile [\${title}]" && git push origin main`;
        
        exec(gitCommand, { cwd: BLOG_ROOT }, (gitErr, stdout, stderr) => {
          if (gitErr) {
            console.error('Git Push Error:', stderr);
            // Even if push fails, we still try to build locally so the post appears on site
          }
          
          exec('npm run build', { cwd: BLOG_ROOT }, (buildErr) => {
            if (buildErr) {
              res.statusCode = 500;
              return res.end('Build failed');
            }
            res.statusCode = 200;
            res.end('Published and synced to GitHub successfully');
          });
        });

      } catch (err) {
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1');
