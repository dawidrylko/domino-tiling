const { escapeHtml } = require('./notes');

const REPOSITORY_URL = 'https://github.com/dawidrylko/domino-tiling';
const NOTE_LABELS = { method: 'Method', a004003: 'A004003', a239273: 'A239273' };

const CHROME_CSS = `
.site-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; margin-bottom: 20px; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.brand { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 24px; font-weight: 700; line-height: 1.25; color: var(--fg); text-decoration: none; }
.brand img { width: 32px; height: 32px; }
.site-nav { display: flex; flex-wrap: wrap; gap: 4px 16px; }
.site-nav a { color: var(--muted); text-decoration: none; }
.site-nav a:hover, .site-nav a[aria-current="page"] { color: var(--fg); }
.site-nav a[aria-current="page"] { text-decoration: underline 2px var(--accent); text-underline-offset: 6px; }
.site-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font: 13px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.site-footer p { margin: 0 0 4px; }
`.trim();

/**
 * Renders the header every page shares: the site name and the site navigation.
 * @param {Object} options
 * @property {string} options.root The path from the page to the site root ('' or '../').
 * @property {string} options.current The slug of the page: 'home' or a note slug.
 * @property {{ slug: string }[]} options.notes The notes in reading order.
 * @returns {string} The HTML.
 */
function renderHeader({ root, current, notes }) {
  const home = root || './';
  const logo = `<img src="${root}domino.svg" alt="" width="32" height="32">Domino Tiling`;
  const brand = current === 'home' ? `<h1 class="brand">${logo}</h1>` : `<a class="brand" href="${home}">${logo}</a>`;
  const links = [
    { slug: 'home', href: home, label: 'Home' },
    ...notes.map(({ slug }) => ({ slug, href: `${root}notes/${slug}.html`, label: NOTE_LABELS[slug] || slug })),
  ];
  const nav = links
    .map(({ slug, href, label }) => `<a href="${href}"${slug === current ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`)
    .join('\n      ');

  return [
    '<header class="site-header">',
    `    ${brand}`,
    '    <nav class="site-nav" aria-label="Site">',
    `      ${nav}`,
    '    </nav>',
    '  </header>',
  ].join('\n');
}

/**
 * Renders the footer every page shares, after the page's own lines.
 * @param {string[]} [lines] HTML lines that belong to this page only, such as where a note was built from.
 * @returns {string} The HTML.
 */
function renderFooter(lines = []) {
  const links = [
    '© <a href="https://dawidrylko.com" rel="author">Dawid Ryłko</a>',
    `<a href="${REPOSITORY_URL}/blob/master/LICENSE">MIT License</a>`,
    `<a href="${REPOSITORY_URL}">GitHub</a>`,
    '<a href="https://dawidrylko.com/domino-tiling/" hreflang="pl">Blog post</a>',
  ];

  return [
    '<footer class="site-footer">',
    ...lines.map(line => `    <p>${line}</p>`),
    `    <p class="site-links">${links.join(' · ')}</p>`,
    '  </footer>',
  ].join('\n');
}

module.exports = { CHROME_CSS, renderHeader, renderFooter };
