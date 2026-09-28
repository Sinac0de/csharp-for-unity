<div align="center">

<img src="reader/icon.svg" alt="C# for Unity reader" width="104" height="104">

# C# for Unity — Handbook Reader

**A focused, bilingual reading app for a C# &amp; Unity handbook written in Markdown.**
Notes stay plain `.md` files. The reader does the rest — in English or in Persian,
with the whole interface, the layout direction and the search following the language.

<img alt="dependencies: 0" src="https://img.shields.io/badge/dependencies-0-2ea043">
<a href="https://github.com/Sinac0de/csharp-for-unity"><img alt="notes: 26 chapters" src="https://img.shields.io/badge/notes-26_chapters-6f42c1"></a>
<img alt="languages: English and Persian" src="https://img.shields.io/badge/languages-English_·_فارسی-0891b2">
<img alt="works offline: yes" src="https://img.shields.io/badge/works_offline-yes-06b6d4">
<img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-3b82f6">
<a href="https://github.com/Sinac0de/csharp-for-unity"><img alt="source on GitHub" src="https://img.shields.io/badge/source-GitHub-181717?logo=github&logoColor=white"></a>
<img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-ff69b4">

</div>

---

## Why this exists

A handbook is a text file. Reading one should not mean squinting at raw Markdown in
an editor, and it should not mean installing a static-site generator, a theme and
forty npm packages just to see your own notes formatted.

So the notes here are ordinary Markdown, and the reader is 65 KB of JavaScript and
46 KB of CSS with **no dependencies at all** — no `node_modules`, no bundler, no CDN,
not a single byte fetched from the network at runtime. Write a note, refresh the page,
keep reading. Print it, install it on a phone, read it on a plane. It is also a real
reading app: full-text search over every chapter *and* every code sample, section deep
links, bookmarks, resume-where-you-left-off, adjustable typography, and a light/dark
theme that respects your eyes.

> **The handbook in this repository** covers the C# a Unity developer uses daily —
> the language, the Unity runtime, architecture, and practice. **26 chapters** across
> **5 parts**, ~113 minutes of reading, with **117 code samples**, **42 tables** and
> **80 callouts** — closing with practical systems, interview questions, a capstone
> project and a quick reference you can open on a bad day.
>
> It is also **bilingual**. Every chapter can exist in both English and Persian; the
> reader switches between them without a page reload, keeps your place, and flips the
> whole layout to right-to-left for Persian. Every code sample stays exactly as
> written — C# is C# in any language.

---

## Quick start

```bash
npm run dev        # serve with live reload, opens your browser
```

No `npm install` — there is nothing to install.

| I want to… | Command | What I get |
|---|---|---|
| Read on this machine | `npm run dev` | A local server that reloads on every save |
| Carry it anywhere | `npm run build` | `dist/reader.html` — one self-contained file |
| Publish it | *nothing* | The repository root is already a static site |
| Put it on my phone | *host it, then* **Add to Home Screen** | A real installable app that works offline |
| Add a chapter | `npm run manifest` | Picks up the new `.md` file automatically |

`dist/reader.html` is a single ~260 KB file holding the styles, the scripts **and
every note**. Email it, AirDrop it, drop it in Drive, open it from a phone's Files
app — it runs with no server and no internet connection.

---

## What reading here is actually like

**Reading.** Chapters grouped by part, a live "On this page" rail that follows your
scroll, deep links to any section, reading-time and content chips on every chapter,
and previous/next navigation at the end. Anchors copy a shareable link.

**Not losing your place.** A progress bar, per-chapter read state, bookmarks, and a
*Continue reading* card that restores the exact scroll position you left.

**Finding things.** Full-text search across every chapter *and* every code block,
ranked by title then frequency, with highlighted snippets and `↑` `↓` `↵` navigation.
No query yet? It suggests your bookmarks, what you were reading, and what is next.

**Eye comfort.** Light, dark or follow-the-system. Sans or serif. Four text sizes,
three line spacings, three reading widths. Focus mode strips the interface down to
the words — and keeps a floating exit button so you are never trapped.

**Every device.** Three columns on desktop, a slide-over drawer on tablets, a
phone-first layout with safe-area insets on mobile. Installs as a PWA and pre-caches
the whole handbook, so it works with airplane mode on.

**Two languages, one book.** A language pill in the topbar (and a row in the settings
sheet) switches languages instantly. The layout mirrors to right-to-left, the interface
is translated, the type stack changes to a Persian one, and letter-spacing is dropped —
Persian is a joined script, so tracking would tear words apart. Chapter URLs are built
from chapter *numbers*, so `#/25` is chapter 25 in both languages: switching keeps you
on the same chapter, at the same section, with your read state and bookmarks intact.
Search folds Persian glyph variants (`ي`→`ی`, `ك`→`ک`, Arabic-Indic digits) and the
half-space, so a query finds a chapter no matter which keyboard wrote it.

**Printing a real PDF.** Export lays out all 26 chapters with page breaks. Printing
is **always light** — white paper, dark ink, readable syntax colours — no matter
which theme you read in, and `Ctrl`/`⌘`+`P` gets the same treatment.

---

## Writing notes

Drop a `.md` file into `Assets/` with a numeric prefix so it sorts into place, then
refresh — or run `npm run manifest` to have `notes.json` rewritten for you.

```
Assets/
├── 00_intro.md            English: one file per part, or as many as you like
├── 10_part1_a.md
├── 11_part1_b.md
├── ...
├── 40_part4.md
└── fa/                    Persian: the same file names, the same order
    ├── 00_intro.md
    └── 10_part1_a.md
```

Any file may hold several chapters: the reader splits on `#` headings, and a new part
begins wherever it sees `@part`.

### Languages

One language per sub-folder. English lives at the top level of `Assets/` so the
original handbook needs no ceremony; every other language is a two-letter folder
(`fa/`, `de/`, `ja/`) holding files with the *same names and the same numeric
prefixes* as English. `npm run manifest` writes the whole structure into `notes.json`:

```json
{
  "title": "C# for Unity",
  "languages": {
    "en": { "label": "English", "dir": "ltr", "files": ["Assets/00_intro.md", "..."] },
    "fa": { "label": "فارسی", "dir": "rtl", "files": ["Assets/fa/00_intro.md", "..."] }
  }
}
```

The switcher builds itself from that map: a language with no files is simply not
offered, which is what lets a translation grow one chapter at a time without anything
breaking. Adding a third language is a folder and a run of `npm run manifest`.

The numbering convention is the part that matters. Keep the same chapter numbers in
every language (`# 25. Quick Reference` ↔ `# 25. مرجع سریع`) and two things follow: a
chapter keeps one URL across languages, and the reader can carry your position, read
state and bookmarks across a language switch.

Translate the prose, the headings, the callout titles and the captions. Leave code
fences, identifiers, API names and version numbers exactly as they are — and leave the
callout *tags* (`[tip]`, `[recap]`) and the `@part` marker in English, since those are
syntax, not prose. A Persian chapter looks like this (four backticks around the outer block, three
around the code fence inside it — nested fences need a longer delimiter):

````markdown
@part بخش چهارم — تمرین | سیستم‌های آماده و پروژهٔ پایانی

# 25. مرجع سریع

## 25.1 بردارها

> [tip] بهترین روش
> هر فریم `transform.position` را نخوان؛ نتیجه را کش کن.

```csharp
var x = transform.position.x;
```
````

The interface strings live in `reader/i18n.js`, one dictionary per language, and
`npm test` fails if a translation is missing a key or drops a `{placeholder}`.

### The syntax

| You write | You get |
|---|---|
| `@part Part IV — Practice \| What you will build.` | A new part, with a banner on its first chapter |
| `# 26. Custom tools` | A chapter — sidebar entry and page title, reachable at `#/26` |
| `## 26.1 Drawers` | A section — listed in "On this page", gets its own deep link |
| `> [tip] Title` | A callout. Also `warn`, `note`, `perf`, `interview`, `recap` |
| <code>```csharp Caption</code> | Highlighted C# with a caption bar and a copy button |
| `\| Type \| Size \|` | A table |
| `- item` / `1. item` | Lists; two spaces of indent nests one level |
| `**bold**` `*italic*` `` `code` `` `[link](url)` | Inline formatting |

Anything unrecognised becomes a paragraph, so ordinary Markdown always works.

### Callouts

Callout bodies are full Markdown, which is what makes the chapter summaries work:

```markdown
> [recap] Chapter 26
> - The first takeaway.
> - The second takeaway, with `inline code`.
```

| Tag | Shown as | Used for |
|---|---|---|
| `tip` | Green, lightbulb | Habits from professional Unity teams |
| `warn` | Amber, warning | Mistakes that are easy to make and costly to debug |
| `note` | Blue, info | Behaviour specific to Unity rather than C# |
| `perf` | Cyan, bolt | Something that affects frame time or memory |
| `interview` | Pink, speech bubble | How to explain an idea in an interview |
| `recap` | Indigo, checklist | End-of-chapter key takeaways |

### Safety

Note content is escaped before it is rendered: a `<script>` tag written in a note is
displayed as text and never executed.

---

## Project layout

```
.
├── index.html              the reader shell
├── notes.json              which notes to read, and in what order
├── sw.js                   service worker — lives at the root so it can cache Assets/
├── LICENSE
├── Assets/                 YOUR NOTES — the only folder you normally touch
│   └── fa/                 the same handbook in Persian, chapter by chapter
├── reader/
│   ├── app.js              routing, sidebar, search, progress, preferences
│   ├── app.css             the whole design system, light/dark and LTR/RTL
│   ├── i18n.js             interface strings per language, Persian text folding
│   ├── md.js               markdown parser, C# highlighter, book model
│   ├── icon.svg
│   ├── icons/              generated PWA icons
│   └── manifest.webmanifest
├── tools/
│   ├── serve.mjs           dev server with live reload
│   ├── build.mjs           the single-file portable build
│   ├── manifest.mjs        regenerates notes.json from Assets/
│   ├── selfcheck.mjs       tests the parser against the real notes
│   └── icons.mjs           regenerates the PWA icons (pure Node, no image library)
└── dist/reader.html        build output (gitignored)
```

**Why the reader lives in `reader/` and not `assets/`:** on Windows and macOS
`assets/` and `Assets/` are the *same folder*, and on a case-sensitive host such as
GitHub Pages the mismatch would 404 every stylesheet. Keeping the code in `reader/`
makes the notes folder unambiguous everywhere. `sw.js` sits at the root for the same
class of reason: a service worker can only cache URLs inside its own scope, and the
notes live in `Assets/`.

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with live reload, opens a browser |
| `npm run serve` | The same server, without opening a browser |
| `npm run build` | Writes `dist/reader.html`, the portable single file |
| `npm run manifest` | Rewrites the file list in `notes.json` from `Assets/` |
| `npm run icons` | Regenerates the PWA icon PNGs from `reader/icon.svg` |
| `npm test` | Runs the self-check (see below) |
| `npm run check` | `manifest --check` + `npm test`, for CI |

`npm run manifest -- --check` exits non-zero if `notes.json` is out of date, which is
what you want in a pipeline.

---

## Keyboard

| Key | Action |
|---|---|
| <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> | Search |
| <kbd>[</kbd> <kbd>]</kbd> | Previous / next chapter |
| <kbd>f</kbd> | Focus mode |
| <kbd>t</kbd> | Light / dark |
| <kbd>s</kbd> | Bookmark this chapter |
| <kbd>j</kbd> <kbd>k</kbd> | Scroll down / up |
| <kbd>g</kbd> | Back to the top |
| <kbd>Esc</kbd> | Leave search, settings, the drawer, or focus mode |

Shortcuts are matched against the **physical** key, so <kbd>[</kbd> and <kbd>]</kbd>
keep working on a Persian, Arabic, Greek or Cyrillic keyboard layout.

---

## Testing

```bash
npm test
```

The self-check does two jobs. It runs the **real parser over the real notes** and
asserts the invariants that must hold however the handbook grows, and it greps the
stylesheet for the specific declarations that earlier bugs had removed.

*(abridged — the parser checks come first, then these two groups)*

```
Handbook: C# for Unity — 2 language(s)

  English — 26 chapters · 5 parts · 117 code blocks · 80 callouts

  ✓ every fenced block became a code block — en: 117 fences → 117 blocks
  ✓ every callout became a callout — en: 80 → 80
  ✓ heading anchors point at ids that exist — en: resolve
  ✓ a numbered chapter is addressed by its number, in every language — en: 26 numbered
  ✓ reading times are sane — en: 113 minutes total

  فارسی — 1 chapters · 1 parts · 0 code blocks · 5 callouts

  ✓ every callout became a callout — fa: 5 → 5
  ✓ code blocks are pinned left-to-right — fa: dir="ltr"

  Languages

  ✓ translations cover the same chapters as English, or are still growing — en 26 · fa 1

  Interface

  ✓ every interface string is translated (fa) — 114 strings
  ✓ a translated string keeps its placeholders — placeholders match English
  ✓ persian text is folded for search — نیم‌فاصله · ي→ی · ۱۲۳→123 · Latin untouched

Stylesheet regressions
  ✓ hidden elements are forced out of the layout
  ✓ the body does not become a scroll container
  ✓ the dark palette is scoped to the screen
  ✓ print always uses a light colour scheme
  ✓ print forces a white page background
  ✓ print resets the tokens that carry a dark palette

✓ 28/28 checks passed
```

The parser tests are behavioural, not golden files, so adding or rewriting chapters
cannot break them. The stylesheet checks are there because each one guards a bug that
was genuinely painful: a hidden element that still occupied a viewport of layout, an
`overflow-x: hidden` that silently disabled `position: sticky`, and a dark `color-scheme`
that turned exported PDFs black.

Every language is held to the same invariants, so a translation cannot quietly rot:
its fences must all become code blocks, its anchors must resolve, its code blocks must
stay left-to-right. Only the two checks that describe a *finished* handbook — chapter
and part counts — are applied to English, so Persian (or German, or Japanese) can grow
one chapter at a time without failing the suite. The `Interface` group fails if a
translation misses a key or drops a `{placeholder}` that English passes in.

There is no test runner, no assertion library and no config — `npm test` is a script
that prints what it checked and exits non-zero on failure.

---

## Deploying

The repository root **is** the site. Nothing to compile, nothing to configure.

**GitHub Pages** — *Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.*

**Vercel / Netlify / Cloudflare Pages** — connect the repository, leave the build
command empty, set the output directory to the repository root.

**As a file** — `npm run build`, then share `dist/reader.html`. It is one file and it
works from `file://` with no server at all, which is the point: no host, no CDN, no
Wi-Fi, still readable.

> If you would rather ship the built file inside the repository too, delete the
> `dist/` line from `.gitignore`. Attaching it to a GitHub Release is usually the
> tidier option.

---

## Under the hood

Two things carry most of the weight, and both are small enough to read in one sitting.

**`reader/md.js`** is a hand-written parser for exactly the dialect the notes use —
headings, tables, fenced code with captions, blockquote callouts, nested lists — plus
a C# tokenizer that colours comments, strings, keywords, types and calls. No Markdown
library, because no library would have understood `> [recap] Chapter 1` or
<code>```csharp Switch expression</code> without a pile of preprocessing anyway.

**`reader/app.css`** is a single design system built on custom properties. The whole
light/dark palette is one block of variables, which is why "print as light" is a
one-line idea (the dark palette is declared inside `@media screen`, so printing simply
never sees it) rather than a second theme to maintain.

**`reader/i18n.js`** holds the interface in each language and the Persian text folding
that makes search work: Arabic and Persian letter variants, Arabic-Indic digits and the
ZWNJ half-space are normalised to a single shape before anything is compared, so a query
matches the text however it was typed. The stylesheet leans on logical properties
(`border-inline-end`, `inset-inline-start`, `text-align: start`) throughout, which is
why flipping `<html dir="rtl">` mirrors the three-column layout, the drawer, the section
rail and the floating buttons in one step instead of needing a second stylesheet. Code
blocks pin themselves back to `dir="ltr"`.

Zero dependencies is a deliberate constraint: nothing to keep updated, nothing to
break, nothing to trust.

---

## License

[MIT](LICENSE) © 2026 Sina Moradian — use it, fork it, ship it.

The handbook chapters under `Assets/` are covered by the same license.
