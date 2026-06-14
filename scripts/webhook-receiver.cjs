const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const SECRET_TOKEN = process.env.BLOG_WEBHOOK_TOKEN || 'zhimin_secret_post_2026';
const BLOG_ROOT = '/var/www/blog';

const server = http.createServer((req, res) => {
  console.log('--- NEW REQUEST RECEIVED ---');
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log('RAW BODY RECEIVED FROM IPHONE:', body);
      try {
        const rawData = JSON.parse(body);
        const data = {};
        for (let key in rawData) {
          data[key.trim()] = rawData[key];
        }
        
        console.log('PARSED DATA TOKEN:', data.token);
        console.log('PARSED DATA RAW FIELD LENGTH:', data.raw ? data.raw.length : 0);

        if (data.token !== SECRET_TOKEN) {
          console.error('TOKEN MISMATCH. Expected:', SECRET_TOKEN, 'Received:', data.token);
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

        fs.writeFileSync(filepath, fileContent);
        console.log('SAVED FILE TO:', filepath);

        exec('npm run build', { cwd: BLOG_ROOT }, (error, stdout, stderr) => {
          if (error) {
            console.error('BUILD ERROR:', error);
            res.statusCode = 500;
            return res.end('Build failed');
          }
          console.log('BUILD SUCCESSFUL');
          res.statusCode = 200;
          res.end('Published successfully');
        });

      } catch (err) {
        console.error('JSON PARSE ERROR:', err);
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
  console.log('Receiver started on port 9000');
});
