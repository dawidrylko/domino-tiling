/**
 * Yields the items of an iterable between offset (inclusive) and offset + limit (exclusive).
 * @param {Iterable<*>} iterable The source iterable.
 * @param {number} offset The number of items to skip.
 * @param {number} limit The maximum number of items to yield.
 * @returns {Generator<*>} The selected items.
 */
function* takeRange(iterable, offset, limit) {
  let index = 0;

  for (const item of iterable) {
    if (index >= offset + limit) {
      return;
    }

    if (index >= offset) {
      yield item;
    }

    index++;
  }
}

module.exports = takeRange;
