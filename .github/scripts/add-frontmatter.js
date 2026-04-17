const fs = require('fs');
const path = require('path');

const BLOG_DIR = 'src/content/blog';

function hasFrontmatter(content) {
  return content.startsWith('---');
}

function extractTitle(content) {
  // Try to find first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  return '';
}

function extractDescription(content) {
  // Get first non-heading, non-empty line
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.length > 10) {
      return trimmed.substring(0, 100);
    }
  }
  return '';
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (hasFrontmatter(content)) {
    console.log(`Skipping ${filePath} - already has frontmatter`);
    return false;
  }

  const title = extractTitle(content);
  const description = extractDescription(content);
  const date = getCurrentDate();

  const frontmatter = `---
title: "${title}"
description: "${description}"
pubDatetime: ${date}
tags: []
---

`;

  const newContent = frontmatter + content;
  fs.writeFileSync(filePath, newContent);
  console.log(`Added frontmatter to ${filePath}`);
  return true;
}

function processDirectory(dir) {
  let changed = false;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (processDirectory(filePath)) {
        changed = true;
      }
    } else if (file.endsWith('.md')) {
      if (addFrontmatter(filePath)) {
        changed = true;
      }
    }
  }

  return changed;
}

// Get changed files from git
const { execSync } = require('child_process');

try {
  const output = execSync('git diff --name-only --cached', { encoding: 'utf-8' });
  const changedFiles = output.split('\n').filter(f => f.trim());

  let anyChanged = false;

  for (const file of changedFiles) {
    if (file.startsWith(BLOG_DIR) && file.endsWith('.md')) {
      if (addFrontmatter(file)) {
        anyChanged = true;
      }
    }
  }

  if (anyChanged) {
    execSync('git add -A', { encoding: 'utf-8' });
    console.log('Staged files with frontmatter');
  }
} catch (e) {
  // Fallback: process all files
  console.log('Processing all blog files...');
  processDirectory(BLOG_DIR);
}
