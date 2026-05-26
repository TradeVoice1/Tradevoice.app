#!/usr/bin/env node
// One-shot transformer that bumps every font-size literal by +2px across
// the app and marketing site. Targeted at JSX inline styles + CSS rules +
// HTML inline styles. Leaves expressions (fontSize: someVar), template
// literals, em/%/rem values, and zero alone.
//
// Patterns handled:
//   1. JSX:  fontSize: 14                  → fontSize: 16
//   2. JSX:  fontSize: '14px'              → fontSize: '16px'
//   3. JSX:  fontSize: "14px"              → fontSize: "16px"
//   4. CSS:  font-size: 14px               → font-size: 16px
//   5. CSS:  font-size:14px                → font-size:16px
//
// Skipped:
//   - fontSize: ${...}                     (template literals)
//   - fontSize: someVar                    (identifiers)
//   - fontSize: '1.25em' / '90%' / '1rem'  (relative units)
//   - any font-size value that is 0
//
// Run with:  node scripts/bump-font-size.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Files to walk. Anything under src/ + the marketing landing page + the
// shared CSS files. Skip dist/, node_modules/, etc.
const TARGETS = [
  'src',
  'marketing/index.html',
];

const FILE_EXTS = new Set(['.jsx', '.js', '.css', '.html']);

let totalReplacements = 0;
let filesTouched = 0;

function walk(p) {
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
      walk(path.join(p, entry));
    }
    return;
  }
  if (!FILE_EXTS.has(path.extname(p))) return;
  processFile(p);
}

function processFile(filePath) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before;
  let count = 0;

  // 1+2+3: JSX inline style.  fontSize: <num> | fontSize: '<num>px' | fontSize: "<num>px"
  //
  // Capture group 1 = optional quote, group 2 = number, group 3 = optional 'px' + closing quote.
  // Bail on anything that isn't a bare integer (so we don't touch variables,
  // template literals, or relative units).
  after = after.replace(
    /\bfontSize:\s*(['"]?)(\d+)(px)?\1/g,
    (match, quote, num, px) => {
      const n = parseInt(num, 10);
      if (n === 0) return match;
      // Only bump when it's clearly a px-magnitude integer. fontSize: 14 in
      // React inline styles is treated as 14px by React, so still bump.
      // If it had a quote, the original must have had 'px' inside the
      // quotes (otherwise it'd be a relative/em string we left alone).
      if (quote && !px) return match; // e.g. fontSize: '14' without px — skip
      count += 1;
      return `fontSize: ${quote}${n + 2}${px || ''}${quote}`;
    }
  );

  // 4+5: CSS font-size: <num>px (with or without space after colon).
  after = after.replace(
    /\bfont-size:\s*(\d+)px/g,
    (match, num) => {
      const n = parseInt(num, 10);
      if (n === 0) return match;
      count += 1;
      return `font-size: ${n + 2}px`;
    }
  );

  if (count > 0) {
    fs.writeFileSync(filePath, after, 'utf8');
    filesTouched += 1;
    totalReplacements += count;
    console.log(`  ${count.toString().padStart(4)}  ${path.relative(ROOT, filePath)}`);
  }
}

console.log('Bumping every font-size literal by +2px…\n');
for (const t of TARGETS) {
  const full = path.join(ROOT, t);
  if (fs.existsSync(full)) walk(full);
}
console.log(`\n  total: ${totalReplacements} replacements in ${filesTouched} files`);
