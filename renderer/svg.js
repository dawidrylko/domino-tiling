const CELL_SIZE = 16;
const PADDING = 12;
const LABEL_HEIGHT = 14;
const SHEET_COLUMNS = 10;
const STYLE = [
  '.b{fill:#f3f4f6}',
  '.h,.v{stroke:#1f2937;stroke-width:1}',
  '.h{fill:#4f7cac}',
  '.v{fill:#e0a458}',
  '.d,.a{stroke:#1f2937;stroke-width:1}',
  '.d{fill:#5f9e6e}',
  '.a{fill:#a06cb4}',
  'text{font:11px monospace;fill:#4b5563;text-anchor:middle}',
].join('');

const DIAGONAL_LENGTH = Math.SQRT2 * CELL_SIZE + 10;
const DIAGONAL_WIDTH = 8;

function renderDomino({ row, col, horizontal }, offsetX, offsetY) {
  const x = offsetX + col * CELL_SIZE + 1;
  const y = offsetY + row * CELL_SIZE + 1;
  const width = (horizontal ? 2 : 1) * CELL_SIZE - 2;
  const height = (horizontal ? 1 : 2) * CELL_SIZE - 2;

  return `<rect class="${horizontal ? 'h' : 'v'}" x="${x}" y="${y}" width="${width}" height="${height}" rx="3"/>`;
}

function renderDiagonal({ row, col, dc }, offsetX, offsetY) {
  const cx = offsetX + (col + 0.5 + dc / 2) * CELL_SIZE;
  const cy = offsetY + (row + 1) * CELL_SIZE;
  const x = (cx - DIAGONAL_LENGTH / 2).toFixed(2);
  const y = cy - DIAGONAL_WIDTH / 2;

  return `<rect class="${dc > 0 ? 'd' : 'a'}" x="${x}" y="${y}" width="${DIAGONAL_LENGTH.toFixed(2)}" height="${DIAGONAL_WIDTH}" rx="${DIAGONAL_WIDTH / 2}" transform="rotate(${dc > 0 ? 45 : -45} ${cx} ${cy})"/>`;
}

/**
 * Renders one piece: a domino { row, col, horizontal } or a domicule { row, col, dr, dc },
 * which covers (row, col) and (row + dr, col + dc).
 */
function renderPiece(piece, offsetX, offsetY) {
  if (piece.dr === undefined) {
    return renderDomino(piece, offsetX, offsetY);
  }

  return piece.dr && piece.dc
    ? renderDiagonal(piece, offsetX, offsetY)
    : renderDomino({ row: piece.row, col: piece.col, horizontal: piece.dr === 0 }, offsetX, offsetY);
}

function renderTiling(tiling, label, offsetX, offsetY, options) {
  const { rowCount, colCount } = options;
  const boardWidth = colCount * CELL_SIZE;
  const boardHeight = rowCount * CELL_SIZE;

  return [
    `<rect class="b" x="${offsetX}" y="${offsetY}" width="${boardWidth}" height="${boardHeight}"/>`,
    ...tiling.filter(piece => !(piece.dr && piece.dc)).map(piece => renderPiece(piece, offsetX, offsetY)),
    ...tiling.filter(piece => piece.dr && piece.dc).map(piece => renderPiece(piece, offsetX, offsetY)),
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
 * @returns {string} The SVG document.
 */
function renderSheet(tilings, firstNumber, options) {
  const { rowCount, colCount } = options;
  const tileWidth = colCount * CELL_SIZE + PADDING;
  const tileHeight = rowCount * CELL_SIZE + LABEL_HEIGHT + PADDING;
  const sheetColumns = options.columns || SHEET_COLUMNS;
  const columns = Math.min(sheetColumns, tilings.length);
  const rows = Math.ceil(tilings.length / sheetColumns);
  const width = columns * tileWidth + PADDING;
  const height = rows * tileHeight + PADDING;

  const body = tilings.map((tiling, i) =>
    renderTiling(
      tiling,
      options.labels ? options.labels[i] : `#${BigInt(firstNumber) + BigInt(i)}`,
      PADDING + (i % sheetColumns) * tileWidth,
      PADDING + Math.floor(i / sheetColumns) * tileHeight,
      options,
    ),
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<style>${STYLE}</style>`,
    '<rect class="bg" width="100%" height="100%" fill="#fff"/>',
    ...body,
    '</svg>',
    '',
  ].join('\n');
}

if (typeof module !== 'undefined') {
  module.exports = renderSheet;
}
