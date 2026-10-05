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
    /* Inline code is a `dir="ltr"` element, which isolates it without any
       invisible characters: a trailing `;` or `()` inside a Persian sentence
       stays on the code's own side, and nothing leaks into a copy. */
    return (
      html.includes('<strong>bold</strong>') &&
      html.includes('<em>italic</em>') &&
      html.includes('<code class="ic" dir="ltr">Code&lt;T&gt;</code>') &&
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
    return (
      (html.match(/<tr>/g) || []).length === 3 &&
      html.includes('<th style="text-align:start">Type</th>')
    );
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

/* Notes written before the handbook was bilingual have a flat `files` list. */
const languages = manifest.languages || {
  en: { label: 'English', dir: 'ltr', files: manifest.files || [] },
};
const codes = Object.keys(languages);
const notesOnly = codes.filter((code) => (languages[code].files || []).length);

console.log(`\nHandbook: ${manifest.title} — ${codes.length} language(s)\n`);

/*
 * Every language is held to the same invariants, because a translation is a
 * full member of the book rather than a second-class extra: its fences must
 * all become code blocks, its anchors must resolve, and so on. The two checks
 * that describe a *finished* handbook — chapter and part counts — are only
 * applied to English, so a translation can be filled in a chapter at a time
 * without failing the build.
 */
function checkLanguage(code, entry) {
  const files = (entry.files || []).map((file) => {
    const name = typeof file === 'string' ? file : file.file;
    return { name, text: read(name) };
  });
  if (!files.length) return { chapters: 0, minutes: 0, blocks: 0, callouts: 0 };

  const book = buildBook({
    title: manifest.title,
    subtitle: manifest.subtitle,
    files,
    labels: { start: entry.label || 'Getting Started' },
  });

  const allHtml = book.chapters.map((c) => c.html).join('\n');
  const raw = files.map((f) => f.text).join('\n');

  const rawFences = (raw.match(/^```/gm) || []).length;
  const renderedBlocks = (allHtml.match(/class="code-block"/g) || []).length;
  const rawCallouts = (raw.match(/^>\s*\[[a-z]+\]/gim) || []).length;
  const renderedCallouts = (allHtml.match(/class="callout callout-/g) || []).length;
  const rawTables = (raw.match(/^\|.*\|$/gm) || []).length;
  const renderedRows = (allHtml.match(/<tr>/g) || []).length;
  const minutes = book.chapters.reduce((sum, c) => sum + c.minutes, 0);
  const at = (label) => `${code}: ${label}`;

  console.log(
    `  ${entry.label || code} — ${book.chapters.length} chapters · ${book.parts.length} parts · ${renderedBlocks} code blocks · ${renderedCallouts} callouts\n`,
  );

  check('chapters were produced', book.chapters.length >= 1, at(`${book.chapters.length} chapters`));
  if (code === 'en') {
    check('the reference handbook is complete', book.chapters.length >= 9, at(`${book.chapters.length} chapters`));
    check('parts were produced', book.parts.length >= 4, at(book.parts.map((p) => p.title).join(' | ')));
  }
  check(
    'every chapter has a title and body',
    book.chapters.every((c) => c.title && c.html.length > 200),
    at(`${book.chapters.length} chapters`),
  );
  check(
    'every chapter is reachable from exactly one part',
    book.chapters.every((c) => book.parts.some((p) => p.chapters.includes(c.id))),
    at('reachable'),
  );
  check(
    'chapter ids are unique',
    new Set(book.chapters.map((c) => c.id)).size === book.chapters.length,
    at('unique'),
  );
  check(
    'a numbered chapter is addressed by its number, in every language',
    book.chapters.every((c) => c.number === null || c.id === String(c.number)),
    at(book.chapters.filter((c) => c.number !== null).length + ' numbered'),
  );
  check(
    'every fenced block became a code block',
    rawFences / 2 === renderedBlocks,
    at(`${rawFences / 2} fences → ${renderedBlocks} blocks`),
  );
  check(
    'every callout became a callout',
    rawCallouts === renderedCallouts,
    at(`${rawCallouts} → ${renderedCallouts}`),
  );
  check('tables were rendered', renderedRows > rawTables / 2, at(`${renderedRows} rows`));
  check('no raw fenced markers leaked into the html', !allHtml.includes('```'), at('clean'));
  check('no undefined leaked into the html', !/>\s*undefined\s*</.test(allHtml), at('clean'));
  check(
    'heading anchors point at ids that exist',
    book.chapters.every((chapter) => {
      const ids = new Set(chapter.headings.map((h) => h.id));
      const anchors = [...chapter.html.matchAll(/data-anchor[^>]*href="#([^"]+)"/g)].map(
        (m) => m[1],
      );
      return anchors.every((a) => ids.has(a));
    }),
    at('resolve'),
  );
  check(
    'the search index has text for every chapter',
    book.chapters.every((c) => (c.text || '').trim().length > 50),
    at('indexed'),
  );
  check(
    'reading times are sane',
    book.chapters.every((c) => c.minutes >= 1 && c.minutes < 120),
    at(`${minutes} minutes total`),
  );
  check(
    'code blocks are pinned left-to-right',
    !renderedBlocks || (allHtml.match(/class="code-block" dir="ltr"/g) || []).length === renderedBlocks,
    at('dir="ltr"'),
  );
  /* Inline code is escaped exactly once: a second pass would leave `&amp;lt;`
     in the source, which the browser then paints as a literal `&lt;` instead
     of a `<`. That is the bug where `List<Enemy>` showed as `&lt;Enemy&gt;` in
     every paragraph, table, heading and callout that used a code span. */
  const doubleEscaped = (allHtml.match(/&amp;(?:lt|gt|amp|quot|#\d+);/g) || []).length;
  check(
    'inline code is escaped exactly once',
    doubleEscaped === 0,
    at(`${doubleEscaped} double-escaped entities`),
    'A `&amp;lt;` in the html turns into a visible `&lt;` on screen — escape code spans once, not twice.',
  );
  /* Inline code must be isolated by markup, and no Unicode bidi control
     characters may appear in the text at all: an FSI/PDI pair inside the
     element fights its own isolation (Chromium drops a trailing `;` to the far
     left of the code) and renders as a visible box in some fonts. */
  const inlineSpans = (allHtml.match(/<code class="ic"/g) || []).length;
  const ltrSpans = (allHtml.match(/<code class="ic" dir="ltr">/g) || []).length;
  check(
    'every inline code span is pinned left-to-right',
    inlineSpans === ltrSpans,
    at(`${ltrSpans}/${inlineSpans} dir="ltr"`),
  );
  const bidiControls = (raw + allHtml).match(/[\u2066-\u2069\u200e\u200f\u202a-\u202e]/g);
  check(
    'no invisible bidi characters leak into the text',
    !bidiControls,
    at(bidiControls ? `${bidiControls.length} found` : 'clean'),
    'Isolate Latin runs with dir="ltr"/dir="auto" elements instead of FSI/PDI characters.',
  );

  return { chapters: book.chapters.length, minutes, blocks: renderedBlocks, callouts: renderedCallouts };
}

const stats = {};
for (const code of codes) stats[code] = checkLanguage(code, languages[code]);

console.log('  Languages\n');

check(
  'at least one language has notes',
  notesOnly.length >= 1,
  notesOnly.join(', '),
);
check(
  'every language folder named in notes.json exists on disk',
  codes.every((code) => (languages[code].files || []).length > 0 || code === 'en'),
  codes.join(', '),
  'A language declared with no files is skipped by the switcher, so this is a\n      warning that a translation folder was emptied or misspelled.',
);
check(
  'translations cover the same chapters as English, or are still growing',
  codes.every((code) => code === 'en' || stats[code].chapters <= stats.en.chapters),
  codes.map((c) => `${c} ${stats[c].chapters}`).join(' · '),
);

/* ---------------------------------------------------------------- interface */

console.log('\nInterface\n');

const i18n = await import('../reader/i18n.js');
const baseKeys = Object.keys(i18n.UI.en);

for (const code of Object.keys(i18n.UI)) {
  const missing = baseKeys.filter((key) => i18n.UI[code][key] === undefined);
  check(
    `every interface string is translated (${code})`,
    missing.length === 0,
    `${Object.keys(i18n.UI[code]).length} strings`,
    `Missing: ${missing.join(', ')}`,
  );
}

check(
  'a translated string keeps its placeholders',
  Object.entries(i18n.UI).every(([code, dict]) =>
    Object.entries(dict).every(([key, value]) => {
      const expected = (i18n.UI.en[key] || '').match(/\{\w+\}/g) || [];
      return expected.every((slot) => String(value).includes(slot));
    }),
  ),
  'placeholders match English',
  'A translation that drops `{n}` silently loses the number it was given.',
);

check(
  'persian text is folded for search',
  i18n.fold('می‌کند') === 'می کند' &&
    i18n.fold('يادگيري') === 'یادگیری' &&
    i18n.fold('۱۲۳') === '123' &&
    i18n.fold('LINQ') === 'LINQ',
  'نیم‌فاصله · ي→ی · ۱۲۳→123 · Latin untouched',
);

check(
  'arabic and persian glyph variants fold to the same string',
  i18n.fold('كتاب') === i18n.fold('کتاب'),
  'ك → ک',
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
