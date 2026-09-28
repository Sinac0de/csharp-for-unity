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
};

function icon(name, cls = '') {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
}

/* ------------------------------------------------------------------- storage */

const STORE_KEY = 'csharp-unity-reader';

const defaults = {
  settings: {
    theme: 'auto',
    font: 'sans',
    size: 'm',
    width: 'normal',
    leading: 'normal',
    focus: false,
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
    themeBtn.setAttribute('aria-label', `Switch to ${next} theme`);
    themeBtn.innerHTML = icon(resolved === 'dark' ? 'sun' : 'moon');
  }

  const hint = $('#searchShortcut');
  if (hint) hint.textContent = isMac ? '⌘K' : 'Ctrl K';

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

function splitPartTitle(title) {
  const m = /^(Part\s+[IVXLCDM\d]+)\s*[—–-]\s*(.+)$/i.exec(title || '');
  if (m) return { kicker: m[1], name: m[2] };
  return { kicker: 'Part', name: title || 'Notes' };
}

const CALLOUT_LABEL = {
  tip: 'tip',
  warn: 'pitfall',
  note: 'Unity note',
  perf: 'perf',
  interview: 'interview',
  recap: 'recap',
};

function chapterHeaderHTML(chapter) {
  const { kicker, name } = splitPartTitle(chapter.partTitle);
  const chips = [
    `<span class="meta-chip" data-kind="code">${icon('clock')}${chapter.minutes} min read</span>`,
  ];
  if (chapter.stats.code) {
    chips.push(
      `<span class="meta-chip" data-kind="code">${icon('code')}${chapter.stats.code} code samples</span>`,
    );
  }
  for (const [tag, count] of Object.entries(chapter.stats.callouts)) {
    if (!CALLOUT_LABEL[tag]) continue;
    chips.push(
      `<span class="meta-chip" data-kind="${tag}">${icon(tag)}${count} ${CALLOUT_LABEL[tag]}${
        count > 1 ? 's' : ''
      }</span>`,
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
      <span>${escapeHtml(chapter.partTitle || 'Notes')}</span>
      <span class="sep">/</span>
      <span>${escapeHtml(chapter.label || 'Overview')}</span>
    </div>
    <h1 id="chapter-title">${chapter.titleHtml}</h1>
    <div class="chapter-meta">
      ${chips.join('')}
      <button class="read-toggle" type="button" id="readToggle" aria-pressed="${isRead}">
        ${icon('check')}<span>${isRead ? 'Read' : 'Mark as read'}</span>
      </button>
      <button class="read-toggle" type="button" id="starToggle" aria-pressed="${isStarred}">
        ${icon('star')}<span>${isStarred ? 'Bookmarked' : 'Bookmark'}</span>
      </button>
    </div>
  </header>`;
}

function chapterFootHTML(index) {
  const prev = book.chapters[index - 1];
  const next = book.chapters[index + 1];
  const btn = (c, dir) => {
    if (!c) return `<div class="foot-btn" data-empty="true" data-dir="${dir}"></div>`;
    const label = dir === 'prev' ? 'Previous' : 'Next';
    return `<a class="foot-btn" data-dir="${dir}" href="#/${c.id}" data-navlink>
      <span class="dir">${label}${c.label ? ` · ${escapeHtml(c.label)}` : ''}</span>
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
    `<div class="sidebar-head"><h2>Contents</h2><span class="sidebar-count">${book.chapters.length} chapters</span></div>` +
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
  return `<li class="nav-row" data-chapter="${chapter.id}" data-current="false"
      data-read="${read}" data-starred="${starred}">
    <a class="nav-item" href="#/${chapter.id}" data-navlink data-chapter="${chapter.id}"
       title="${title}">
      <span class="nav-num">${escapeHtml(String(chapter.number ?? '·'))}</span>
      <span class="nav-title">${title}</span>
    </a>
    <span class="nav-acts">
      <button class="nav-act nav-act-read" type="button" data-mark-read="${chapter.id}"
        aria-pressed="${read}" title="${read ? 'Mark as unread' : 'Mark as read'}"
        aria-label="Mark ${title} as ${read ? 'unread' : 'read'}">${icon('checkCircle')}</button>
      <button class="nav-act nav-act-star" type="button" data-star="${chapter.id}"
        aria-pressed="${starred}"
        title="${starred ? 'Remove bookmark' : 'Add bookmark'}"
        aria-label="${starred ? 'Remove bookmark' : 'Add bookmark'} ${title}">${icon('star')}</button>
    </span>
  </li>`;
}

function renderBookmarks() {
  if (!els.bookmarksSlot) return;
  const marked = state.bookmarks
    .map((id) => book.chapters.find((c) => c.id === id))
    .filter(Boolean);
  els.bookmarksSlot.innerHTML = marked.length
    ? `<nav class="nav-group" aria-label="Bookmarks">
        <p class="nav-group-label"><span class="dot"></span>Bookmarks</p>
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
      <small>Continue reading</small>
      <strong>${escapeHtml(chapter.title)}</strong>
    </span>
    <span class="sidebar-count" style="margin-left:auto">${pct}%</span>
  </button>`;
}

function updateProgressUI() {
  const total = book.chapters.length || 1;
  const done = book.chapters.filter((c) => state.read[c.id]).length;
  const pct = Math.round((done / total) * 100);
  if (els.progressLabel) els.progressLabel.textContent = `${pct}% complete`;
  if (els.progressFillMini) els.progressFillMini.style.width = `${pct}%`;
  if (els.readLabel) els.readLabel.textContent = `${done} of ${total} chapters read`;

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
      readBtn.title = read ? 'Mark as unread' : 'Mark as read';
      readBtn.setAttribute('aria-label', `Mark ${title} as ${read ? 'unread' : 'read'}`);
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
      if (label) label.textContent = value ? 'Read' : 'Mark as read';
    }
  }
  if (announce) toast(value ? 'Marked as read' : 'Marked as unread', 'ok');
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
    : '<li class="rail-empty">No sections</li>';
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
    if (label) label.textContent = starred ? 'Bookmarked' : 'Bookmark';
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

function buildIndex() {
  index = [];
  for (const chapter of book.chapters) {
    const parts = chapter.textParts || [];
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
        where: chapter.label ? `${chapter.label} · ${chapter.partTitle}` : chapter.partTitle,
        title: h.text,
        text: `${h.text} ${body}`.replace(/\s+/g, ' ').trim(),
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
        title: chapter.title,
        text: `${chapter.title} ${preamble}`.trim(),
      });
    }
  }
}

const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function termsOf(query) {
  return query.toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean);
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
    els.searchResults.innerHTML = `<div class="palette-empty">No results for “${escapeHtml(
      query,
    )}”.</div>`;
    return;
  }

  els.searchResults.innerHTML = results
    .map((r, i) => {
      const href = r.sectionId ? `#/${r.chapterId}/${r.sectionId}` : `#/${r.chapterId}`;
      return `<a class="result" href="${href}" data-navlink data-result="${i}"
        data-active="${i === 0}" data-chapter="${r.chapterId}" data-section="${r.sectionId || ''}">
        <span class="result-top">
          <span class="result-kind">${r.kind === 'section' ? 'Section' : 'Chapter'}</span>
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
          <span class="result-snippet">${escapeHtml(c.partTitle)} · ${c.minutes} min</span>
        </a>`,
          )
          .join('')
      : '';

  const unread = book.chapters.filter((c) => !state.read[c.id]).slice(0, 4);
  return (
    section('Bookmarks', bookmarked) +
      section('Recently read', recent) +
      section('Up next', unread) ||
    '<div class="palette-empty">Start typing to search the whole handbook.</div>'
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
  toast(i === -1 ? 'Added to bookmarks' : 'Removed from bookmarks', 'ok');
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
    if (label) label.textContent = 'Copied';
    setTimeout(() => {
      button.dataset.copied = 'false';
      if (label) label.textContent = 'Copy';
    }, 1600);
  }
  if (announce) toast('Copied to clipboard', 'ok');
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
    toast('Section link copied', 'ok');
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
    toast('Preferences reset', 'ok');
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

async function loadSource() {
  if (window.__NOTES_SOURCE__) return window.__NOTES_SOURCE__;

  const res = await fetch(new URL('notes.json', document.baseURI), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`notes.json could not be read (HTTP ${res.status}).`);
  const manifest = await res.json();

  const files = await Promise.all(
    (manifest.files || []).map(async (entry) => {
      const name = typeof entry === 'string' ? entry : entry.file;
      const noteRes = await fetch(new URL(name, document.baseURI), { cache: 'no-cache' });
      if (!noteRes.ok) throw new Error(`${name} could not be read (HTTP ${noteRes.status}).`);
      return { name, text: await noteRes.text() };
    }),
  );

  return { title: manifest.title, subtitle: manifest.subtitle, files };
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
    book = buildBook(await loadSource());
    if (!book.chapters.length) {
      throw new Error('No chapters were found. Check the files listed in notes.json.');
    }

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
      offline ? 'Open the reader through a local server' : 'Your notes could not be loaded',
      offline
        ? `<p>Browsers block a page from reading files on your disk, so opening this
             file directly cannot work. From the project folder run:</p>`
        : `<p>${escapeHtml(error?.message || 'Unknown error.')}</p>
           <p>Make sure the note files listed in <code>notes.json</code> exist.</p>`,
      offline ? 'npm run dev\n\n# or build a portable, server-free file:\nnpm run build' : '',
    );
  }
}

window.addEventListener('beforeunload', () => persist(true));

init();
