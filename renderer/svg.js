const CELL_SIZE = 16;
const PADDING = 12;
const LABEL_HEIGHT = 14;
const SHEET_COLUMNS = 10;
const STYLE = [
  '.b{fill:#f3f4f6}',
  '.h,.v{stroke:#1f2937;stroke-width:1}',
  '.h{fill:#4f7cac}',
  '.v{fill:#e0a458}',
  'text{font:11px monospace;fill:#4b5563;text-anchor:middle}',
].join('');

function renderDomino({ row, col, horizontal }, offsetX, offsetY) {
  const x = offsetX + col * CELL_SIZE + 1;
  const y = offsetY + row * CELL_SIZE + 1;
  const width = (horizontal ? 2 : 1) * CELL_SIZE - 2;
  const height = (horizontal ? 1 : 2) * CELL_SIZE - 2;

  return `<rect class="${horizontal ? 'h' : 'v'}" x="${x}" y="${y}" width="${width}" height="${height}" rx="3"/>`;
}

function renderTiling(tiling, label, offsetX, offsetY, options) {
  const { rowCount, colCount } = options;
  const boardWidth = colCount * CELL_SIZE;
  const boardHeight = rowCount * CELL_SIZE;

  return [
    `<rect class="b" x="${offsetX}" y="${offsetY}" width="${boardWidth}" height="${boardHeight}"/>`,
    ...tiling.map(domino => renderDomino(domino, offsetX, offsetY)),
    `<text x="${offsetX + boardWidth / 2}" y="${offsetY + boardHeight + LABEL_HEIGHT - 2}">#${label}</text>`,
  ].join('');
}

/**
 * Renders a sheet of tilings as a standalone SVG document.
 * @param {Domino[][]} tilings The tilings to render.
 * @param {number} firstNumber The 1-based number of the first tiling on the sheet.
 * @param {Object} options Board dimensions.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @returns {string} The SVG document.
 */
function renderSheet(tilings, firstNumber, options) {
  const { rowCount, colCount } = options;
  const tileWidth = colCount * CELL_SIZE + PADDING;
  const tileHeight = rowCount * CELL_SIZE + LABEL_HEIGHT + PADDING;
  const columns = Math.min(SHEET_COLUMNS, tilings.length);
  const rows = Math.ceil(tilings.length / SHEET_COLUMNS);
  const width = columns * tileWidth + PADDING;
  const height = rows * tileHeight + PADDING;

  const body = tilings.map((tiling, i) =>
    renderTiling(
      tiling,
      firstNumber + i,
      PADDING + (i % SHEET_COLUMNS) * tileWidth,
      PADDING + Math.floor(i / SHEET_COLUMNS) * tileHeight,
      options,
    ),
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<style>${STYLE}</style>`,
    '<rect width="100%" height="100%" fill="#fff"/>',
    ...body,
    '</svg>',
    '',
  ].join('\n');
}

module.exports = renderSheet;
