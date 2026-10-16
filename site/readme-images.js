const fs = require('fs');
const path = require('path');
const { renderSheet, createDomiculeUnranker, unrankDomiculeTiling } = require('../src/renderer');

const ROOT_DIRECTORY = path.join(__dirname, '..');
const BOARD = { rowCount: 8, colCount: 8 };
const SAMPLES = 4;

function sampleRanks(total) {
  const step = total / BigInt(SAMPLES + 1);

  return Array.from({ length: SAMPLES }, (_, i) => step * BigInt(i + 1));
}

function buildReadmeImages() {
  const unranker = createDomiculeUnranker(BOARD);
  const ranks = sampleRanks(unranker.total);
  const tilings = ranks.map(rank => unrankDomiculeTiling(unranker, rank));
  const labels = ranks.map(rank => `#${(rank + BigInt(1)).toLocaleString('en-US')}`);

  return Object.fromEntries(
    renderSheet.STYLES.map(style => [
      `.github/assets/gallery-${style}.svg`,
      renderSheet(tilings, 1, { ...BOARD, style, labels, columns: SAMPLES }),
    ]),
  );
}

if (require.main === module) {
  Object.entries(buildReadmeImages()).forEach(([file, svg]) => {
    fs.writeFileSync(path.join(ROOT_DIRECTORY, file), svg);
    console.log(`Image saved: ${file}`);
  });
}

module.exports = { buildReadmeImages };
