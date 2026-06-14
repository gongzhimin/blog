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
        const data = JSON.parse(body);
        
        // 1. Verify Token
        if (data.token !== SECRET_TOKEN) {
          console.error('Invalid token attempt');
          res.statusCode = 403;
          return res.end('Forbidden');
        }

        const title = data.title || 'Untitled';
        const content = data.content || '';
        const collection = data.collection || 'life';
        const date = new Date().toISOString().split('T')[0];
        
        // 2. Generate slug and filename
        const slug = title.toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .trim();
        const filename = `${date}-${slug}.md`;
        const filepath = path.join(BLOG_ROOT, 'src/content', collection, filename);

        // 3. Create Markdown content
        const fileContent = `---
title: "${title}"
description: "Posted from mobile"
date: ${date}
---

${content}
`;

        // 4. Save file
        fs.writeFileSync(filepath, fileContent);
        console.log(`Saved new post to ${filepath}`);

        // 5. Trigger build
        exec('npm run build', { cwd: BLOG_ROOT }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Build error: ${error}`);
            res.statusCode = 500;
            return res.end('Build failed');
          }
          console.log('Build successful');
          res.statusCode = 200;
          res.end('Published successfully');
        });

      } catch (err) {
        console.error('Invalid JSON received');
        res.statusCode = 400;
        res.end('Invalid JSON');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Webhook receiver listening on http://127.0.0.1:${PORT}`);
});
