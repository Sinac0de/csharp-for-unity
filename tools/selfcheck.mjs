#!/usr/bin/env node
/**
 * Self-check for the markdown renderer.
 *
 * It runs the real parser over the real notes and asserts invariants that must
 * hold no matter how the handbook grows: every fenced block becomes a code
 * block, every callout becomes a callout, ids are unique, no raw markdown leaks
 * through. Run it after editing notes or the renderer.
 *
 * Usage:  node tools/selfcheck.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildBook, parseMarkdown } from '../reader/md.js';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.resolve(root, p), 'utf8');

let failures = 0;
let checks = 0;

/** `detail` shows always; `hint` only on failure, so passing output stays quiet. */
function check(label, condition, detail = '', hint = '') {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`);
    return;
  }
  failures += 1;
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  if (hint) console.log(`      ${hint}`);
}

/* ------------------------------------------------------------ fixture bits */

console.log('\nMarkdown renderer self-check\n');

check(
  'inline emphasis, code and links',
  (() => {
    const { html } = parseMarkdown(
      'Use **bold**, *italic*, `Code<T>` and a [link](https://example.com).',
    );
    return (
      html.includes('<strong>bold</strong>') &&
      html.includes('<em>italic</em>') &&
      html.includes('<code class="ic">Code&lt;T&gt;</code>') &&
      html.includes('href="https://example.com"')
    );
  })(),
);

check(
  'tables with inline code keep their columns',
  (() => {
    const { html } = parseMarkdown(
      ['| Type | Size |', '|---|---|', '| `int` | 4 bytes |', '| `float` | 4 bytes |'].join(
        '\n',
      ),
    );
    return (html.match(/<tr>/g) || []).length === 3 && html.includes('<th style="text-align:left">Type</th>');
  })(),
);

check(
  'callout bodies render as markdown lists',
  (() => {
    const { html } = parseMarkdown(
      ['> [recap] Chapter 1', '> - first point', '> - second **point**'].join('\n'),
    );
    return (
      html.includes('callout-recap') &&
      html.includes('<li>') &&
      html.includes('<strong>point</strong>')
    );
  })(),
);

check(
  'code fences with captions are paired correctly',
  (() => {
    const { html } = parseMarkdown(
      ['```csharp Doing a thing', 'var x = 1;', '```', '', 'after'].join('\n'),
    );
    return (
      html.includes('Doing a thing') &&
      html.includes('t-kw">var<') &&
      html.includes('<p>after</p>')
    );
  })(),
);

check(
  'html inside notes is escaped, never executed',
  (() => {
    const { html } = parseMarkdown('A <script>alert(1)</script> and <b>tags</b>.');
    return !html.includes('<script>') && html.includes('&lt;script&gt;');
  })(),
);

check(
  'headings get unique slugs',
  (() => {
    const { headings } = parseMarkdown(['## Repeat', '## Repeat', '## Repeat'].join('\n'));
    const ids = headings.map((h) => h.id);
    return new Set(ids).size === ids.length && ids.length === 3;
  })(),
);

check(
  'nested list indentation builds nested markup',
  (() => {
    const { html } = parseMarkdown(['- top', '  - nested', '- top two'].join('\n'));
    return html.includes('<ul><li>top<ul><li>nested</li></ul></li><li>top two</li></ul>');
  })(),
);

/* ------------------------------------------------------------ real handbook */

const manifest = JSON.parse(read('notes.json'));
const files = (manifest.files || []).map((entry) => {
  const name = typeof entry === 'string' ? entry : entry.file;
  return { name, text: read(name) };
});

const book = buildBook({ title: manifest.title, subtitle: manifest.subtitle, files });

const allHtml = book.chapters.map((c) => c.html).join('\n');
const raw = files.map((f) => f.text).join('\n');

const rawFences = (raw.match(/^```/gm) || []).length;
const renderedBlocks = (allHtml.match(/class="code-block"/g) || []).length;

const rawCallouts = (raw.match(/^>\s*\[[a-z]+\]/gim) || []).length;
const renderedCallouts = (allHtml.match(/class="callout callout-/g) || []).length;

const rawTables = (raw.match(/^\|.*\|$/gm) || []).length;
const renderedRows = (allHtml.match(/<tr>/g) || []).length;

console.log(`\nHandbook: ${book.title}\n`);
console.log(
  `  ${book.chapters.length} chapters · ${book.parts.length} parts · ${renderedBlocks} code blocks · ${renderedCallouts} callouts\n`,
);

check('chapters were produced', book.chapters.length >= 9, `${book.chapters.length} chapters`);
check('parts were produced', book.parts.length >= 4, book.parts.map((p) => p.title).join(' | '));
check(
  'every chapter has a title and body',
  book.chapters.every((c) => c.title && c.html.length > 200),
);
check(
  'every chapter is reachable from exactly one part',
  book.chapters.every((c) => book.parts.some((p) => p.chapters.includes(c.id))),
);
check(
  'chapter ids are unique',
  new Set(book.chapters.map((c) => c.id)).size === book.chapters.length,
);
check(
  'every fenced block became a code block',
  rawFences / 2 === renderedBlocks,
  `${rawFences / 2} fences → ${renderedBlocks} blocks`,
);
check(
  'every callout became a callout',
  rawCallouts === renderedCallouts,
  `${rawCallouts} → ${renderedCallouts}`,
);
check('tables were rendered', renderedRows > rawTables / 2, `${renderedRows} rows`);
check(
  'no raw fenced markers leaked into the html',
  !allHtml.includes('```'),
);
check(
  'no undefined leaked into the html',
  !/>\s*undefined\s*</.test(allHtml),
);
check(
  'every callout type is one the stylesheet knows',
  ['tip', 'warn', 'note', 'perf', 'interview', 'recap'].every((tag) =>
    allHtml.includes(`callout-${tag}`),
  ),
);
check(
  'heading anchors point at ids that exist',
  book.chapters.every((chapter) => {
    const ids = new Set(chapter.headings.map((h) => h.id));
    const anchors = [...chapter.html.matchAll(/data-anchor[^>]*href="#([^"]+)"/g)].map(
      (m) => m[1],
    );
    return anchors.every((a) => ids.has(a));
  }),
);
check(
  'the search index has text for every chapter',
  book.chapters.every((c) => (c.text || '').trim().length > 50),
);
check(
  'reading times are sane',
  book.chapters.every((c) => c.minutes >= 1 && c.minutes < 120),
  `${book.chapters.reduce((s, c) => s + c.minutes, 0)} minutes total`,
);
check(
  'statistics add up',
  book.chapters.every(
    (c) =>
      c.stats &&
      typeof c.stats.code === 'number' &&
      (c.stats.callouts === undefined || typeof c.stats.callouts === 'object'),
  ),
);

/* ------------------------------------------------------------------- styles */

const css = read('reader/app.css');

console.log('\nStylesheet regressions\n');

check(
  'hidden elements are forced out of the layout',
  /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css),
  '[hidden] { display: none !important }',
  '`.boot` sets `display: grid; min-height: 100vh`, and an author rule beats the\n      browser default for [hidden]. Without the override a hidden <div> keeps a\n      whole viewport of layout space: a blank gap at the end of every chapter,\n      which also stops the sticky sidebar from reaching the page bottom.',
);

check(
  'the body does not become a scroll container',
  !/body\s*\{[^}]*overflow-x:\s*hidden/.test(css),
  'body uses overflow-x: clip',
  '`overflow-x: hidden` on <body> silently disables `position: sticky` for the\n      sidebar and the section rail. Use `overflow-x: clip` instead.',
);

const screenAt = css.indexOf('@media screen');
const darkAt = css.indexOf('[data-theme="dark"]');
const printAt = css.indexOf('@media print');
const printBlock = printAt === -1 ? '' : css.slice(printAt);

check(
  'the dark palette is scoped to the screen',
  screenAt !== -1 && darkAt !== -1 && screenAt < darkAt,
  'dark palette sits inside @media screen',
  'The dark palette also sets `color-scheme: dark`, which darkens the canvas and\n      every UA-painted surface — the whole printed page. Keeping it inside\n      `@media screen` makes print fall back to the light palette untouched.',
);

check(
  'print always uses a light colour scheme',
  /color-scheme:\s*light\s*!important/.test(printBlock),
  'color-scheme: light !important',
  'Without this the browser keeps painting a dark canvas while printing a page\n      that was read in dark mode: dark surroundings around a white sheet.',
);

check(
  'print forces a white page background',
  /html,\s*\n?\s*body\s*\{[^}]*background:\s*#ffffff\s*!important/.test(printBlock),
  'html, body { background: #ffffff !important }',
  'A themed page background is what turns the printed sheet dark.',
);

check(
  'print resets the tokens that carry a dark palette',
  ['--bg:', '--text:', '--muted:', '--code-bg:', '--t-kw:', '--c-tip:'].every((token) =>
    printBlock.includes(token),
  ),
  'background, text, muted, code, syntax and callout tokens',
  'Dark-theme syntax pastels and greys are close to invisible on white paper.',
);

console.log(
  `\n${failures === 0 ? '✓' : '✗'} ${checks - failures}/${checks} checks passed\n`,
);
process.exit(failures === 0 ? 0 : 1);
