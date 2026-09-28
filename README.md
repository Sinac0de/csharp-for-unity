# C# for Unity — reading experience

A focused, dependency-free reader for the C# / Unity handbook in `Assets/`.
Zero packages, zero network calls, zero build step needed to edit your notes.

---

## Read it

```bash
npm run dev        # serve with live reload, opens your browser
```

Other ways in:

| Goal | Command | Result |
|---|---|---|
| Read on this machine | `npm run dev` | Local server + live reload on every save |
| Take it anywhere | `npm run build` | `dist/reader.html` — one self-contained file |
| Publish online | publish the project root | Static site; the root folder is already deployable |
| Install on a phone | open the hosted site → *Add to Home Screen* | Installs as an app and works offline |

`dist/reader.html` is a single 250 kB file with the styles, the scripts **and all
nine note files** inside it. Email it, AirDrop it, put it in cloud storage, open it
from a phone's Files app — it works with no server and no internet.

---

## Add or change notes

Drop a new `.md` file into `Assets/` and give it a numeric prefix so it lands in
the right place:

```
Assets/
  00_intro.md
  10_part1_a.md
  11_part1_b.md
  ...
```

Then either add it to `notes.json` by hand, or let the tool do it:

```bash
npm run manifest      # rescans Assets/ and rewrites the file list
npm run check         # verifies notes.json + renders every note through the parser
```

A file may hold several chapters — the reader splits on `#` headings — and a new
part starts wherever it sees `@part`.

### The syntax you can use

```markdown
@part Part IV — Practice | What you will build, and how to prepare for interviews.
```

| You write | You get |
|---|---|
| `# 22. Custom tools` | A chapter (the sidebar entry and the page title) |
| `## 22.1 Drawers` | A section (shows in "On this page", gets a deep link) |
| `> [tip] Title` | A green tip box. Also `warn`, `note`, `perf`, `interview`, `recap` |
| ` ```csharp Caption ` | A highlighted C# block with a caption and a copy button |
| `\| a \| b \|` | A table |
| `- item` / `1. item` | Lists, nested with two spaces |
| `**bold**`, `*italic*`, `` `code` ``, `[link](url)` | Inline formatting |

Callout bodies are full markdown, so the chapter summaries work naturally:

```markdown
> [recap] Chapter 22
> - The first takeaway.
> - The second takeaway.
```

The `@part` line only needs to appear once per part, at the top of the file that
starts it. The text after `|` becomes the part banner shown on that chapter.

Anything the reader does not recognise is treated as a paragraph, so plain
markdown always works.

Nothing renders as raw HTML: `<script>` in a note is shown as text, never run.

---

## Folders

```
index.html            the reader shell
notes.json            which notes to read, and in what order
sw.js                 service worker (must stay at the root to cache the notes)
Assets/*.md           your notes — the only folder you normally touch
reader/
  app.js              routing, sidebar, search, progress, preferences
  app.css             the whole design system
  md.js               markdown parser, C# highlighter, book model
  manifest.webmanifest, icon.svg, icons/
tools/
  serve.mjs           dev server with live reload
  build.mjs           the single-file build
  manifest.mjs        regenerates notes.json from Assets/
  selfcheck.mjs       parser tests run against your real notes
  icons.mjs           regenerates the PWA icons (no image library needed)
dist/reader.html      build output, safe to delete
```

The reader's own code lives in `reader/`, deliberately separate from `Assets/`.
On Windows and macOS those two names would otherwise be the same folder, and on a
case-sensitive host such as GitHub Pages the mismatch would break every asset.

---

## Scripts

```bash
npm run dev        # server + live reload
npm run serve      # server, without opening a browser
npm run build      # dist/reader.html
npm run manifest    # rewrite the file list in notes.json
npm run icons      # regenerate the PWA icon PNGs from the SVG
npm test           # parser self-check against the real notes
npm run check      # manifest up to date + self-check
```

Run `npm test` after editing notes or the renderer. It asserts the invariants that
matter however the handbook grows: every fenced block becomes a code block, every
callout becomes a callout, slugs stay unique, no raw markdown or HTML leaks, and
every chapter stays reachable.

---

## Keyboard

| Key | Action |
|---|---|
| `/` or `Ctrl`/`⌘` `K` | Search |
| `[` `]` | Previous / next chapter |
| `f` | Focus mode |
| `t` | Light / dark |
| `s` | Bookmark this chapter |
| `j` `k` | Scroll down / up |
| `g` | Top of the page |
| `Esc` | Leave search, settings, the drawer, or focus mode |

Shortcuts match the **physical** key, so `[` and `]` keep working on a Persian,
Arabic, Greek or Cyrillic keyboard layout.

---

## What the reader does for you

Reading: chapters grouped by part, a per-chapter "On this page" rail with
scroll-spy, deep links to every section, reading-time and content chips, and
prev/next navigation at the end of each chapter.

Progress: a progress bar, per-chapter read state, bookmarks, and *Continue
reading* that restores the exact scroll position you left.

Finding things: full-text search across every chapter and code block, ranked by
title and frequency, with highlighted snippets and `↑` `↓` `↵` navigation.

Comfort: light / dark / system theme, sans or serif, four text sizes, three line
spacings, three reading widths, and focus mode.

Printing: the export button lays out all 22 chapters with page breaks, and printing
is **always light** — white paper, dark ink, light syntax colours — no matter which
theme you read in. The dark palette is declared inside `@media screen`, so during
printing it does not exist and the light palette applies untouched; `Ctrl`+`P` gets
the same treatment for the current chapter.

Devices: a three-column desktop layout, a drawer on tablets, a bottom-friendly
phone layout, safe-area insets, and a service worker that makes the whole
handbook readable offline once installed.
