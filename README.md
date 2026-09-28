<div align="center">

<img src="reader/icon.svg" alt="C# for Unity reader" width="104" height="104">

# C# for Unity — Handbook Reader

**A focused reading app for a C# &amp; Unity handbook written in Markdown.**
Notes stay plain `.md` files. The reader does the rest.

<img alt="dependencies: 0" src="https://img.shields.io/badge/dependencies-0-2ea043">
<img alt="notes: 22 chapters" src="https://img.shields.io/badge/notes-22_chapters-6f42c1">
<img alt="works offline: yes" src="https://img.shields.io/badge/works_offline-yes-06b6d4">
<img alt="license: MIT" src="https://img.shields.io/badge/license-MIT-3b82f6">
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
> the language, the Unity runtime, architecture, and debugging. **22 chapters** across
> **4 parts**, ~95 minutes of reading, with **107 code samples**, **37 tables** and
> **76 callouts**. Part IV (Practice) is on the way.

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

**Printing a real PDF.** Export lays out all 22 chapters with page breaks. Printing
is **always light** — white paper, dark ink, readable syntax colours — no matter
which theme you read in, and `Ctrl`/`⌘`+`P` gets the same treatment.

---

## Writing notes

Drop a `.md` file into `Assets/` with a numeric prefix so it sorts into place, then
refresh — or run `npm run manifest` to have `notes.json` rewritten for you.

```
Assets/
├── 00_intro.md
├── 10_part1_a.md
├── 11_part1_b.md
└── ...
```

Any file may hold several chapters: the reader splits on `#` headings, and a new part
begins wherever it sees `@part`.

### The syntax

| You write | You get |
|---|---|
| `@part Part IV — Practice \| What you will build.` | A new part, with a banner on its first chapter |
| `# 22. Custom tools` | A chapter — sidebar entry and page title |
| `## 22.1 Drawers` | A section — listed in "On this page", gets its own deep link |
| `> [tip] Title` | A callout. Also `warn`, `note`, `perf`, `interview`, `recap` |
| <code>```csharp Caption</code> | Highlighted C# with a caption bar and a copy button |
| `\| Type \| Size \|` | A table |
| `- item` / `1. item` | Lists; two spaces of indent nests one level |
| `**bold**` `*italic*` `` `code` `` `[link](url)` | Inline formatting |

Anything unrecognised becomes a paragraph, so ordinary Markdown always works.

### Callouts

Callout bodies are full Markdown, which is what makes the chapter summaries work:

```markdown
> [recap] Chapter 22
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
├── reader/
│   ├── app.js              routing, sidebar, search, progress, preferences
│   ├── app.css             the whole design system
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
Handbook: C# for Unity

  22 chapters · 4 parts · 107 code blocks · 76 callouts

  ✓ every fenced block became a code block — 107 fences → 107 blocks
  ✓ every callout became a callout — 76 → 76
  ✓ heading anchors point at ids that exist
  ✓ every chapter is reachable from exactly one part
  ✓ reading times are sane — 95 minutes total
  ✓ statistics add up

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

Zero dependencies is a deliberate constraint: nothing to keep updated, nothing to
break, nothing to trust.

---

## License

[MIT](LICENSE) © 2026 Sina Moradian — use it, fork it, ship it.

The handbook chapters under `Assets/` are covered by the same license.
