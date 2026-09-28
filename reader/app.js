/**
 * app.js — the reading experience for "C# for Unity".
 *
 * Content comes from notes.json + the .md files, or from window.__NOTES_SOURCE__
 * when this is the portable single-file build produced by tools/build.mjs.
 *
 * Features: hash routing, part/chapter sidebar, chapter rendering, an "on this
 * page" rail with scroll-spy and deep links, reading progress, bookmarking,
 * resume-where-you-left-off, full-text search, display preferences, code copying,
 * keyboard shortcuts and whole-book print / PDF export.
 *
 * No dependencies and no build step is needed to edit the notes.
 */

import { buildBook, escapeHtml } from './md.js';
import { translate, fold, directionOf } from './i18n.js';

/* ------------------------------------------------------------------ elements */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const els = {
  app: $('#app'),
  boot: $('#boot'),
  article: $('#chapter'),
  printAll: $('#printAll'),
  nav: $('#sidebarNav'),
  resumeSlot: $('#resumeSlot'),
  bookmarksSlot: $('#bookmarksSlot'),
  rail: $('#rail'),
  railList: $('#railList'),
  progressTrack: $('.progress-track'),
  progressFill: $('#progressFill'),
  progressLabel: $('#sidebarProgressLabel'),
  progressFillMini: $('#sidebarProgressFill'),
  readLabel: $('#sidebarReadLabel'),
  searchOverlay: $('#searchOverlay'),
  searchInput: $('#searchInput'),
  searchResults: $('#searchResults'),
  searchFoot: $('#searchFoot'),
  settingsSheet: $('#settingsSheet'),
  toasts: $('#toasts'),
  fab: $('#fab'),
  brandTitle: $('#brandTitle'),
  brandSub: $('#brandSub'),
};

/* --------------------------------------------------------------------- icons */

const ICONS = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  code: '<path d="m9 8-4 4 4 4M15 8l4 4-4 4"/>',
  tip: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z"/>',
  warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  note: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  perf: '<path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z"/>',
  interview: '<path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/>',
  recap: '<path d="M9 11.5 11.5 14 15.5 9.5"/><path d="M12 2.8 4.5 6v6c0 4.4 3 8 7.5 9.4 4.5-1.4 7.5-5 7.5-9.4V6L12 2.8Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.4 12.2 2.4 2.4 4.8-5"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z"/>',
  bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  sliders: '<path d="M4 8h10M18 8h2M4 16h4M12 16h8"/><circle cx="16" cy="8" r="2"/><circle cx="10" cy="16" r="2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  printer: '<path d="M7 9V3h10v6M7 19H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><path d="M7 15h10v6H7z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
};

function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

/* ------------------------------------------------------------------- storage */

const STORE_KEY = 'csharp-unity-reader';

/* ----------------------------------------------------------------- language */

/** Interface language. The notes have their own copy per language. */
let lang = 'en';
const t = (key, vars) => translate(lang, key, vars);
const isRtl = () => directionOf(lang) === 'rtl';

/**
 * Translates everything the markup declares, so index.html can stay plain
 * English and still read correctly in Persian.
 *
 * `data-i18n`        → textContent (safe: never interpreted as markup)
 * `data-i18n-html`   → innerHTML, for the two hints that contain <b>/<span class="kbd">
 * `data-i18n-title`  → the title attribute
 * `data-i18n-aria`   → aria-label
 * `data-i18n-ph`     → placeholder
 */
function applyStaticStrings() {
  $$('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $$('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  $$('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
  $$('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  $$('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
}

const defaults = {
  settings: {
    theme: 'auto',
    font: 'sans',
    size: 'm',
    width: 'normal',
    leading: 'normal',
    focus: false,
    lang: 'en',
  },
  bookmarks: [],
  read: {},
  progress: {},
  last: null,
};

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!parsed) return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...parsed,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
    };
  } catch {
    return structuredClone(defaults);
  }
}

const state = loadState();

let saveTimer = null;
function persist(immediate = false) {
  const write = () => {
    saveTimer = null;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* private mode or full quota — reading still works, we just forget. */
    }
  };
  if (immediate) {
    clearTimeout(saveTimer);
    write();
  } else if (!saveTimer) {
    saveTimer = setTimeout(write, 500);
  }
}

/* -------------------------------------------------------------- preferences */

const mqlDark = window.matchMedia('(prefers-color-scheme: dark)');
const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
let book = null;

function applySettings() {
  const root = document.documentElement;
  const s = state.settings;
  const resolved =
    s.theme === 'auto' ? (mqlDark.matches ? 'dark' : 'light') : s.theme;

  root.dataset.theme = resolved;
  root.dataset.font = s.font;
  root.dataset.size = s.size;
  root.dataset.width = s.width;
  root.dataset.leading = s.leading;
  document.body.dataset.focus = String(!!s.focus);

  /* `dir` on <html> is what flips the whole layout: grid columns, flex rows and
     every logical property follow it. Code blocks carry their own dir="ltr". */
  root.lang = lang;
  root.dir = directionOf(lang);
  applyStaticStrings();

  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#080a0f' : '#ffffff');

  $$('[data-setting]').forEach((group) => {
    const key = group.dataset.setting;
    $$('button', group).forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.value === String(s[key]))),
    );
  });

  const themeBtn = $('#themeToggle');
  if (themeBtn) {
    const next = resolved === 'dark' ? 'light' : 'dark';
    themeBtn.setAttribute(
      'aria-label',
      t('topbar.theme', { theme: t(`topbar.theme.${next}`) }),
    );
    themeBtn.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon');
  }

  const hint = $('#searchShortcut');
  if (hint) hint.textContent = isMac ? '⌘K' : 'Ctrl K';

  renderLanguageUI();

  const focusBtn = $('#focusModeToggle');
  if (focusBtn) focusBtn.setAttribute('aria-pressed', String(!!s.focus));
}

/** Single source of truth for focus mode, used by the topbar, sheet and pill. */
function setFocus(value) {
  state.settings.focus = !!value;
  applySettings();
  persist(true);
}

mqlDark.addEventListener('change', () => {
  if (state.settings.theme === 'auto') applySettings();
});

/* ------------------------------------------------------------------ chapter */

/* The tags the stats strip knows how to label. Named differently from md.js's
   list because the portable build joins both modules into one scope. */
const STATS_TAGS = ['tip', 'warn', 'note', 'perf', 'interview', 'recap'];

/** "Part I — C# Foundations" and "بخش اول — مبانی زبان" split the same way. */
function splitPartTitle(title) {
  const text = String(title || '').trim() || t('chapter.notes');
  const m = /^(.*?)\s+[—–-]\s+(.+)$/.exec(text);
  if (m) return { kicker: m[1], name: m[2] };
  return { kicker: t('chapter.part'), name: text };
}

function chapterHeaderHTML(chapter) {
  const { kicker, name } = splitPartTitle(chapter.partTitle);
  const chips = [
    `<span class="meta-chip" data-kind="code">${icon('clock')}${escapeHtml(
      t('chapter.minutes', { n: chapter.minutes }),
    )}</span>`,
  ];
  if (chapter.stats.code) {
    chips.push(
      `<span class="meta-chip" data-kind="code">${icon('code')}${escapeHtml(
        t('chapter.code', { n: chapter.stats.code }),
      )}</span>`,
    );
  }
  for (const [tag, count] of Object.entries(chapter.stats.callouts)) {
    if (!STATS_TAGS.includes(tag)) continue;
    chips.push(
      `<span class="meta-chip" data-kind="${tag}">${icon(tag)}${escapeHtml(
        t(`chapter.${tag}`, { n: count }),
      )}</span>`,
    );
  }

  const banner = chapter.isPartStart
    ? `<div class="part-banner">
        <p class="part-kicker">${escapeHtml(kicker)}</p>
        <h2>${escapeHtml(name)}</h2>
        ${chapter.partDescription ? `<p>${escapeHtml(chapter.partDescription)}</p>` : ''}
      </div>`
    : '';

  const isRead = !!state.read[chapter.id];
  const isStarred = state.bookmarks.includes(chapter.id);

  return `${banner}
  <header class="chapter-head">
    <div class="eyebrow">
      <span>${escapeHtml(chapter.partTitle || t('chapter.notes'))}</span>
      <span class="sep">/</span>
      <span>${escapeHtml(
        chapter.number ? t('chapter.label', { n: chapter.number }) : t('chapter.overview'),
      )}</span>
    </div>
    <h1 id="chapter-title">${chapter.titleHtml}</h1>
    <div class="chapter-meta">
      ${chips.join('')}
      <button class="read-toggle" type="button" id="readToggle" aria-pressed="${isRead}">
        ${icon('check')}<span>${isRead ? t('chapter.read') : t('chapter.markRead')}</span>
      </button>
      <button class="read-toggle" type="button" id="starToggle" aria-pressed="${isStarred}">
        ${icon('star')}<span>${isStarred ? t('chapter.bookmarked') : t('chapter.bookmark')}</span>
      </button>
    </div>
  </header>`;
}

function chapterFootHTML(index) {
  const prev = book.chapters[index - 1];
  const next = book.chapters[index + 1];
  const btn = (c, dir) => {
    if (!c) return `<div class="foot-btn" data-empty="true" data-dir="${dir}"></div>`;
    const label = t(dir === 'prev' ? 'foot.previous' : 'foot.next');
    const numbered = c.number ? ` · ${escapeHtml(t('chapter.label', { n: c.number }))}` : '';
    return `<a class="foot-btn" data-dir="${dir}" href="#/${c.id}" data-navlink>
      <span class="dir">${escapeHtml(label)}${numbered}</span>
      <span class="to">${escapeHtml(c.title)}</span>
    </a>`;
  };
  return `<footer class="chapter-foot"><div class="foot-row">${btn(prev, 'prev')}${btn(
    next,
    'next',
  )}</div></footer>`;
}

function chapterHTML(chapter, { footer = true } = {}) {
  return `${chapterHeaderHTML(chapter)}
  <div class="chapter-body">${chapter.html}</div>
  ${footer ? chapterFootHTML(chapter.index) : ''}`;
}

/* ------------------------------------------------------------------- sidebar */

function renderSidebar() {
  if (!book || !els.nav) return;

  const groups = book.parts.map((part) => {
    const items = part.chapterIndexes
      .map((i) => book.chapters[i])
      .filter(Boolean)
      .map((chapter) => navItemHTML(chapter))
      .join('');
    return `<nav class="nav-group" aria-label="${escapeHtml(part.title)}">
      <p class="nav-group-label"><span class="dot"></span>${escapeHtml(part.title)}</p>
      <ul class="nav-list">${items}</ul>
    </nav>`;
  });

  els.nav.innerHTML =
    `<div class="sidebar-head"><h2>${escapeHtml(t('sidebar.contents'))}</h2>` +
    `<span class="sidebar-count">${escapeHtml(
      t('sidebar.chapters', { n: book.chapters.length }),
    )}</span></div>` +
    groups.join('');
  renderBookmarks();
  renderResume();
  updateProgressUI();
}

/**
 * One sidebar row: the chapter link plus its own controls.
 * The buttons are siblings of the anchor, never nested inside it — a button
 * inside an <a> is invalid markup and its clicks get swallowed by the link.
 */
function navItemHTML(chapter) {
  const read = !!state.read[chapter.id];
  const starred = state.bookmarks.includes(chapter.id);
  const title = escapeHtml(chapter.title);
  const readTitle = read ? t('nav.markUnread') : t('nav.markRead');
  const starTitle = starred ? t('nav.removeBookmark') : t('nav.addBookmark');
  return `<li class="nav-row" data-chapter="${chapter.id}" data-current="false"
      data-read="${read}" data-starred="${starred}">
    <a class="nav-item" href="#/${chapter.id}" data-navlink data-chapter="${chapter.id}"
       title="${title}">
      <span class="nav-num">${escapeHtml(String(chapter.number ?? '·'))}</span>
      <span class="nav-title">${title}</span>
    </a>
    <span class="nav-acts">
      <button class="nav-act nav-act-read" type="button" data-mark-read="${chapter.id}"
        aria-pressed="${read}" title="${escapeHtml(readTitle)}"
        aria-label="${escapeHtml(
          t(read ? 'nav.markUnreadOf' : 'nav.markReadOf', { title: chapter.title }),
        )}">${icon('checkCircle')}</button>
      <button class="nav-act nav-act-star" type="button" data-star="${chapter.id}"
        aria-pressed="${starred}" title="${escapeHtml(starTitle)}"
        aria-label="${escapeHtml(
          t(starred ? 'nav.removeBookmarkOf' : 'nav.addBookmarkOf', { title: chapter.title }),
        )}">${icon('star')}</button>
    </span>
  </li>`;
}

function renderBookmarks() {
  if (!els.bookmarksSlot) return;
  const marked = state.bookmarks
    .map((id) => book.chapters.find((c) => c.id === id))
    .filter(Boolean);
  els.bookmarksSlot.innerHTML = marked.length
    ? `<nav class="nav-group" aria-label="${escapeHtml(t('sidebar.bookmarks'))}">
        <p class="nav-group-label"><span class="dot"></span>${escapeHtml(
          t('sidebar.bookmarks'),
        )}</p>
        <ul class="nav-list">${marked.map((c) => navItemHTML(c)).join('')}</ul>
      </nav>`
    : '';
  markActiveNav(current?.id);
}

function renderResume() {
  if (!els.resumeSlot) return;
  const last = state.last;
  const chapter = last ? book.chapters.find((c) => c.id === last.chapterId) : null;
  if (!chapter || (last.ratio || 0) < 0.03) {
    els.resumeSlot.innerHTML = '';
    return;
  }
  const pct = Math.min(99, Math.round((last.ratio || 0) * 100));
  els.resumeSlot.innerHTML = `<button class="resume-card" type="button" data-resume="${chapter.id}">
    ${icon('bookmark')}
    <span style="min-width:0">
      <small>${escapeHtml(t('sidebar.continue'))}</small>
      <strong>${escapeHtml(chapter.title)}</strong>
    </span>
    <span class="sidebar-count" style="margin-inline-start:auto">${pct}%</span>
  </button>`;
}

function updateProgressUI() {
  const total = book.chapters.length || 1;
  const done = book.chapters.filter((c) => state.read[c.id]).length;
  const pct = Math.round((done / total) * 100);
  if (els.progressLabel) els.progressLabel.textContent = t('sidebar.complete', { pct });
  if (els.progressFillMini) els.progressFillMini.style.width = `${pct}%`;
  if (els.readLabel) els.readLabel.textContent = t('sidebar.read', { done, total });

  $$('.nav-row[data-chapter]').forEach((row) => {
    const id = row.dataset.chapter;
    const read = !!state.read[id];
    const starred = state.bookmarks.includes(id);
    const title = row.querySelector('.nav-title')?.textContent || '';
    row.dataset.read = String(read);
    row.dataset.starred = String(starred);

    const readBtn = row.querySelector('.nav-act-read');
    if (readBtn) {
      readBtn.setAttribute('aria-pressed', String(read));
      readBtn.title = read ? t('nav.markUnread') : t('nav.markRead');
      readBtn.setAttribute('aria-label', t(read ? 'nav.markUnreadOf' : 'nav.markReadOf', { title }));
    }
    const starBtn = row.querySelector('.nav-act-star');
    if (starBtn) starBtn.setAttribute('aria-pressed', String(starred));
  });
}

/** Single source of truth for marking a chapter read or unread. */
function setRead(id, value, { announce = true } = {}) {
  if (value) state.read[id] = true;
  else delete state.read[id];
  persist(true);
  updateProgressUI();

  if (current?.id === id) {
    const toggle = $('#readToggle');
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(value));
      const label = toggle.querySelector('span');
      if (label) label.textContent = value ? t('chapter.read') : t('chapter.markRead');
    }
  }
  if (announce) toast(value ? t('toast.read') : t('toast.unread'), 'ok');
}

/* ------------------------------------------------------------------ routing */

let current = null;

function parseHash() {
  const raw = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
  const [chapterId, sectionId] = raw.split('/');
  return { chapterId: chapterId || null, sectionId: sectionId || null };
}

function route() {
  if (!book) return;
  const { chapterId, sectionId } = parseHash();
  let chapter = book.chapters.find((c) => c.id === chapterId);

  if (!chapter) {
    chapter = book.chapters[0];
    if (!chapter) return;
    if (location.hash) history.replaceState(null, '', `#/${chapter.id}`);
  }

  const changed = !current || current.id !== chapter.id;
  if (changed) renderChapter(chapter);

  if (sectionId) {
    scrollToSection(sectionId, { smooth: !changed });
    return;
  }

  if (changed) {
    const saved = state.progress[chapter.id] || 0;
    const resuming = state.last?.chapterId === chapter.id;
    if (resuming && saved > 0.04 && saved < 0.97) scrollToRatio(saved);
    else scrollToTop();
  }
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

window.addEventListener('hashchange', route);

function withoutSmooth(fn) {
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  fn();
  root.style.scrollBehavior = prev;
}

const scrollToTop = () => withoutSmooth(() => window.scrollTo({ top: 0 }));

function scrollToRatio(ratio) {
  withoutSmooth(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.max(0, max * ratio) });
  });
}

function scrollToSection(id, { smooth = true } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
  setActiveSection(id);
  el.animate?.(
    [
      { backgroundColor: 'transparent' },
      { backgroundColor: 'var(--accent-soft)' },
      { backgroundColor: 'transparent' },
    ],
    { duration: 1100, easing: 'ease-out' },
  );
}

/* ------------------------------------------------------------ chapter render */

function renderChapter(chapter) {
  current = chapter;
  activeSectionId = null;
  document.title = `${chapter.title} · ${book.title}`;
  els.article.innerHTML = chapterHTML(chapter);
  els.article.dataset.chapterId = chapter.id;
  buildRail(chapter);
  markActiveNav(chapter.id);
  updateStarButton();
}

function markActiveNav(id) {
  $$('.nav-item[data-chapter]').forEach((el) =>
    el.dataset.chapter === id
      ? el.setAttribute('aria-current', 'page')
      : el.removeAttribute('aria-current'),
  );
  $$('.nav-row[data-chapter]').forEach((row) => {
    row.dataset.current = String(row.dataset.chapter === id);
  });
}

function buildRail(chapter) {
  if (!els.railList) return;
  els.railList.innerHTML = chapter.headings.length
    ? chapter.headings
        .map(
          (h) => `<li><a class="rail-link" href="#/${chapter.id}/${h.id}"
            data-navlink data-level="${h.level}">${escapeHtml(h.text)}</a></li>`,
        )
        .join('')
    : `<li class="rail-empty">${escapeHtml(t('rail.empty'))}</li>`;
}

let activeSectionId = null;

function setActiveSection(id) {
  if (activeSectionId === id) return;
  activeSectionId = id;
  $$('.rail-link', els.rail).forEach((a) => {
    if (a.getAttribute('href').endsWith(`/${id}`)) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  if (current && history.replaceState && location.hash !== `#/${current.id}/${id}`) {
    history.replaceState(null, '', `#/${current.id}/${id}`);
  }
}

function updateStarButton() {
  if (!current) return;
  const starred = state.bookmarks.includes(current.id);
  const head = $('#starToggle');
  if (head) {
    head.setAttribute('aria-pressed', String(starred));
    const label = head.querySelector('span');
    if (label) label.textContent = starred ? t('chapter.bookmarked') : t('chapter.bookmark');
  }
  const top = $('#navStar');
  if (top) top.setAttribute('aria-pressed', String(starred));
}

/* ---------------------------------------------------------- scroll + progress */

let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    if (els.progressFill) els.progressFill.style.width = `${ratio * 100}%`;
    if (els.progressTrack) {
      els.progressTrack.dataset.active = String(
        window.scrollY > 40 && (current?.html?.length || 0) > 1200,
      );
    }
    if (els.fab) els.fab.dataset.visible = String(window.scrollY > 700);

    if (current) {
      state.progress[current.id] = ratio;
      state.last = { chapterId: current.id, ratio, at: Date.now() };

      /* Mark as read only when the end of *this* chapter is genuinely on screen.
         Measuring the chapter footer instead of a scroll percentage keeps the
         state honest when the document height changes mid-swap. */
      const foot = els.article?.querySelector('.chapter-foot');
      const atEnd =
        !!foot &&
        max > 200 &&
        foot.getBoundingClientRect().top <= window.innerHeight - 24;
      if (atEnd && !state.read[current.id]) {
        state.read[current.id] = true;
        const toggle = $('#readToggle');
        if (toggle) {
          toggle.setAttribute('aria-pressed', 'true');
          const label = toggle.querySelector('span');
          if (label) label.textContent = 'Read';
        }
        updateProgressUI();
      }
    }

    updateSpy();
    persist();
  });
}

function updateSpy() {
  if (!current || !current.headings.length) return;
  /* Activate a section once its heading crosses the upper quarter of the
     viewport, which tracks what the reader is actually looking at. */
  const line = Math.min(Math.max(96, window.innerHeight * 0.22), 260);
  let active = current.headings[0].id;
  for (const h of current.headings) {
    const el = document.getElementById(h.id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= line) active = h.id;
    else break;
  }
  setActiveSection(active);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });

/* -------------------------------------------------------------------- search */

let index = [];

/** "Chapter 26 · Part IV — Practice" in whichever language is being read. */
function chapterTitleOf(chapter) {
  const label = chapter.number ? t('chapter.label', { n: chapter.number }) : '';
  return label ? `${label} · ${chapter.partTitle}` : chapter.partTitle;
}

function buildIndex() {
  index = [];
  for (const chapter of book.chapters) {
    const parts = (chapter.textParts || []).map(fold);
    const headings = chapter.headings || [];
    const consumed = new Set();

    headings.forEach((h, i) => {
      let end = parts.length;
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= h.level) {
          end = headings[j].textIndex;
          break;
        }
      }
      const start = (h.textIndex ?? 0) + 1;
      const body = parts.slice(start, Math.max(start, end)).join(' ');

      if (h.textIndex !== undefined) consumed.add(h.textIndex);
      index.push({
        kind: 'section',
        chapterId: chapter.id,
        sectionId: h.id,
        where: chapterTitleOf(chapter),
        /* Folded for matching *and* for display: every replacement is a
           character-for-character normalisation, so highlights and snippets
           slice the same string they matched. */
        title: fold(h.text),
        text: fold(`${h.text} ${body}`).replace(/\s+/g, ' ').trim(),
      });
    });

    const preamble = parts
      .map((t, i) => (consumed.has(i) ? '' : t))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (preamble) {
      index.push({
        kind: 'chapter',
        chapterId: chapter.id,
        sectionId: null,
        where: chapter.partTitle,
        title: fold(chapter.title),
        text: fold(`${chapter.title} ${preamble}`).trim(),
      });
    }
  }
}

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termsOf(query) {
  return fold(query)
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function search(query) {
  const terms = termsOf(query);
  if (!terms.length) return [];

  const results = [];
  for (const record of index) {
    const haystack = record.text.toLowerCase();
    let matches = 0;
    for (const term of terms) {
      if (!haystack.includes(term)) {
        matches = -1;
        break;
      }
      matches += 1;
    }
    if (matches < 0) continue;

    let score = 0;
    const title = record.title.toLowerCase();
    for (const term of terms) {
      if (title.includes(term)) score += 45;
      if (title.startsWith(term)) score += 25;
      const count = haystack.split(term).length - 1;
      score += Math.min(count, 6) * 3;
    }
    if (record.kind === 'chapter') score += 4;
    results.push({ ...record, score });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return results.slice(0, 40);
}

function mark(text, terms) {
  let out = escapeHtml(text);
  for (const term of terms) {
    if (!term) continue;
    out = out.replace(new RegExp(`(${reEscape(escapeHtml(term))})`, 'gi'), '<mark>$1</mark>');
  }
  return out;
}

function snippet(text, terms, radius = 88) {
  const lower = text.toLowerCase();
  let at = -1;
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) at = 0;
  const start = Math.max(0, at - radius);
  const end = Math.min(text.length, at + radius);
  return mark(
    (start > 0 ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : ''),
    terms,
  );
}

let activeResult = 0;

function renderSearch(query) {
  if (!els.searchResults) return;
  const terms = termsOf(query);
  if (!terms.length) {
    els.searchResults.innerHTML = defaultSuggestions();
    els.searchFoot.hidden = true;
    activeResult = 0;
    return;
  }

  const results = search(query);
  els.searchFoot.hidden = false;

  if (!results.length) {
    els.searchResults.innerHTML = `<div class="palette-empty">${t('search.none', {
      q: escapeHtml(query),
    })}</div>`;
    return;
  }

  els.searchResults.innerHTML = results
    .map((r, i) => {
      const href = r.sectionId ? `#/${r.chapterId}/${r.sectionId}` : `#/${r.chapterId}`;
      return `<a class="result" href="${href}" data-navlink data-result="${i}"
        data-active="${i === 0}" data-chapter="${r.chapterId}" data-section="${r.sectionId || ''}">
        <span class="result-top">
          <span class="result-kind">${escapeHtml(
            t(r.kind === 'section' ? 'search.section' : 'search.chapter'),
          )}</span>
          <span class="result-title">${mark(r.title, terms)}</span>
          <span class="result-where">${escapeHtml(r.where || '')}</span>
        </span>
        <span class="result-snippet">${snippet(r.text, terms)}</span>
      </a>`;
    })
    .join('');

  activeResult = 0;
}

function defaultSuggestions() {
  const look = (ids) => ids.map((id) => book.chapters.find((c) => c.id === id)).filter(Boolean);
  const bookmarked = look(state.bookmarks);
  const recent = look(
    Object.entries(state.progress)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id),
  );
  const section = (label, chapters) =>
    chapters.length
      ? `<p class="palette-group">${label}</p>` +
        chapters
          .map(
            (c) => `<a class="result" href="#/${c.id}" data-navlink data-result="-1" data-chapter="${c.id}">
          <span class="result-top"><span class="result-title">${escapeHtml(c.title)}</span></span>
          <span class="result-snippet">${escapeHtml(c.partTitle)} · ${escapeHtml(
            t('chapter.minutesShort', { n: c.minutes }),
          )}</span>
        </a>`,
          )
          .join('')
      : '';

  const unread = book.chapters.filter((c) => !state.read[c.id]).slice(0, 4);
  return (
    section(t('search.bookmarks'), bookmarked) +
      section(t('search.recent'), recent) +
      section(t('search.upNext'), unread) ||
    `<div class="palette-empty">${t('search.empty')}</div>`
  );
}

function openSearch(prefill = '') {
  if (!els.searchOverlay || !els.searchInput) return;
  els.searchOverlay.dataset.open = 'true';
  document.body.dataset.modal = 'open';
  els.searchInput.value = prefill;
  renderSearch(prefill);
  requestAnimationFrame(() => els.searchInput.focus());
}

const searchOpen = () => els.searchOverlay?.dataset.open === 'true';

function closeSearch() {
  if (els.searchOverlay) els.searchOverlay.dataset.open = 'false';
  if (!settingsOpen) document.body.dataset.modal = '';
}

function moveActive(delta) {
  const items = $$('.result[data-result]:not([data-result="-1"])', els.searchResults);
  if (!items.length) return;
  activeResult = (activeResult + delta + items.length) % items.length;
  items.forEach((el, i) => {
    if (i === activeResult) el.dataset.active = 'true';
    else el.removeAttribute('data-active');
  });
  items[activeResult].scrollIntoView({ block: 'nearest' });
}

/* --------------------------------------------------------------- interaction */

function toggleBookmark(id) {
  const i = state.bookmarks.indexOf(id);
  if (i === -1) state.bookmarks.push(id);
  else state.bookmarks.splice(i, 1);
  persist(true);
  renderBookmarks();
  updateProgressUI();
  updateStarButton();
  toast(i === -1 ? t('toast.added') : t('toast.removed'), 'ok');
}

async function copyText(text, button, { announce = true } = {}) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
    } catch {
      /* ignore */
    }
    area.remove();
  }

  if (button?.classList.contains('code-copy')) {
    const label = button.querySelector('span');
    button.dataset.copied = 'true';
    if (label) label.textContent = t('code.copied');
    setTimeout(() => {
      button.dataset.copied = 'false';
      if (label) label.textContent = t('code.copy');
    }, 1600);
  }
  if (announce) toast(t('toast.copied'), 'ok');
}

document.addEventListener('click', (event) => {
  const target = event.target;

  const navLink = target.closest('[data-navlink]');
  if (navLink) {
    const href = navLink.getAttribute('href');
    if (href?.startsWith('#')) {
      event.preventDefault();
      go(href);
      closeNav();
      closeSearch();
      if (href.includes('/') && href.split('/').length > 2) {
        const id = href.split('/').pop();
        setTimeout(() => scrollToSection(id, { smooth: false }), 30);
      }
      return;
    }
  }

  // A click anywhere on the search backdrop — the dim area or its padding on
  // touch — closes the palette. Clicks inside the palette itself are ignored.
  if (target.closest('#searchOverlay') && !target.closest('.palette')) {
    closeSearch();
    return;
  }

  const markRead = target.closest('[data-mark-read]');
  if (markRead) {
    event.preventDefault();
    event.stopPropagation();
    const id = markRead.dataset.markRead;
    setRead(id, !state.read[id]);
    return;
  }

  const star = target.closest('[data-star]');
  if (star) {
    event.preventDefault();
    event.stopPropagation();
    toggleBookmark(star.dataset.star);
    return;
  }

  const resume = target.closest('[data-resume]');
  if (resume) {
    event.preventDefault();
    go(`#/${resume.dataset.resume}`);
    closeNav();
    return;
  }

  const copy = target.closest('[data-copy]');
  if (copy) {
    event.preventDefault();
    const block = copy.closest('.code-block');
    copyText(block?.querySelector('code')?.textContent ?? '', copy);
    return;
  }

  const anchor = target.closest('[data-anchor]');
  if (anchor) {
    event.preventDefault();
    const id = anchor.getAttribute('href').slice(1);
    copyText(`${location.origin}${location.pathname}#/${current?.id}/${id}`, null, {
      announce: false,
    });
    go(`#/${current?.id}/${id}`);
    toast(t('toast.link'), 'ok');
    return;
  }

  if (target.closest('#readToggle') && current) {
    setRead(current.id, !state.read[current.id]);
    return;
  }

  if ((target.closest('#starToggle') || target.closest('#navStar')) && current) {
    toggleBookmark(current.id);
    return;
  }

  if (target.closest('#fab')) {
    scrollToTop();
    return;
  }

  if (target.closest('#menuToggle')) {
    document.body.dataset.nav = 'open';
    return;
  }
  if (target.closest('#scrim')) {
    closeNav();
    return;
  }
  if (target.closest('[data-close-search]')) {
    closeSearch();
    return;
  }
  if (target.closest('#searchTrigger')) {
    openSearch();
    return;
  }
  if (target.closest('#themeToggle')) {
    state.settings.theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applySettings();
    persist(true);
    return;
  }
  if (target.closest('#settingsToggle')) {
    settingsOpen ? closeSettings() : openSettings();
    return;
  }
  if (target.closest('#focusModeToggle') || target.closest('#focusExit')) {
    setFocus(!state.settings.focus);
    return;
  }
  if (target.closest('#printBtn')) {
    printBook();
    return;
  }
  if (target.closest('#resetBtn')) {
    state.settings = structuredClone(defaults.settings);
    applySettings();
    persist(true);
    toast(t('toast.reset'), 'ok');
    return;
  }

  const langBtn = target.closest('[data-lang]');
  if (langBtn) {
    switchLanguage(langBtn.dataset.lang);
    return;
  }
  if (target.closest('#langToggle')) {
    const other = availableLanguages().find(([code]) => code !== lang);
    if (other) switchLanguage(other[0]);
    return;
  }

  const segBtn = target.closest('[data-setting] button');
  if (segBtn) {
    const key = segBtn.closest('[data-setting]').dataset.setting;
    let value = segBtn.dataset.value;
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    state.settings[key] = value;
    applySettings();
    persist(true);
    return;
  }

  if (
    settingsOpen &&
    !target.closest('#settingsSheet') &&
    !target.closest('#settingsToggle')
  ) {
    closeSettings();
  }
});

function closeNav() {
  document.body.dataset.nav = '';
}

let settingsOpen = false;
function openSettings() {
  settingsOpen = true;
  if (els.settingsSheet) els.settingsSheet.dataset.open = 'true';
  document.body.dataset.modal = 'open';
}
function closeSettings() {
  settingsOpen = false;
  if (els.settingsSheet) els.settingsSheet.dataset.open = 'false';
  if (!searchOpen()) document.body.dataset.modal = '';
}

/* -------------------------------------------------------------------- toasts */

function toast(message, kind = '') {
  if (!els.toasts) return;
  const el = document.createElement('div');
  el.className = 'toast';
  if (kind) el.dataset.kind = kind;
  el.innerHTML = `${kind === 'ok' ? icon('check') : ''}<span>${escapeHtml(message)}</span>`;
  els.toasts.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
  }, 1900);
  setTimeout(() => el.remove(), 2150);
}

/* ------------------------------------------------------------------ keyboard */

/**
 * Shortcut matching that survives a non-English keyboard layout.
 *
 * `event.key` carries whatever the active layout produces, so on a Persian,
 * Arabic, Greek or Cyrillic layout the physical "[" key never reports "[" and
 * the shortcut silently dies. `event.code` identifies the physical key and is
 * layout independent, so match on that first and keep `event.key` as a fallback
 * for anything that reports no code.
 */
function isKey(event, code, key) {
  return event.code === code || event.key === key;
}

function stepChapter(delta) {
  if (!current) return;
  const next = book.chapters[current.index + delta];
  if (next) go(`#/${next.id}`);
}

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const typing =
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable;
  const meta = event.metaKey || event.ctrlKey;
  const code = event.code || '';

  if (meta && (code === 'KeyK' || event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    openSearch();
    return;
  }

  if (isKey(event, 'Escape', 'Escape')) {
    if (searchOpen()) return closeSearch();
    if (settingsOpen) return closeSettings();
    if (document.body.dataset.nav === 'open') return closeNav();
    if (state.settings.focus) setFocus(false);
    return;
  }

  if (searchOpen()) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      $('.result[data-active="true"]', els.searchResults)?.click();
    }
    return;
  }

  if (typing || meta || event.altKey) return;

  if (isKey(event, 'Slash', '/')) {
    event.preventDefault();
    openSearch();
  } else if (isKey(event, 'BracketLeft', '[')) {
    event.preventDefault();
    stepChapter(-1);
  } else if (isKey(event, 'BracketRight', ']')) {
    event.preventDefault();
    stepChapter(1);
  } else if (isKey(event, 'KeyJ', 'j')) {
    window.scrollBy({ top: 220, behavior: 'smooth' });
  } else if (isKey(event, 'KeyK', 'k')) {
    window.scrollBy({ top: -220, behavior: 'smooth' });
  } else if (isKey(event, 'KeyT', 't')) {
    state.settings.theme =
      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applySettings();
    persist(true);
  } else if (isKey(event, 'KeyF', 'f')) {
    setFocus(!state.settings.focus);
  } else if (isKey(event, 'KeyS', 's')) {
    if (current) toggleBookmark(current.id);
  } else if (isKey(event, 'KeyG', 'g')) {
    scrollToTop();
  }
});

/* ------------------------------------------------------------- print / export */

function printBook() {
  if (!els.printAll) return;

  // Render the whole handbook once, then let the print stylesheet lay it out.
  // The reader forces a light document for print, so this produces white pages
  // with dark ink whether the reader is in light or dark mode.
  els.printAll.innerHTML = book.chapters
    .map((chapter) => `<article class="chapter">${chapterHTML(chapter, { footer: false })}</article>`)
    .join('');
  document.body.dataset.printAll = 'true';

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.dataset.printAll = 'false';
    els.printAll.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
    window.removeEventListener('focus', onFocus);
  };

  /*
   * Deliberately no timeout here. A timer that fires while the print dialog is
   * still open empties #printAll underneath the preview, so a slow decision
   * (choosing "Save as PDF", picking a page range) prints blank pages.
   * `afterprint` is the event that means the dialog really closed; the focus
   * fallback covers browsers that skip it, and a stale hidden div is harmless.
   */
  const onFocus = () => setTimeout(cleanup, 500);
  window.addEventListener('afterprint', cleanup);
  window.addEventListener('focus', onFocus, { once: true });
  setTimeout(() => window.print(), 60);
}

/* ----------------------------------------------------------------------- boot */

els.searchInput?.addEventListener('input', (e) => renderSearch(e.target.value));
els.searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') e.preventDefault();
});

function renderBootMessage(title, body, code) {
  if (!els.boot) return;
  document.body.dataset.focus = 'false';
  els.app.hidden = true;
  els.boot.hidden = false;
  els.boot.className = 'boot';
  els.boot.innerHTML = `<div class="boot-card">
    <div class="brand-mark">&lt;/&gt;</div>
    <h1>${escapeHtml(title)}</h1>
    ${body}
    ${code ? `<pre>${escapeHtml(code)}</pre>` : ''}
  </div>`;
}

/* ---------------------------------------------------------------- languages */

/** The whole manifest: from notes.json, or already inlined in the portable build. */
let manifest = null;

async function loadManifest() {
  if (window.__NOTES_SOURCE__) return window.__NOTES_SOURCE__;
  const res = await fetch(new URL('notes.json', document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`notes.json could not be read (HTTP ${res.status}).`);
  return res.json();
}

/**
 * The manifest's language map. Notes written before the reader was bilingual
 * have a flat `files` list and no `languages` key; that shape is adopted here as
 * English, so an older notes.json keeps working untouched.
 */
function languagesOf(source) {
  const declared = source && source.languages;
  if (declared && Object.keys(declared).length) return declared;
  return { en: { label: 'English', dir: 'ltr', files: (source && source.files) || [] } };
}

/**
 * Note files for one language. The portable build ships them inline as
 * `{ name, text }`, so nothing is fetched there; the hosted reader fetches each
 * file, which is what makes editing a note and refreshing enough to see it.
 */
async function materialiseFiles(files) {
  return Promise.all(
    (files || []).map(async (entry) => {
      if (entry && typeof entry === 'object' && typeof entry.text === 'string') return entry;
      const name = typeof entry === 'string' ? entry : entry.file;
      const res = await fetch(new URL(name, document.baseURI), { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${name} could not be read (HTTP ${res.status}).`);
      return { name, text: await res.text() };
    }),
  );
}

async function loadBook(code) {
  const languages = languagesOf(manifest);
  const entry = languages[code] || languages.en || Object.values(languages)[0];
  const files = await materialiseFiles(entry.files);
  return buildBook({
    title: manifest.title,
    subtitle: manifest.subtitle,
    files,
    labels: {
      copy: t('code.copy'),
      copyCode: t('code.copyLabel'),
      table: t('a11y.table'),
      code: t('code.lang'),
      start: t('sidebar.start'),
    },
  });
}

function availableLanguages() {
  return Object.entries(languagesOf(manifest)).filter(([, entry]) => (entry.files || []).length);
}

/**
 * The topbar pill and the settings row are both built from the manifest, so
 * adding `Assets/de/` and a label is all it takes to offer a third language.
 * With a single language the pill stays hidden.
 */
function renderLanguageUI() {
  if (!manifest) return;
  const available = availableLanguages();

  const pill = $('#langToggle');
  if (pill) {
    if (available.length > 1) {
      const other = available.find(([code]) => code !== lang) || available[0];
      pill.hidden = false;
      pill.dataset.lang = other[0];
      pill.setAttribute('title', t('lang.change'));
      pill.setAttribute('aria-label', t('lang.change'));
      pill.innerHTML = `${icon('globe')}<span>${escapeHtml(other[1].label || other[0])}</span>`;
    } else {
      pill.hidden = true;
    }
  }

  const block = $('#langBlock');
  if (block) block.hidden = available.length < 2;

  const row = $('#langRow');
  if (row) {
    const seg = row.querySelector('.seg');
    if (seg) {
      seg.innerHTML = available
        .map(
          ([code, entry]) =>
            `<button type="button" data-lang="${escapeHtml(code)}" aria-pressed="${
              code === lang
            }">${escapeHtml(entry.label || code)}</button>`,
        )
        .join('');
    }
  }
}

/**
 * Switches language without a page reload.
 *
 * Chapters are addressed by number, so the same URL means the same chapter in
 * every language — which is what lets this keep the reader exactly where they
 * were: same chapter, same section, same scroll position, and the progress and
 * bookmarks they had already made.
 */
async function switchLanguage(code) {
  const available = availableLanguages();
  if (code === lang || !available.some(([c]) => c === code)) return;

  const keepNumber = current ? current.number : null;
  const keepSection =
    current && activeSectionId ? current.headings.findIndex((h) => h.id === activeSectionId) : -1;

  lang = code;
  state.settings.lang = code;
  persist(true);
  document.documentElement.lang = lang;
  document.documentElement.dir = directionOf(lang);

  try {
    book = await loadBook(lang);
  } catch (error) {
    console.error(error);
    toast(error && error.message ? error.message : t('boot.error.unknown'), 'bad');
    return;
  }

  document.title = book.title;
  if (els.brandTitle) els.brandTitle.textContent = book.title;
  if (els.brandSub) els.brandSub.textContent = book.subtitle || '';

  applyStaticStrings();
  renderLanguageUI();
  renderSidebar();
  buildIndex();

  const target =
    (keepNumber !== null && book.chapters.find((c) => c.number === keepNumber)) ||
    book.chapters[0];
  if (!target) return;

  renderChapter(target);
  markActiveNav(target.id);
  history.replaceState(null, '', `#/${target.id}`);

  if (keepSection >= 0 && target.headings[keepSection]) {
    scrollToSection(target.headings[keepSection].id, { smooth: false });
  } else {
    const saved = state.progress[target.id] || 0;
    if (saved > 0.04 && saved < 0.97) scrollToRatio(saved);
    else scrollToTop();
  }
  updateProgressUI();
  updateStarButton();
}

async function registerServiceWorker() {
  if (window.__NOTES_SOURCE__) return;
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    // Drop registrations left behind by an older location of this file, so a
    // moved service worker can never keep serving a stale, narrow scope.
    const wanted = new URL('sw.js', document.baseURI).href;
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
      const worker =
        registration.active || registration.installing || registration.waiting;
      if (worker?.scriptURL && worker.scriptURL !== wanted) {
        await registration.unregister();
      }
    }
    // Registered at the root (not in reader/) so it can cache notes.json and
    // every file in Assets/ for genuine offline reading.
    await navigator.serviceWorker.register('sw.js');
  } catch {
    /* Offline support is a bonus; never let it break the reader. */
  }
}

/** Reload the page when a note file changes, while keeping the reading position. */
function liveReload() {
  if (window.__NOTES_SOURCE__ || location.protocol === 'file:') return;
  if (!('EventSource' in window)) return;

  let stream = null;
  const connect = () => {
    try {
      stream = new EventSource(new URL('__live', document.baseURI));
    } catch {
      return;
    }
    stream.addEventListener('message', (event) => {
      if (event.data !== 'reload') return;
      // The position is in localStorage, so the reload lands where you were.
      persist(true);
      location.reload();
    });
    stream.addEventListener('error', () => {
      stream.close();
      setTimeout(connect, 2000);
    });
  };
  connect();
}

async function init() {
  try {
    manifest = await loadManifest();

    const available = availableLanguages();
    const wanted = state.settings.lang;
    lang = available.some(([code]) => code === wanted)
      ? wanted
      : available.length
        ? available[0][0]
        : 'en';
    state.settings.lang = lang;

    book = await loadBook(lang);
    if (!book.chapters.length) throw new Error(t('boot.noChapters'));

    document.documentElement.lang = lang;
    document.documentElement.dir = directionOf(lang);

    document.title = book.title;
    els.brandTitle.textContent = book.title;
    els.brandSub.textContent = book.subtitle || '';

    applySettings();
    renderSidebar();
    buildIndex();

    els.boot.hidden = true;
    els.app.hidden = false;

    route();
    onScroll();
    registerServiceWorker();
    liveReload();
  } catch (error) {
    console.error(error);
    const offline = location.protocol === 'file:';
    renderBootMessage(
      offline ? t('boot.offline.title') : t('boot.error.title'),
      offline
        ? t('boot.offline.body')
        : `<p>${escapeHtml(error?.message || t('boot.error.unknown'))}</p>${t('boot.error.body')}`,
      offline ? t('boot.offline.code') : '',
    );
  }
}

window.addEventListener('beforeunload', () => persist(true));

init();
