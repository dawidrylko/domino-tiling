const fs = require('fs');
const path = require('path');
const renderSheet = require('./svg');

const TILINGS_PER_SHEET = 100;

function generateSheetFileName(first, last, padWidth) {
  const pad = number => String(number).padStart(padWidth, '0');

  return `tilings-${pad(first)}-${pad(last)}.svg`;
}

/**
 * Writes tilings to SVG sheets of up to 100 tilings each.
 * @param {Iterable<Domino[]>} tilings The tilings to render.
 * @param {Object} options Rendering options.
 * @property {string} options.directory The output directory, created on the first write.
 * @property {number} options.rowCount The number of rows.
 * @property {number} options.colCount The number of columns.
 * @property {number} options.offset The number of tilings skipped before the first one.
 * @property {number} options.lastNumber The highest tiling number, used to pad file names.
 * @returns {{ first: number, last: number, file: string }[]} The written sheets.
 */
function writeSvgSheets(tilings, options) {
  const { directory, offset, lastNumber } = options;
  const padWidth = Number.isFinite(lastNumber) ? String(lastNumber).length : 0;
  const sheets = [];
  let sheet = [];
  let rendered = 0;

  const flush = () => {
    const first = offset + rendered - sheet.length + 1;
    const last = offset + rendered;
    const file = path.join(directory, generateSheetFileName(first, last, padWidth));

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(file, renderSheet(sheet, first, options));
    sheets.push({ first, last, file });
    sheet = [];
  };

  for (const tiling of tilings) {
    sheet.push(tiling);
    rendered++;

    if (sheet.length === TILINGS_PER_SHEET) {
      flush();
    }
  }

  if (sheet.length) {
    flush();
  }

  return sheets;
}

module.exports = writeSvgSheets;
