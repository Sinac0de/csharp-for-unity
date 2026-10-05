/**
 * md.js — a small, dependency-free markdown renderer for the "C# for Unity" handbook.
 *
 * The notes use a deliberately small dialect, so this parser supports exactly that
 * dialect plus the few things you are likely to add later:
 *
 *   @part Title | Description        part divider (starts a new part)
 *   # Heading                        chapter title
 *   ## Heading / ### Heading         sections (become the "on this page" rail)
 *   ```csharp Caption text           fenced code with an optional caption
 *   > [tag] Title                    callout; body is markdown (lists welcome)
 *      tags: tip warn note perf interview recap
 *   | a | b |                        tables (alignment row supported)
 *   - item / 1. item                 lists, with indentation nesting
 *   ---                              horizontal rule
 *
 * Everything else is a paragraph. Inline support: **bold**, *italic*, `code`, [links](url).
 *
 * The parser also returns the section headings and a plain-text projection used by
 * the built-in search index.
 */

/* ------------------------------------------------------------------ text utils */

/**
 * Escapes HTML.
 *
 * Bidi isolation is done by markup, never by invisible characters. Every place
 * that carries Latin inside a Persian sentence is an element with
 * `dir="ltr"`/`dir="auto"`, which the HTML spec turns into `direction` +
 * `unicode-bidi: isolate` on its own. Keeping the isolate markers out of the
 * text matters: they used to leak into copied code, search hits and — worse —
 * Chromium let a trailing `;` escape the nested FSI/PDI pair and jump to the
 * far left of the code, and some fonts paint U+2067/U+2069 as visible boxes.
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Wrap an already-escaped code span. `dir="ltr"` makes the element a bidi
 * isolate in its own right, so a trailing `;`, `,` or `()` stays on the code's
 * own side inside a Persian sentence. Do not add an FSI/PDI pair in here: it
 * fights the element's own isolation (the `;` ends up at the left edge) and the
 * characters show up in some fonts.
 */
function codeSpanHtml(escapedText) {
  return `<code class="ic" dir="ltr">${escapedText}</code>`;
}

export function slugify(text) {
  const base = String(text)
    .replace(/[`*_~]/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return base.slice(0, 64) || 'section';
}

const CALLOUT_TAGS = ['tip', 'warn', 'note', 'perf', 'interview', 'recap'];

/**
 * A callout's tag (`[tip]`, `[warn]`, …) is syntax, never translated. But the
 * little uppercase label it paints on every callout should speak the reader's
 * language, so the caller passes a map per language; English is the fallback.
 * Keys match CALLOUT_TAGS; an unknown tag keeps its raw tag as the label.
 */
const CALLOUT_LABELS = {};
export function setCalloutLabels(labels) {
  for (const [tag, label] of Object.entries(labels || {})) {
    if (CALLOUT_TAGS.includes(tag)) CALLOUT_LABELS[tag] = label;
  }
}
function calloutLabel(tag) {
  return CALLOUT_LABELS[tag] || tag;
}

/** Word/reading-time estimate. */
export function estimateWords(text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return { words, minutes: Math.max(1, Math.round(words / 200)) };
}

/* -------------------------------------------------------------- inline markup */

/**
 * Renders inline markdown inside a single block. Input is raw, output is HTML.
 * Code spans go through `codeSpanHtml`, so each one is isolated and pinned to
 * LTR — which is what keeps a trailing `;` or a pair of `()` sitting on the
 * code's own side when the surrounding sentence is Persian.
 */
export function inline(source) {
  let out = escapeHtml(source);

  // Protect code spans so their contents are never styled as emphasis. They
  // are captured post-escaping, so codeSpanHtml must not escape again.
  const spans = [];
  out = out.replace(/`([^`]+)`/g, (_, code) => `\u0001${spans.push(code) - 1}\u0001`);

  out = out.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/~~([^~]+?)~~/g, '<del>$1</del>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');

  out = out.replace(
    /\u0001(\d+)\u0001/g,
    (_, i) => codeSpanHtml(spans[Number(i)]),
  );
  return out;
}

/** Inline markdown reduced to plain text, for the search index. */
function inlineText(source) {
  return String(source)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/~~([^~]+?)~~/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------ C# highlighting */

const KEYWORDS = new Set(
  (
    'abstract as async await base break case catch checked class const continue default delegate do ' +
    'else enum event explicit extern false finally fixed for foreach get goto if implicit in interface ' +
    'internal is lock namespace new null operator out override params partial private protected public ' +
    'readonly record ref return sealed set sizeof stackalloc static struct switch this throw true try ' +
    'typeof unchecked unsafe using var virtual volatile when where while yield dynamic nameof init ' +
    'global require scoped file'
  ).split(' '),
);

const BUILTIN_TYPES = new Set(
  (
    'void bool byte sbyte char short ushort int uint long ulong float double decimal string object ' +
    'nint nuint'
  ).split(' '),
);

const TOKEN_RE = new RegExp(
  [
    '(?<com>\\/\\/[^\\n]*)',
    '|(?<blk>\\/\\*[\\s\\S]*?\\*\\/)',
    '|(?<str>@?\\$?"(?:""|\\\\.|[^"\\\\])*")',
    "|(?<chr>'(?:\\\\.|[^'\\\\])*')",
    '|(?<pre>#[a-zA-Z_]+)',
    '|(?<attr>\\[[A-Z][A-Za-z0-9_.]*(?:\\s*\\([^)\\n]*\\))?\\])',
    '|(?<num>\\b\\d[\\d_]*(?:\\.\\d+)?[fdmFuUlL]*\\b)',
    '|(?<word>[A-Za-z_]\\w*)',
  ].join(''),
  'g',
);

/**
 * Highlights C# well enough to read: comments, strings, keywords, types, calls.
 * It is intentionally a tokenizer rather than a parser — fast, allocation-light,
 * and it degrades to plain escaped text for anything it does not recognise.
 */
export function highlightCSharp(code) {
  let out = '';
  let last = 0;
  let match;
  TOKEN_RE.lastIndex = 0;

  while ((match = TOKEN_RE.exec(code)) !== null) {
    if (match.index > last) out += escapeHtml(code.slice(last, match.index));
    last = TOKEN_RE.lastIndex;

    const g = match.groups;
    const value = match[0];

    if (g.com) out += `<span class="t-com">${escapeHtml(value)}</span>`;
    else if (g.blk) out += `<span class="t-com">${escapeHtml(value)}</span>`;
    else if (g.str) out += `<span class="t-str">${escapeHtml(value)}</span>`;
    else if (g.chr) out += `<span class="t-str">${escapeHtml(value)}</span>`;
    else if (g.pre) {
      const atLineStart = match.index === 0 || code[match.index - 1] === '\n';
      out += atLineStart
        ? `<span class="t-pre">${escapeHtml(value)}</span>`
        : escapeHtml(value);
    } else if (g.attr) out += `<span class="t-attr">${escapeHtml(value)}</span>`;
    else if (g.num) out += `<span class="t-num">${escapeHtml(value)}</span>`;
    else if (g.word) {
      const next = code.slice(last);
      const isCall = /^\s*\(/.test(next);
      if (BUILTIN_TYPES.has(value)) out += `<span class="t-type">${value}</span>`;
      else if (KEYWORDS.has(value)) out += `<span class="t-kw">${value}</span>`;
      else if (/^[A-Z]/.test(value)) out += `<span class="t-type">${value}</span>`;
      else if (isCall) out += `<span class="t-fn">${value}</span>`;
      else out += value;
    }
  }

  if (last < code.length) out += escapeHtml(code.slice(last));
  return out;
}

const LANG_LABEL = {
  csharp: 'C#',
  cs: 'C#',
  'c#': 'C#',
  shader: 'Shader',
  hlsl: 'HLSL',
  json: 'JSON',
  text: '',
  plaintext: '',
  txt: '',
  bash: 'Shell',
  sh: 'Shell',
  xml: 'XML',
  yaml: 'YAML',
};

function highlight(code, lang) {
  if (lang === 'csharp' || lang === 'cs' || lang === 'c#') return highlightCSharp(code);
  return escapeHtml(code);
}

/* ----------------------------------------------------------------- block level */

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_FENCE = /^(\s*)(```|~~~)[ \t]*([\w+#.-]*)[ \t]*(.*)$/;
const RE_PART = /^@part\s+(.*)$/;
const RE_LIST_ITEM = /^(\s*)([-*+]|\d+[.)])[ \t]+(.*)$/;
const RE_RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const RE_QUOTE = /^\s*>/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  const cells = [];
  let current = '';
  let inCode = false;
  for (const ch of s) {
    if (ch === '`') inCode = !inCode;
    if (ch === '|' && !inCode) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

function isTableSeparator(line) {
  if (!line.includes('-')) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^\s*:?-{2,}:?\s*$/.test(c));
}

function alignmentOf(cell) {
  const left = cell.trim().startsWith(':');
  const right = cell.trim().endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  return 'left';
}

/** Markdown alignment → direction-relative CSS, so RTL tables align correctly. */
const SHARED_ALIGN = { left: 'start', right: 'end', center: 'center' };

function isBlockStart(line) {
  return (
    line.trim() === '' ||
    RE_HEADING.test(line) ||
    RE_FENCE.test(line) ||
    RE_QUOTE.test(line) ||
    RE_LIST_ITEM.test(line) ||
    RE_RULE.test(line) ||
    RE_PART.test(line)
  );
}

function buildListTree(items) {
  let cursor = 0;

  function build(baseIndent) {
    const ordered = items[cursor].ordered;
    const tag = ordered ? 'ol' : 'ul';
    let html = `<${tag}>`;

    while (cursor < items.length && items[cursor].indent >= baseIndent) {
      const item = items[cursor];
      cursor += 1;
      let children = '';
      if (cursor < items.length && items[cursor].indent > item.indent) {
        children = build(items[cursor].indent);
      }
      html += `<li>${inline(item.text)}${children}</li>`;
    }

    return `${html}</${tag}>`;
  }

  let html = '';
  while (cursor < items.length) html += build(items[cursor].indent);
  return html;
}

/**
 * Renders a run of lines into HTML.
 * `ctx` carries the heading list, the unique-slug counter, the plain-text buffer
 * and the stats used by the chapter header.
 */
function renderBlocks(lines, ctx) {
  const html = [];
  let i = 0;

  const pushText = (text) => {
    const flat = inlineText(text);
    if (flat) ctx.text.push(flat);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    /* fenced code ------------------------------------------------------- */
    let m = RE_FENCE.exec(line);
    if (m) {
      const fence = m[2];
      const lang = (m[3] || '').toLowerCase();
      const caption = (m[4] || '').trim();
      const body = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^\\s*${fence}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence

      while (body.length && body[0].trim() === '') body.shift();
      while (body.length && body[body.length - 1].trim() === '') body.pop();

      const code = body.join('\n');
      const label = LANG_LABEL[lang] ?? (lang ? lang.toUpperCase() : ctx.labels.code);
      ctx.stats.code += 1;
      if (code) pushText(caption ? `${caption} ${code}` : code);

      /* Code is always left-to-right. Inside a Persian chapter `dir="ltr"`
         keeps C# from being reordered into nonsense. */
      html.push(
        '<figure class="code-block" dir="ltr" data-lang="' +
          escapeHtml(lang || 'text') +
          '">' +
          '<figcaption class="code-bar">' +
          (label ? `<span class="code-lang">${escapeHtml(label)}</span>` : '') +
          (caption ? `<span class="code-title" dir="auto">${escapeHtml(caption)}</span>` : '') +
          `<button class="code-copy" type="button" data-copy aria-label="${escapeHtml(
            ctx.labels.copyCode,
          )}">` +
          '<svg viewBox="0 0 24 24" aria-hidden="true" width="15" height="15"><path d="M9 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          `<span>${escapeHtml(ctx.labels.copy)}</span>` +
          '</button>' +
          '</figcaption>' +
          `<pre><code class="language-${escapeHtml(lang || 'text')}">${highlight(code, lang)}</code></pre>` +
          '</figure>',
      );
      continue;
    }

    /* part directive ----------------------------------------------------- */
    m = RE_PART.exec(line);
    if (m) {
      html.push(`<div class="part-rule" data-part="${escapeHtml(m[1])}"></div>`);
      i += 1;
      continue;
    }

    /* headings ----------------------------------------------------------- */
    m = RE_HEADING.exec(line);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();

      if (level === 1 && !ctx.allowHeadings) {
        html.push(`<p class="quote-heading">${inline(text)}</p>`);
        pushText(text);
        i += 1;
        continue;
      }

      const id = ctx.uniqueId(text);
      const textIndex = ctx.text.length;
      ctx.headings.push({ level, text: inlineText(text), id, textIndex });
      pushText(text);

      if (level === 1) {
        html.push(`<h1 id="${id}">${inline(text)}</h1>`);
      } else {
        html.push(
          `<h${level} id="${id}" class="h${level}">` +
            `<a class="h-anchor" href="#${id}" data-anchor aria-label="Copy link to &quot;${escapeHtml(
              inlineText(text),
            )}&quot;"><span aria-hidden="true">#</span></a>` +
            `${inline(text)}` +
            `</h${level}>`,
        );
      }
      i += 1;
      continue;
    }

    /* horizontal rule ---------------------------------------------------- */
    if (RE_RULE.test(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    /* blockquote / callout ----------------------------------------------- */
    if (RE_QUOTE.test(line)) {
      const quoted = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }

      let tag = '';
      let title = '';
      let body = quoted;
      const tagMatch = /^\[([a-z][\w-]*)\]\s*(.*)$/i.exec(quoted[0] || '');
      if (tagMatch) {
        tag = tagMatch[1].toLowerCase();
        title = tagMatch[2].trim();
        body = quoted.slice(1);
      }
      if (!CALLOUT_TAGS.includes(tag)) tag = tag ? 'note' : 'quote';

      const inner = renderBlocks(body, { ...ctx, allowHeadings: false });
      pushText(title);
      pushText(body.join(' '));
      if (tag !== 'quote') ctx.stats.callouts[tag] = (ctx.stats.callouts[tag] || 0) + 1;

      const label = title
        ? `<p class="callout-title">${inline(title)}</p>`
        : '';
      /* `dir="auto"` lets the badge speak either language: the Persian label
         resolves RTL, the English one LTR, and the element isolates itself so
         it can never drag punctuation out of the sentence beside it. */
      const badge = `<span class="callout-badge" dir="auto">${escapeHtml(
        calloutLabel(tag),
      )}</span>`;
      html.push(
        `<aside class="callout callout-${tag}" role="note" data-tag="${tag}">` +
          `<div class="callout-icon" aria-hidden="true">${CALLOUT_ICONS[tag] || CALLOUT_ICONS.note}</div>` +
          `<div class="callout-main">` +
          `${badge}` +
          `${label}${inner}` +
          '</div></aside>',
      );
      continue;
    }

    /* tables ------------------------------------------------------------- */
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map(alignmentOf);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      header.forEach(pushText);
      rows.forEach((r) => r.forEach(pushText));
      ctx.stats.tables += 1;

      const cells = (rowCells, tagName) =>
        rowCells
          .map((cell, index) => {
            /* `start`/`end` are direction-relative, so an RTL chapter aligns
               its table from the right edge without a second rule. */
            const a = SHARED_ALIGN[align[index]] || 'start';
            return `<${tagName} style="text-align:${a}">${inline(cell.trim())}</${tagName}>`;
          })
          .join('');

      html.push(
        `<div class="table-wrap" role="region" tabindex="0" aria-label="${escapeHtml(
          ctx.labels.table,
        )}">` +
          `<table><thead><tr>${cells(header, 'th')}</tr></thead>` +
          `<tbody>${rows.map((r) => `<tr>${cells(r, 'td')}</tr>`).join('')}</tbody>` +
          '</table></div>',
      );
      continue;
    }

    /* lists -------------------------------------------------------------- */
    if (RE_LIST_ITEM.test(line)) {
      const items = [];
      while (i < lines.length) {
        const itemMatch = RE_LIST_ITEM.exec(lines[i]);
        if (!itemMatch) {
          if (
            lines[i].trim() !== '' &&
            !isBlockStart(lines[i]) &&
            items.length > 0 &&
            /^\s{2,}/.test(lines[i])
          ) {
            items[items.length - 1].text += ` ${lines[i].trim()}`;
            i += 1;
            continue;
          }
          break;
        }
        items.push({
          indent: itemMatch[1].replace(/\t/g, '  ').length,
          ordered: /^\d/.test(itemMatch[2]),
          text: itemMatch[3],
        });
        i += 1;
      }
      items.forEach((item) => pushText(item.text));
      const ordered = items[0].ordered;
      ctx.stats[ordered ? 'ol' : 'ul'] =
        (ctx.stats[ordered ? 'ol' : 'ul'] || 0) + items.length;
      html.push(buildListTree(items));
      continue;
    }

    /* paragraph ---------------------------------------------------------- */
    const paragraph = [];
    while (i < lines.length && !isBlockStart(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    if (paragraph.length) {
      const text = paragraph.join(' ');
      pushText(text);
      html.push(`<p>${inline(text)}</p>`);
    }
  }

  return html.join('\n');
}

const CALLOUT_ICONS = {
  tip:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/></svg>',
  warn:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
  note:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v5M12 8h.01"/></svg>',
  perf:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z"/></svg>',
  interview:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/></svg>',
  recap:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11.5 11.5 14 15.5 9.5"/><path d="M12 2.8 4.5 6v6c0 4.4 3 8 7.5 9.4 4.5-1.4 7.5-5 7.5-9.4V6L12 2.8Z"/></svg>',
  quote:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 6C4.8 6 3 7.8 3 10s1.8 4 4 4c.4 0 .7 0 1-.1-.4 2-2 3.3-2 3.3l1.6 1.3C10.4 16.6 11 14 11 12c0-3.3-1.8-6-4-6Zm10 0c-2.2 0-4 1.8-4 4s1.8 4 4 4c.4 0 .7 0 1-.1-.4 2-2 3.3-2 3.3l1.6 1.3C20.4 16.6 21 14 21 12c0-3.3-1.8-6-4-6Z"/></svg>',
};

/* -------------------------------------------------------------------- parsing */

/**
 * Parses one chapter body into HTML plus metadata.
 * @returns {{ html: string, headings: Array, text: string, stats: object }}
 */
export function parseMarkdown(source, labels = {}) {
  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  const slugCounts = new Map();
  const ctx = {
    headings: [],
    text: [],
    allowHeadings: true,
    /* The few words the renderer writes itself. They are translated by the
       caller, because the parser has no idea which language it is parsing. */
    labels: { copy: 'Copy', copyCode: 'Copy code', table: 'Table', code: 'Code', ...labels },
    stats: { code: 0, tables: 0, callouts: {}, ul: 0, ol: 0 },
    uniqueId(raw) {
      const base = slugify(inlineText(raw));
      const seen = (slugCounts.get(base) || 0) + 1;
      slugCounts.set(base, seen);
      return seen === 1 ? base : `${base}-${seen}`;
    },
  };

  const html = renderBlocks(lines, ctx);

  // The very first heading is the chapter title; keep it out of the page rail.
  const sections = ctx.headings.filter((h) => h.level > 1);
  const titleHeading = ctx.headings.find((h) => h.level === 1) || null;

  return {
    html,
    headings: sections,
    titleHeading,
    text: ctx.text.join('\n'),
    textParts: ctx.text,
    stats: ctx.stats,
  };
}

/* ----------------------------------------------------------------- book model */

/**
 * Turns the raw note files into the navigable book: parts, chapters, metadata.
 * A single file may contain several chapters (it is split on `#` headings).
 *
 * @param {{ title?: string, subtitle?: string, files: Array, labels?: object }} source
 */
export function buildBook(source) {
  const labels = source.labels || {};
  const parts = [];
  const chapters = [];
  const partById = new Map();

  const front = {
    id: 'start',
    title: labels.start || 'Getting Started',
    description: '',
    chapters: [],
  };
  partById.set(front.id, front);

  let currentPart = front;
  let pendingTitle = null;
  let pendingLines = [];
  let currentFile = '';

  const flush = () => {
    const body = pendingLines.join('\n').trim();
    const rawTitle = pendingTitle;
    pendingTitle = null;
    pendingLines = [];
    if (!body && rawTitle === null) return;

    const numberMatch = /^(\d+)\s*\.\s*(.*)$/.exec(rawTitle);
    const parsed = parseMarkdown(body, labels);
    /* A numbered chapter is addressed by its number, not by its title: `#/26`
       is the same URL in every language, which is what lets the language switch
       land on the chapter you were reading with your progress intact. A chapter
       without a number (the introduction) keeps a readable slug. */
    const id = uniqueId(chapters, numberMatch ? numberMatch[1] : rawTitle);

    const chapter = {
      id,
      title: rawTitle,
      titleHtml: inline(rawTitle),
      number: numberMatch ? Number(numberMatch[1]) : null,
      label: numberMatch ? `Chapter ${numberMatch[1]}` : '',
      partId: currentPart.id,
      partTitle: currentPart.title,
      partDescription: currentPart.description,
      isPartStart:
        currentPart.id !== front.id && currentPart.chapters.length === 0,
      html: parsed.html,
      headings: parsed.headings,
      text: parsed.text,
      textParts: parsed.textParts,
      stats: parsed.stats,
      source: currentFile,
    };

    currentPart.chapters.push(chapter.id);
    chapters.push(chapter);
  };

  for (const file of source.files) {
    currentFile = file.name;
    const lines = String(file.text).replace(/\r\n?/g, '\n').split('\n');
    for (const line of lines) {
      const partMatch = RE_PART.exec(line);
      if (partMatch) {
        flush();
        const [title, description] = partMatch[1].split('|').map((s) => s.trim());
        const id = slugify(title) || `part-${parts.length + 1}`;
        let part = partById.get(id);
        if (!part) {
          part = { id, title, description: description || '', chapters: [] };
          partById.set(id, part);
          parts.push(part);
        }
        currentPart = part;
        continue;
      }
      const headMatch = /^#\s+(.*)$/.exec(line);
      if (headMatch) {
        flush();
        pendingTitle = headMatch[1].trim();
        continue;
      }
      pendingLines.push(line);
    }
    pendingLines.push(''); // keep files separated
  }
  flush();

  if (front.chapters.length) parts.unshift(front);

  const orderedParts = parts.filter((p) => p.chapters.length > 0);
  for (const part of orderedParts) {
    part.chapterIndexes = part.chapters.map((id) =>
      chapters.findIndex((c) => c.id === id),
    );
  }

  const totals = chapters.reduce(
    (acc, chapter) => {
      acc.code += chapter.stats.code;
      acc.tables += chapter.stats.tables;
      for (const [tag, n] of Object.entries(chapter.stats.callouts)) {
        acc.callouts[tag] = (acc.callouts[tag] || 0) + n;
      }
      return acc;
    },
    { code: 0, tables: 0, callouts: {} },
  );

  return {
    title: source.title || 'Notes',
    subtitle: source.subtitle || '',
    parts: orderedParts,
    chapters: chapters.map((chapter, index) => {
      const { words, minutes } = estimateWords(chapter.text);
      return { ...chapter, index, words, minutes };
    }),
    totals,
  };
}

function uniqueId(chapters, title) {
  const base = slugify(title) || 'chapter';
  let id = base;
  let n = 2;
  const taken = () => chapters.some((c) => c.id === id);
  while (taken()) id = `${base}-${n++}`;
  return id;
}
