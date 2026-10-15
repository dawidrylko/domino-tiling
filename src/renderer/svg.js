const CELL_SIZE = 16;
const PADDING = 12;
const LABEL_HEIGHT = 14;
const SHEET_COLUMNS = 10;
const STYLES = ['blocks', 'dimer', 'engraving'];
const COLORS = { h: '#044cb6', v: '#5eaceb', d: '#ab3415', a: '#f09c17' };
const BOARD_COLOR = '#f3f4f6';
const INK = '#334155';
const COMMON_STYLE = [`.b{fill:${BOARD_COLOR}}`, 'text{font:11px monospace;fill:#4b5563;text-anchor:middle}'].join('');
const SHEET_STYLES = {
  blocks: {
    straight: ['.h,.v{stroke:#1f2937;stroke-width:1}', `.h{fill:${COLORS.h}}`, `.v{fill:${COLORS.v}}`].join(''),
    diagonal: ['.d,.a{stroke:#1f2937;stroke-width:1}', `.d{fill:${COLORS.d}}`, `.a{fill:${COLORS.a}}`].join(''),
  },
  dimer: {
    straight: ['.h,.v{stroke-linecap:round}', `.h{fill:${COLORS.h};stroke:${COLORS.h}}`, `.v{fill:${COLORS.v};stroke:${COLORS.v}}`, '.o{stroke:none}'].join(''),
    diagonal: ['.d,.a{stroke-linecap:round}', `.d{fill:${COLORS.d};stroke:${COLORS.d}}`, `.a{fill:${COLORS.a};stroke:${COLORS.a}}`, `.r{fill:none;stroke:${BOARD_COLOR};stroke-linecap:round}`, '.o{stroke:none}'].join(''),
  },
  engraving: {
    straight: [`.h,.v{stroke:${INK};stroke-width:1}`, '.h{fill:#ffffff}', '.v{fill:#e8eef6}'].join(''),
    diagonal: [
      `.cd,.ca{stroke:${INK};stroke-width:1}`,
      '.cd{fill:#f1ebeb}',
      '.ca{fill:#f5f2ec}',
      '.d,.a{fill:none;stroke-width:1;stroke-linecap:butt}',
      '.d{stroke:#753a32}',
      '.a{stroke:#9b7333}',
      '.k{stroke-width:2.4}',
    ].join(''),
  },
};

const DIAGONAL_LENGTH = Math.SQRT2 * CELL_SIZE + 10;
const DIAGONAL_WIDTH = 8;
const DIMER_LINK_WIDTH = 5.5;
const DIMER_RING_WIDTH = 8.5;
const DIMER_DOT_RADIUS = 3.6;
const ENGRAVING_OUTLINE = 1;
const ENGRAVING_HATCH_WIDTH = 1;
const ENGRAVING_AXIS_WIDTH = 2.4;

function isDiagonal(piece) {
  return Boolean(piece.dr && piece.dc);
}

/**
 * Turns a domino { row, col, horizontal } or a domicule { row, col, dr, dc } into
 * { row, col, dr, dc, kind }, where kind is h, v, d (down-right) or a (down-left).
 */
function normalize(piece) {
  const { row, col } = piece;
  const dr = piece.dr === undefined ? (piece.horizontal ? 0 : 1) : piece.dr;
  const dc = piece.dr === undefined ? (piece.horizontal ? 1 : 0) : piece.dc;
  const kind = dr === 0 ? 'h' : dc === 0 ? 'v' : dc > 0 ? 'd' : 'a';

  return { row, col, dr, dc, kind };
}

function renderBlock({ row, col, kind }, offsetX, offsetY) {
  const horizontal = kind === 'h';
  const x = offsetX + col * CELL_SIZE + 1;
  const y = offsetY + row * CELL_SIZE + 1;
  const width = (horizontal ? 2 : 1) * CELL_SIZE - 2;
  const height = (horizontal ? 1 : 2) * CELL_SIZE - 2;

  return `<rect class="${kind}" x="${x}" y="${y}" width="${width}" height="${height}" rx="3"/>`;
}

function renderBlockDiagonal({ row, col, dc, kind }, offsetX, offsetY) {
  const cx = offsetX + (col + 0.5 + dc / 2) * CELL_SIZE;
  const cy = offsetY + (row + 1) * CELL_SIZE;
  const x = (cx - DIAGONAL_LENGTH / 2).toFixed(2);
  const y = cy - DIAGONAL_WIDTH / 2;

  return `<rect class="${kind}" x="${x}" y="${y}" width="${DIAGONAL_LENGTH.toFixed(2)}" height="${DIAGONAL_WIDTH}" rx="${DIAGONAL_WIDTH / 2}" transform="rotate(${dc > 0 ? 45 : -45} ${cx} ${cy})"/>`;
}

function renderDimer({ row, col, dr, dc, kind }, offsetX, offsetY) {
  const x1 = offsetX + (col + 0.5) * CELL_SIZE;
  const y1 = offsetY + (row + 0.5) * CELL_SIZE;
  const x2 = x1 + dc * CELL_SIZE;
  const y2 = y1 + dr * CELL_SIZE;
  const link = `M${x1} ${y1}L${x2} ${y2}`;

  return [
    ...(dr && dc ? [`<path class="r" d="${link}" stroke-width="${DIMER_RING_WIDTH}"/>`] : []),
    `<path class="${kind}" d="${link}" stroke-width="${DIMER_LINK_WIDTH}"/>`,
    `<circle class="${kind} o" cx="${x1}" cy="${y1}" r="${DIMER_DOT_RADIUS}"/>`,
    `<circle class="${kind} o" cx="${x2}" cy="${y2}" r="${DIMER_DOT_RADIUS}"/>`,
  ].join('');
}

function renderEngravedBlock({ row, col, kind }, offsetX, offsetY) {
  const horizontal = kind === 'h';
  const x = offsetX + col * CELL_SIZE + 0.5;
  const y = offsetY + row * CELL_SIZE + 0.5;

  return `<rect class="${kind}" x="${x}" y="${y}" width="${(horizontal ? 2 : 1) * CELL_SIZE - 1}" height="${(horizontal ? 1 : 2) * CELL_SIZE - 1}" rx="1.5"/>`;
}

function hatchCell(cellRow, cellCol, slope, offsetX, offsetY) {
  const s = CELL_SIZE;
  const x = offsetX + cellCol * s;
  const y = offsetY + cellRow * s;
  const flip = (px, py) => (slope > 0 ? [px, py] : [s - px, py]);
  const segment = ([fx, fy], [tx, ty], width) => {
    const inset = ENGRAVING_OUTLINE + width / 2;
    const [ax, ay] = flip(fx + inset, fy + inset);
    const [bx, by] = flip(tx - inset, ty - inset);

    return `M${+(x + ax).toFixed(2)} ${+(y + ay).toFixed(2)}L${+(x + bx).toFixed(2)} ${+(y + by).toFixed(2)}`;
  };

  return {
    axis: segment([0, 0], [s, s], ENGRAVING_AXIS_WIDTH),
    hatch: [segment([s / 2, 0], [s, s / 2], ENGRAVING_HATCH_WIDTH), segment([0, s / 2], [s / 2, s], ENGRAVING_HATCH_WIDTH)].join(''),
  };
}

function renderEngravedDiagonal({ row, col, dr, dc, kind }, offsetX, offsetY) {
  const cells = [
    [row, col],
    [row + dr, col + dc],
  ];
  const hatches = cells.map(([r, c]) => hatchCell(r, c, dc, offsetX, offsetY));

  return [
    ...cells.map(
      ([r, c]) => `<rect class="c${kind}" x="${offsetX + c * CELL_SIZE + 0.5}" y="${offsetY + r * CELL_SIZE + 0.5}" width="${CELL_SIZE - 1}" height="${CELL_SIZE - 1}" rx="1.5"/>`,
    ),
    `<path class="${kind}" d="${hatches.map(h => h.hatch).join('')}"/>`,
    `<path class="${kind} k" d="${hatches.map(h => h.axis).join('')}"/>`,
  ].join('');
}

const RENDERERS = {
  blocks: { straight: renderBlock, diagonal: renderBlockDiagonal },
  dimer: { straight: renderDimer, diagonal: renderDimer },
  engraving: { straight: renderEngravedBlock, diagonal: renderEngravedDiagonal },
};

function renderTiling(tiling, label, offsetX, offsetY, options) {
  const { rowCount, colCount, style } = options;
  const boardWidth = colCount * CELL_SIZE;
  const boardHeight = rowCount * CELL_SIZE;
  const pieces = tiling.map(normalize);
  const renderers = RENDERERS[style];

  return [
    `<rect class="b" x="${offsetX}" y="${offsetY}" width="${boardWidth}" height="${boardHeight}"/>`,
    ...pieces.filter(piece => !isDiagonal(piece)).map(piece => renderers.straight(piece, offsetX, offsetY)),
    ...pieces.filter(isDiagonal).map(piece => renderers.diagonal(piece, offsetX, offsetY)),
    `<text x="${offsetX + boardWidth / 2}" y="${offsetY + boardHeight + LABEL_HEIGHT - 2}">${label}</text>`,
  ].join('');
}

/**
 * Renders a sheet of tilings as a standalone SVG document.
 * @param {Domino[][]} tilings The tilings to render.
 * @param {number|BigInt} firstNumber The 1-based number of the first tiling on the sheet.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {number} [options.columns] The number of tilings per sheet row (default: 10).
 * @property {string[]} [options.labels] Labels shown under the tilings instead of their numbers.
 * @property {string} [options.style] How pieces are drawn: blocks (default), dimer or engraving.
 * @returns {string} The SVG document.
 */
function renderSheet(tilings, firstNumber, options) {
  const { rowCount, colCount } = options;
  const style = options.style || STYLES[0];

  if (!STYLES.includes(style)) {
    throw new Error(`Unknown style "${style}"; use one of: ${STYLES.join(', ')}.`);
  }

  const tileWidth = colCount * CELL_SIZE + PADDING;
  const tileHeight = rowCount * CELL_SIZE + LABEL_HEIGHT + PADDING;
  const sheetColumns = options.columns || SHEET_COLUMNS;
  const columns = Math.min(sheetColumns, tilings.length);
  const rows = Math.ceil(tilings.length / sheetColumns);
  const width = columns * tileWidth + PADDING;
  const height = rows * tileHeight + PADDING;
  const hasDiagonal = tilings.some(tiling => tiling.some(isDiagonal));

  const body = tilings.map((tiling, i) =>
    renderTiling(
      tiling,
      options.labels ? options.labels[i] : `#${BigInt(firstNumber) + BigInt(i)}`,
      PADDING + (i % sheetColumns) * tileWidth,
      PADDING + Math.floor(i / sheetColumns) * tileHeight,
      { ...options, style },
    ),
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" class="${style}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<style>${COMMON_STYLE}${SHEET_STYLES[style].straight}${hasDiagonal ? SHEET_STYLES[style].diagonal : ''}</style>`,
    '<rect class="bg" width="100%" height="100%" fill="#fff"/>',
    ...body,
    '</svg>',
    '',
  ].join('\n');
}

renderSheet.STYLES = STYLES;

if (typeof module !== 'undefined') {
  module.exports = renderSheet;
}
