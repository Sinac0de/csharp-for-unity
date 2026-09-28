/**
 * i18n.js — the reader's interface in more than one language.
 *
 * The notes themselves live in one file per language (`Assets/*.md` and
 * `Assets/fa/*.md`), so this file only holds the *interface*: the words around
 * the notes — buttons, empty states, toasts, settings labels. Nothing here
 * touches the chapters.
 *
 * Two rules keep it honest:
 *   1. Numbers stay in Latin digits in every language. Chapter numbers, code
 *      statistics and reading times all refer to the same things in both
 *      versions, and `#### ۲۶.۱` renders inconsistently between fonts.
 *   2. Code, identifiers and API names are never translated — only the words a
 *      human wrote around them.
 *
 * Adding a language means adding one key to `UI` and one folder of notes; the
 * switcher builds itself from whatever `notes.json` declares.
 */

export const RTL = new Set(['fa', 'ar', 'he', 'ur']);

export const directionOf = (lang) => (RTL.has(String(lang).slice(0, 2)) ? 'rtl' : 'ltr');

/* --------------------------------------------------------------- folding */

/**
 * Folds text for searching, one character in and one character out.
 *
 * Persian is typed with several letter shapes that look identical: the Arabic
 * `ي`/`ك` and the Persian `ی`/`ک`, plus Arabic-Indic digits. A reader searching
 * for "يادگيری" should find "یادگیری", and it would be infuriating if half the
 * handbook were invisible to the search box because of which keyboard wrote it.
 *
 * ZWNJ (the half-space in "میکند") folds to a plain space, so a query typed
 * with a space still matches. Every replacement is one character for one
 * character, which keeps offsets aligned: search highlights are computed on
 * folded text and sliced from folded text, so they can never drift.
 */
const FOLD_MAP = {
  'ي': 'ی', 'ﻯ': 'ی', 'ی': 'ی',
  'ك': 'ک', 'ﻙ': 'ک',
  'ۀ': 'ه', 'ة': 'ه', 'ﻩ': 'ه',
  'ؤ': 'و', 'ٶ': 'و',
  'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '\u200c': ' ', // ZWNJ (نیمفاصله)
  '\u200f': ' ', // RLM
  '\u200e': '', // LRM
  '\u064b': '', '\u064c': '', '\u064d': '', '\u064e': '',
  '\u064f': '', '\u0650': '', '\u0651': '', '\u0652': '', // harakat
  'ـ': '', // tatweel
};

export function fold(text) {
  return String(text).replace(
    /[\u200c\u200e\u200f\u064b-\u0652\u0640\u0621-\u0655]|[\u0660-\u0669\u06f0-\u06f9]|[يكۀةؤأإٱ٠-٩۰-۹]/g,
    (ch) => (FOLD_MAP[ch] === undefined ? ch : FOLD_MAP[ch]),
  );
}

/* Deliberately no lower-casing here. Folded text is also what the search
   results *display*, and lower-casing would show "LINQ" as "linq". Callers
   lower-case both the haystack and the query when they compare. */

/* ----------------------------------------------------------------- strings */

/**
 * Plain sentences with `{placeholders}`. A `_one` variant is used when `n` is
 * exactly 1 — English needs it, Persian does not (`3 فصل` and `1 فصل`).
 */
export const UI = {
  en: {
    'lang.name': 'English',
    'lang.switch': 'Language',
    'lang.change': 'Read in another language',

    'menu.open': 'Open contents',
    'search.trigger': 'Search the handbook',
    'search.close': 'Close search',
    'search.placeholder': 'Search chapters, sections and code…',
    'search.empty': 'Start typing to search the whole handbook.',
    'search.none': 'No results for “{q}”.',
    'search.section': 'Section',
    'search.chapter': 'Chapter',
    'search.bookmarks': 'Bookmarks',
    'search.recent': 'Recently read',
    'search.upNext': 'Up next',
    'search.navigate': 'navigate',
    'search.open': 'open',
    'search.ranked': 'Results are ranked by title and frequency',

    'topbar.bookmark': 'Bookmark this chapter',
    'topbar.theme': 'Switch to {theme} theme',
    'topbar.theme.light': 'light',
    'topbar.theme.dark': 'dark',
    'topbar.focus': 'Focus mode (f) — hide everything but the chapter',
    'topbar.settings': 'Reading settings',
    'topbar.top': 'Back to top',
    'focus.exit': 'Exit focus mode',

    'sidebar.contents': 'Contents',
    'sidebar.start': 'Getting Started',
    'sidebar.chapters': '{n} chapters',
    'sidebar.chapters_one': '1 chapter',
    'sidebar.count': '{n}',
    'sidebar.bookmarks': 'Bookmarks',
    'sidebar.continue': 'Continue reading',
    'sidebar.read': '{done} of {total} chapters read',
    'sidebar.complete': '{pct}% complete',
    'sidebar.hint':
      'Press <span class="kbd">/</span> to search, <span class="kbd">[</span> <span class="kbd">]</span> to move between chapters, <span class="kbd">f</span> for focus mode.',

    'rail.title': 'On this page',
    'rail.empty': 'No sections',

    'chapter.markRead': 'Mark as read',
    'chapter.read': 'Read',
    'chapter.bookmark': 'Bookmark',
    'chapter.bookmarked': 'Bookmarked',
    'chapter.overview': 'Overview',
    'chapter.notes': 'Notes',
    'chapter.minutes': '{n} min read',
    'chapter.code': '{n} code samples',
    'chapter.code_one': '1 code sample',
    'chapter.tip': '{n} tips',
    'chapter.tip_one': '1 tip',
    'chapter.warn': '{n} pitfalls',
    'chapter.warn_one': '1 pitfall',
    'chapter.note': '{n} Unity notes',
    'chapter.note_one': '1 Unity note',
    'chapter.perf': '{n} perf notes',
    'chapter.perf_one': '1 perf note',
    'chapter.interview': '{n} interview tips',
    'chapter.interview_one': '1 interview tip',
    'chapter.recap': '{n} recaps',
    'chapter.recap_one': '1 recap',
    'chapter.part': 'Part',
    'chapter.label': 'Chapter {n}',
    'chapter.minutesShort': '{n} min',

    'nav.markRead': 'Mark as read',
    'nav.markUnread': 'Mark as unread',
    'nav.markReadOf': 'Mark {title} as read',
    'nav.markUnreadOf': 'Mark {title} as unread',
    'nav.addBookmark': 'Add bookmark',
    'nav.removeBookmark': 'Remove bookmark',
    'nav.addBookmarkOf': 'Bookmark {title}',
    'nav.removeBookmarkOf': 'Remove bookmark for {title}',

    'foot.previous': 'Previous',
    'foot.next': 'Next',

    'code.copy': 'Copy',
    'code.copied': 'Copied',
    'code.copyLabel': 'Copy code',
    'code.lang': 'Code',
    'a11y.table': 'Table',

    'callout.tip': 'Tip',
    'callout.warn': 'Pitfall',
    'callout.note': 'Unity note',
    'callout.perf': 'Performance',
    'callout.interview': 'Interview',
    'callout.recap': 'Recap',

    'sheet.appearance': 'Appearance',
    'sheet.theme': 'Theme',
    'sheet.theme.auto': 'Auto',
    'sheet.theme.light': 'Light',
    'sheet.theme.dark': 'Dark',
    'sheet.font': 'Typeface',
    'sheet.font.sans': 'Sans',
    'sheet.font.serif': 'Serif',
    'sheet.size': 'Text size',
    'sheet.leading': 'Line spacing',
    'sheet.leading.tight': 'Tight',
    'sheet.leading.normal': 'Normal',
    'sheet.leading.loose': 'Loose',
    'sheet.width': 'Reading width',
    'sheet.width.narrow': 'Narrow',
    'sheet.width.normal': 'Normal',
    'sheet.width.wide': 'Wide',
    'sheet.focus': 'Focus mode',
    'sheet.off': 'Off',
    'sheet.on': 'On',
    'sheet.print': 'Print / export the whole handbook to PDF',
    'sheet.reset': 'Reset preferences',
    'sheet.keyboard':
      'Keyboard — <b>/</b> or <b>Ctrl K</b> to search, <b>[</b> <b>]</b> between chapters, <b>f</b> focus mode, <b>t</b> theme, <b>s</b> bookmark, <b>g</b> top of page, <b>Esc</b> to leave focus mode. Shortcuts follow the physical key, so they work on any keyboard layout.',
    'colophon.line': 'Star it if this saved you a debugging session.',

    'toast.copied': 'Copied to clipboard',
    'toast.link': 'Section link copied',
    'toast.added': 'Added to bookmarks',
    'toast.removed': 'Removed from bookmarks',
    'toast.read': 'Marked as read',
    'toast.unread': 'Marked as unread',
    'toast.reset': 'Preferences reset',

    'boot.offline.title': 'Open the reader through a local server',
    'boot.offline.body':
      '<p>Browsers block a page from reading files on your disk, so opening this file directly cannot work. From the project folder run:</p>',
    'boot.offline.code': 'npm run dev\n\n# or build a portable, server-free file:\nnpm run build',
    'boot.error.title': 'Your notes could not be loaded',
    'boot.error.body':
      '<p>Make sure the note files listed in <code>notes.json</code> exist.</p>',
    'boot.error.unknown': 'Unknown error.',
    'boot.noChapters': 'No chapters were found. Check the files listed in notes.json.',
  },

  fa: {
    'lang.name': 'فارسی',
    'lang.switch': 'زبان',
    'lang.change': 'خواندن به زبان دیگر',

    'menu.open': 'باز کردن فهرست',
    'search.trigger': 'جست‌وجو در جزوه',
    'search.close': 'بستن جست‌وجو',
    'search.placeholder': 'در فصل‌ها، بخش‌ها و کدها جست‌وجو کن…',
    'search.empty': 'برای جست‌وجو در کل جزوه، چند حرف تایپ کن.',
    'search.none': 'برای «{q}» چیزی پیدا نشد.',
    'search.section': 'بخش',
    'search.chapter': 'فصل',
    'search.bookmarks': 'نشان‌شده‌ها',
    'search.recent': 'اخیراً خوانده‌ای',
    'search.upNext': 'بعدی در نوبت',
    'search.navigate': 'جابه‌جایی',
    'search.open': 'باز کردن',
    'search.ranked': 'نتایج بر پایهٔ عنوان و تعداد تکرار مرتب شده‌اند',

    'topbar.bookmark': 'نشان کردن این فصل',
    'topbar.theme': 'تغییر به پوستهٔ {theme}',
    'topbar.theme.light': 'روشن',
    'topbar.theme.dark': 'تیره',
    'topbar.focus': 'حالت تمرکز (f) — همه‌چیز جز خود فصل پنهان می‌شود',
    'topbar.settings': 'تنظیمات مطالعه',
    'topbar.top': 'بازگشت به بالای صفحه',
    'focus.exit': 'خروج از حالت تمرکز',

    'sidebar.contents': 'فهرست مطالب',
    'sidebar.start': 'شروع کنیم',
    'sidebar.chapters': '{n} فصل',
    'sidebar.chapters_one': '{n} فصل',
    'sidebar.count': '{n} فصل',
    'sidebar.bookmarks': 'نشان‌شده‌ها',
    'sidebar.continue': 'ادامهٔ مطالعه',
    'sidebar.read': '{done} از {total} فصل خوانده شده',
    'sidebar.complete': '{pct}% خوانده شده',
    'sidebar.hint':
      'برای جست‌وجو <span class="kbd">/</span> را بزن؛ با <span class="kbd">[</span> و <span class="kbd">]</span> بین فصل‌ها جابه‌جا شو و با <span class="kbd">f</span> حالت تمرکز را روشن کن.',

    'rail.title': 'در این صفحه',
    'rail.empty': 'این فصل بخش‌بندی نشده',

    'chapter.markRead': 'خوانده‌ام',
    'chapter.read': 'خوانده شد',
    'chapter.bookmark': 'نشان کردن',
    'chapter.bookmarked': 'نشان شده',
    'chapter.overview': 'معرفی',
    'chapter.notes': 'جزوه',
    'chapter.minutes': '{n} دقیقه مطالعه',
    'chapter.code': '{n} نمونه‌کد',
    'chapter.code_one': '۱ نمونه‌کد',
    'chapter.tip': '{n} نکته',
    'chapter.tip_one': '۱ نکته',
    'chapter.warn': '{n} هشدار',
    'chapter.warn_one': '۱ هشدار',
    'chapter.note': '{n} نکتهٔ یونیتی',
    'chapter.note_one': '۱ نکتهٔ یونیتی',
    'chapter.perf': '{n} نکتهٔ کارایی',
    'chapter.perf_one': '۱ نکتهٔ کارایی',
    'chapter.interview': '{n} نکتهٔ مصاحبه',
    'chapter.interview_one': '۱ نکتهٔ مصاحبه',
    'chapter.recap': '{n} جمع‌بندی',
    'chapter.recap_one': '۱ جمع‌بندی',
    'chapter.part': 'بخش',
    'chapter.label': 'فصل {n}',
    'chapter.minutesShort': '{n} دقیقه',

    'nav.markRead': 'خوانده‌شده کن',
    'nav.markUnread': 'خوانده‌نشده کن',
    'nav.markReadOf': '{title} را خوانده‌شده کن',
    'nav.markUnreadOf': '{title} را خوانده‌نشده کن',
    'nav.addBookmark': 'افزودن به نشان‌شده‌ها',
    'nav.removeBookmark': 'حذف از نشان‌شده‌ها',
    'nav.addBookmarkOf': 'نشان کردن {title}',
    'nav.removeBookmarkOf': 'برداشتن نشان {title}',

    'foot.previous': 'فصل قبلی',
    'foot.next': 'فصل بعدی',

    'code.copy': 'کپی',
    'code.copied': 'کپی شد',
    'code.copyLabel': 'کپی کد',
    'code.lang': 'کد',
    'a11y.table': 'جدول',

    'callout.tip': 'نکته',
    'callout.warn': 'هشدار',
    'callout.note': 'یونیتی',
    'callout.perf': 'کارایی',
    'callout.interview': 'مصاحبه',
    'callout.recap': 'جمع‌بندی',

    'sheet.appearance': 'ظاهر',
    'sheet.theme': 'پوسته',
    'sheet.theme.auto': 'خودکار',
    'sheet.theme.light': 'روشن',
    'sheet.theme.dark': 'تیره',
    'sheet.font': 'قلم',
    'sheet.font.sans': 'ساده',
    'sheet.font.serif': 'کلاسیک',
    'sheet.size': 'اندازهٔ متن',
    'sheet.leading': 'فاصلهٔ خطوط',
    'sheet.leading.tight': 'تنگ',
    'sheet.leading.normal': 'معمولی',
    'sheet.leading.loose': 'باز',
    'sheet.width': 'عرض متن',
    'sheet.width.narrow': 'باریک',
    'sheet.width.normal': 'معمولی',
    'sheet.width.wide': 'پهن',
    'sheet.focus': 'حالت تمرکز',
    'sheet.off': 'خاموش',
    'sheet.on': 'روشن',
    'sheet.print': 'چاپ یا گرفتن خروجی PDF از کل جزوه',
    'sheet.reset': 'بازگرداندن تنظیمات به حالت اولیه',
    'sheet.keyboard':
      'کلیدها — <b>/</b> برای جست‌وجو، <b>[</b> و <b>]</b> برای فصل قبلی و بعدی، <b>f</b> حالت تمرکز، <b>t</b> پوسته، <b>s</b> نشان کردن فصل، <b>g</b> بالای صفحه و <b>Esc</b> برای خروج از حالت تمرکز. این میانبرها به کلید فیزیکی کیبورد نگاه می‌کنند، پس روی چیدمان فارسی هم کار می‌کنند.',
    'colophon.line': 'اگر این جزوه یک بار وقتت را نجات داد، یک ستاره به مخزنش بده.',

    'toast.copied': 'در حافظه کپی شد',
    'toast.link': 'پیوند این بخش کپی شد',
    'toast.added': 'به نشان‌شده‌ها اضافه شد',
    'toast.removed': 'از نشان‌شده‌ها برداشته شد',
    'toast.read': 'به‌عنوان خوانده‌شده ثبت شد',
    'toast.unread': 'به‌عنوان خوانده‌نشده ثبت شد',
    'toast.reset': 'تنظیمات به حالت اولیه برگشت',

    'boot.offline.title': 'ریدر را با یک سرور محلی باز کن',
    'boot.offline.body':
      '<p>مرورگر اجازه نمی‌دهد صفحه‌ای فایل‌های روی دیسک تو را بخواند، پس باز کردن مستقیم این فایل کار نمی‌کند. از پوشهٔ پروژه این را اجرا کن:</p>',
    'boot.offline.code': 'npm run dev\n\n# یا نسخهٔ تک‌فایلی و بدون سرور را بساز:\nnpm run build',
    'boot.error.title': 'جزوه بارگذاری نشد',
    'boot.error.body':
      '<p>مطمئن شو فایل‌هایی که در <code>notes.json</code> فهرست شده‌اند، وجود دارند.</p>',
    'boot.error.unknown': 'خطای ناشناخته.',
    'boot.noChapters': 'هیچ فصلی پیدا نشد. فایل‌های فهرست‌شده در notes.json را بررسی کن.',
  },
};

/**
 * Looks up a key, fills `{placeholders}`, and picks the `_one` form for a count
 * of exactly one. Unknown keys fall back to English, then to the key itself, so
 * a missing translation is visible rather than fatal.
 */
export function translate(lang, key, vars) {
  const dict = UI[lang] || UI.en;
  let template = dict[key];
  if (template === undefined && vars && vars.n === 1) template = dict[`${key}_one`];
  if (template === undefined) template = UI.en[key];
  if (template === undefined && vars && vars.n === 1) template = UI.en[`${key}_one`];
  if (template === undefined) return key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    vars[name] === undefined ? match : String(vars[name]),
  );
}
