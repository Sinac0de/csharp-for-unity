#!/usr/bin/env node
/**
 * Regenerates notes.json by scanning the notes folder.
 *
 * The book is ordered by file name, using a natural sort so that
 * `10_part1_a.md` comes before `11_part1_b.md` and `2_x.md` comes before `10_y.md`.
 * Keep the numeric prefix convention and this script never has to change.
 *
 * Existing `title`, `subtitle` and any extra top-level keys in notes.json are kept,
 * so you can edit them by hand and still regenerate the file list safely.
 *
 * Usage:  node tools/manifest.mjs [--dir Assets] [--out notes.json] [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const root = process.cwd();
const dir = flag('--dir', 'Assets');
const out = flag('--out', 'notes.json');
const check = args.includes('--check');

const absDir = path.resolve(root, dir);
if (!fs.existsSync(absDir)) {
  console.error(`✗ Notes folder not found: ${dir}`);
  process.exit(1);
}

/** Natural comparator so `2.md` sorts before `10.md`. */
function naturalCompare(a, b) {
  const chunk = (s) => s.match(/\d+|\D+/g) || [];
  const ca = chunk(a);
  const cb = chunk(b);
  for (let i = 0; i < Math.max(ca.length, cb.length); i++) {
    const x = ca[i];
    const y = cb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) {
      const d = Number(x) - Number(y);
      if (d !== 0) return d;
    } else if (x !== y) {
      return x.toLowerCase() < y.toLowerCase() ? -1 : 1;
    }
  }
  return 0;
}

/** Collect every .md file below `dir`, relative to the project root. */
function walk(absDirPath) {
  const found = [];
  for (const entry of fs.readdirSync(absDirPath, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(absDirPath, entry.name);
    if (entry.isDirectory()) found.push(...walk(abs));
    else if (entry.isFile() && /\.mdx?$/i.test(entry.name)) {
      found.push(path.relative(root, abs).split(path.sep).join('/'));
    }
  }
  return found;
}

const files = walk(absDir).sort(naturalCompare);

let existing = {};
if (fs.existsSync(path.resolve(root, out))) {
  try {
    existing = JSON.parse(fs.readFileSync(path.resolve(root, out), 'utf8'));
  } catch {
    console.warn('⚠ notes.json was not valid JSON; regenerating from scratch.');
  }
}

const next = {
  title: existing.title || 'My Notes',
  subtitle: existing.subtitle || '',
  ...existing,
  files,
};
// `files` always comes last and always wins.
delete next.order;
next.files = files;

for (const key of Object.keys(next)) {
  if (next[key] === null || next[key] === undefined || next[key] === '') {
    if (key !== 'subtitle' && key !== 'author') delete next[key];
  }
}

const json = JSON.stringify(next, null, 2) + '\n';

if (check) {
  const current = fs.existsSync(path.resolve(root, out))
    ? fs.readFileSync(path.resolve(root, out), 'utf8')
    : '';
  if (current !== json) {
    console.error(`✗ ${out} is out of date. Run: node tools/manifest.mjs`);
    process.exit(1);
  }
  console.log(`✓ ${out} is up to date (${files.length} files).`);
  process.exit(0);
}

fs.writeFileSync(path.resolve(root, out), json);
console.log(`✓ ${out} — ${files.length} note files in reading order:`);
for (const f of files) console.log(`   ${f}`);
