const enumerateTilings = require('./enumerator');
const renderSheet = require('./svg');
const renderAscii = require('./ascii');
const writeSvgSheets = require('./sheets');
const takeRange = require('./range');
const { canCount, countTilings } = require('./count');
const { canUnrank, createUnranker, unrankTiling } = require('./unrank');
const { sampleRandomTiling } = require('./cftp');
const {
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  sampleDomiculeTiling,
} = require('./domicule');

module.exports = {
  enumerateTilings,
  renderSheet,
  renderAscii,
  writeSvgSheets,
  takeRange,
  canCount,
  countTilings,
  canUnrank,
  createUnranker,
  unrankTiling,
  sampleRandomTiling,
  canUnrankDomicule,
  createDomiculeUnranker,
  unrankDomiculeTiling,
  sampleDomiculeTiling,
};
