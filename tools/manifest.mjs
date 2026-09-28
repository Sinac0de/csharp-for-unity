#!/usr/bin/env node
/**
 * Regenerates notes.json by scanning the notes folder.
 *
 * One language per sub-folder:
 *
 *   Assets/*.md        English (the original notes)
 *   Assets/fa/*.md     Persian
 *   Assets/de/*.md     German — anything you add, no code change needed
 *
 * English lives at the top level so the handbook keeps working exactly as it
 * did before there was more than one language: drop a file into `Assets/` and
 * it appears in the reader.
 *
 * The book is ordered by file name, using a natural sort, so `10_part1_a.md`
 * comes before `11_part1_b.md` and `2_x.md` comes before `10_y.md`. Keep the
 * numeric prefix — and keep the same prefix in every language, so chapter 10 is
 * chapter 10 whichever language you are reading in. That is what lets the
 * language switch keep your place.
 *
 * Existing `title`, `subtitle`, `author`, language labels and any extra
 * top-level keys are kept, so you can edit them by hand and still regenerate
 * the file lists safely.
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

/** Known languages. Anything else found in a sub-folder is added automatically. */
const KNOWN = {
  en: { label: 'English', dir: 'ltr' },
  fa: { label: 'فارسی', dir: 'rtl' },
  ar: { label: 'العربية', dir: 'rtl' },
  he: { label: 'עברית', dir: 'rtl' },
  ur: { label: 'اردو', dir: 'rtl' },
  tr: { label: 'Türkçe', dir: 'ltr' },
  de: { label: 'Deutsch', dir: 'ltr' },
  fr: { label: 'Français', dir: 'ltr' },
  es: { label: 'Español', dir: 'ltr' },
  ru: { label: 'Русский', dir: 'ltr' },
  zh: { label: '中文', dir: 'ltr' },
  ja: { label: '日本語', dir: 'ltr' },
};

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

const all = walk(absDir).sort(naturalCompare);
const prefix = `${dir.split(path.sep).join('/')}/`;

/** Split the scanned files into `en` plus one bucket per language folder. */
const buckets = new Map([['en', []]]);
for (const file of all) {
  const rest = file.startsWith(prefix) ? file.slice(prefix.length) : file;
  const slash = rest.indexOf('/');
  const folder = slash === -1 ? null : rest.slice(0, slash);
  const code = folder && /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(folder) ? folder : 'en';
  if (!buckets.has(code)) buckets.set(code, []);
  buckets.get(code).push(file);
}

let existing = {};
if (fs.existsSync(path.resolve(root, out))) {
  try {
    existing = JSON.parse(fs.readFileSync(path.resolve(root, out), 'utf8'));
  } catch {
    console.warn('⚠ notes.json was not valid JSON; regenerating from scratch.');
  }
}

/* Notes written before this file knew about languages used a flat `files` list.
   Adopt that list as English so an existing notes.json migrates on first run. */
if (!existing.languages && Array.isArray(existing.files) && !buckets.get('en').length) {
  buckets.set('en', existing.files);
}

const existingLangs = existing.languages || {};
const languages = {};
for (const [code, files] of buckets) {
  if (!files.length && !existingLangs[code]) continue;
  const meta = KNOWN[code] || { label: code.toUpperCase(), dir: 'ltr' };
  languages[code] = {
    label: existingLangs[code]?.label || meta.label,
    dir: existingLangs[code]?.dir || meta.dir,
    files,
  };
}

const next = {
  title: existing.title || 'My Notes',
  subtitle: existing.subtitle || '',
  ...existing,
};
delete next.files;
delete next.order;
next.languages = languages;

for (const key of Object.keys(next)) {
  if (next[key] === null || next[key] === undefined || next[key] === '') {
    if (key !== 'subtitle' && key !== 'author') delete next[key];
  }
}

const json = JSON.stringify(next, null, 2) + '\n';

const summary = Object.entries(languages)
  .map(([code, l]) => `${code} ${l.files.length}`)
  .join(' · ');

if (check) {
  const current = fs.existsSync(path.resolve(root, out))
    ? fs.readFileSync(path.resolve(root, out), 'utf8')
    : '';
  if (current !== json) {
    console.error(`✗ ${out} is out of date. Run: node tools/manifest.mjs`);
    process.exit(1);
  }
  console.log(`✓ ${out} is up to date (${summary}).`);
  process.exit(0);
}

fs.writeFileSync(path.resolve(root, out), json);
console.log(`✓ ${out} — ${summary}`);
for (const [code, entry] of Object.entries(languages)) {
  console.log(`   ${code}  ${entry.label}`);
  for (const f of entry.files) console.log(`      ${f}`);
  if (!entry.files.length) console.log('      (no files yet)');
}
