#!/usr/bin/env node
/**
 * Builds dist/reader.html — one self-contained file holding the whole handbook.
 *
 * Why it exists: browsers refuse to read files from disk when a page is opened
 * with file://, so a normal static site needs a server. This build folds the
 * styles, the scripts and every note into a single HTML file. Email it, AirDrop
 * it, drop it in cloud storage or open it from a phone's Files app — it works
 * offline, on any device, with nothing installed.
 *
 * Usage:  node tools/build.mjs [--out dist/reader.html]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const root = process.cwd();
const outFile = path.resolve(root, flag('--out', 'dist/reader.html'));

const read = (relative) => {
  const file = path.resolve(root, relative);
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${relative}`);
  return fs.readFileSync(file, 'utf8');
};

const bytes = (n) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

/* ----------------------------------------------------------------- content */

const manifest = JSON.parse(read('notes.json'));

/* Notes written before the handbook was bilingual used a flat `files` list. */
const declared = manifest.languages || {
  en: { label: 'English', dir: 'ltr', files: manifest.files || [] },
};

/*
 * Every language goes into the file. One reader, both languages, and the
 * switcher keeps working on a plane with no server — which is the whole point
 * of the portable build.
 */
const languages = {};
let files = 0;
for (const [code, entry] of Object.entries(declared)) {
  const inlined = (entry.files || []).map((file) => {
    const name = typeof file === 'string' ? file : file.file;
    return { name, text: read(name) };
  });
  if (!inlined.length) continue;
  languages[code] = {
    label: entry.label || code,
    dir: entry.dir || 'ltr',
    files: inlined,
  };
  files += inlined.length;
}
if (!files) throw new Error('notes.json lists no files.');

/* --------------------------------------------------------------- bundling */

/**
 * md.js and app.js are both plain modules with no third-party imports, so the
 * portable build joins them into one classic script: drop the `export` keywords
 * and the single cross-module import. Namespaces are checked below.
 */
function bundleModule(...sources) {
  return sources
    .map((source) =>
      source
        .replace(/^import\s+\{[^}]*\}\s+from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
        .replace(/^export\s+/gm, ''),
    )
    .join('\n\n/* ---------------------------------------------------------------- */\n\n');
}

const i18nSource = read('reader/i18n.js');
const mdSource = read('reader/md.js');
const appSource = read('reader/app.js');
const bundle = bundleModule(i18nSource, mdSource, appSource);

// Fail loudly instead of shipping a broken reader.
try {
  new vm.Script(bundle);
} catch (error) {
  throw new Error(`The bundled script has a syntax error: ${error.message}`);
}

const sourceFiles = { 'i18n.js': i18nSource, 'md.js': mdSource, 'app.js': appSource };
const duplicateGlobals = findDuplicateTopLevelNames(sourceFiles);
if (duplicateGlobals.length) {
  throw new Error(
    `These names are declared in more than one module and would clash when inlined: ${duplicateGlobals.join(', ')}`,
  );
}

function findDuplicateTopLevelNames(sources) {
  const collect = (source) => {
    const names = new Set();
    const pattern = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
    let match;
    while ((match = pattern.exec(source)) !== null) names.add(match[1]);
    return names;
  };
  const seen = new Set();
  const clashes = new Set();
  for (const [file, source] of Object.entries(sources)) {
    for (const name of collect(source)) {
      if (seen.has(name)) clashes.add(`${name} (${file})`);
      seen.add(name);
    }
  }
  return [...clashes];
}

/* ----------------------------------------------------------------- inlining */

const notesSource = JSON.stringify({
  title: manifest.title || 'Notes',
  subtitle: manifest.subtitle || '',
  languages,
}).replace(/</g, '\\u003c');

const iconSvg = read('reader/icon.svg');
const favicon = `data:image/svg+xml;base64,${Buffer.from(iconSvg, 'utf8').toString('base64')}`;

let icon192 = '';
const icon192Path = path.resolve(root, 'reader/icons/icon-192.png');
if (fs.existsSync(icon192Path)) {
  icon192 = `data:image/png;base64,${fs.readFileSync(icon192Path).toString('base64')}`;
}

let html = read('index.html');
const css = read('reader/app.css');

const replaceOnce = (pattern, replacement, label) => {
  if (!pattern.test(html)) throw new Error(`index.html no longer contains the ${label} marker.`);
  html = html.replace(pattern, () => replacement);
};

replaceOnce(
  /<link rel="stylesheet" href="reader\/app\.css">/,
  `<style>\n${css}\n</style>`,
  'stylesheet',
);

replaceOnce(
  /<link rel="manifest" href="reader\/manifest\.webmanifest">\s*/,
  '',
  'manifest',
);

replaceOnce(
  /<link rel="icon" href="reader\/icon\.svg" type="image\/svg\+xml">/,
  `<link rel="icon" href="${favicon}">`,
  'icon',
);

replaceOnce(
  /<link rel="apple-touch-icon" href="reader\/icons\/icon-192\.png">/,
  icon192 ? `<link rel="apple-touch-icon" href="${icon192}">` : '',
  'apple-touch-icon',
);

replaceOnce(
  /<script type="module" src="reader\/app\.js"><\/script>/,
  `<script>window.__NOTES_SOURCE__ = ${notesSource};</script>\n  <script type="module">\n${bundle}\n  </script>`,
  'app script',
);

html = html.replace(
  /<title>[^<]*<\/title>/,
  `<title>${String(manifest.title || 'Notes').replace(/[<&]/g, '')}</title>`,
);

html = html.replace(
  '<head>',
  `<!--\n  C# for Unity — portable single-file reader\n  Generated by tools/build.mjs on ${new Date().toISOString()}\n  ${files} note files in ${Object.keys(languages).length} language(s), ${bytes(Buffer.byteLength(html))} of HTML\n-->\n<head>`,
);

/* ---------------------------------------------------------------- outputs */

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, html);

const relative = path.relative(root, outFile).split(path.sep).join('/');
console.log('');
console.log(`  ✓ ${relative}`);
console.log(
  `    ${files} note files inlined (${Object.entries(languages)
    .map(([code, l]) => `${code} ${l.files.length}`)
    .join(', ')})`,
);
console.log(`    ${bytes(Buffer.byteLength(html))} total, opens offline on any device`);
console.log('');
console.log('    Hosting instead? The project folder is already a static site:');
console.log('    publish the root, or just run: npm run dev');
console.log('');
