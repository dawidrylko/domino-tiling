const { files: filesInt, testCases: testCasesInt } = require('./dominoTilingTests.json');
const { files: filesBigInt, testCases: testCasesBigInt } = require('./dominoTilingTests-BigInt.json');
const { files: filesRectangles, testCases: testCasesRectangles } = require('./dominoTilingTests-Rectangles.json');
const { files: filesDomicule, testCases: testCasesDomicule } = require('./domiculeTilingTests.json');
const {
  files: filesDomiculeRectangles,
  testCases: testCasesDomiculeRectangles,
} = require('./domiculeTilingTests-Rectangles.json');

module.exports = {
  filesInt,
  testCasesInt,
  filesBigInt,
  testCasesBigInt,
  filesRectangles,
  testCasesRectangles,
  filesDomicule,
  testCasesDomicule,
  filesDomiculeRectangles,
  testCasesDomiculeRectangles,
};
