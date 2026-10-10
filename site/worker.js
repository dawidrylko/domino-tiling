const unrankers = new Map();

function getUnranker(board, id) {
  const key = `${board.rowCount}x${board.colCount}`;

  if (!unrankers.has(key)) {
    if (!canUnrank(board)) {
      [...unrankers.keys()]
        .filter(other => !canUnrank(unrankers.get(other)))
        .forEach(other => unrankers.delete(other));
    }

    const unranker = createUnranker(board, progress =>
      postMessage({ id, type: 'progress', progress }),
    );

    unrankers.set(key, unranker);
  }

  return unrankers.get(key);
}

onmessage = ({ data }) => {
  const { id, type, board } = data;

  try {
    const tilings = [];

    if (type === 'page') {
      const unranker = getUnranker(board, id);
      const first = BigInt(data.first);
      const end = first + BigInt(data.count);
      const last = end < unranker.total ? end : unranker.total;

      for (let rank = first; rank < last; rank++) {
        tilings.push(unrankTiling(unranker, rank));
      }
    } else if (type === 'random') {
      for (let i = 0; i < data.count; i++) {
        tilings.push(sampleRandomTiling(board));
      }
    }

    postMessage({ id, type: 'result', tilings });
  } catch (error) {
    postMessage({ id, type: 'error', message: error.message });
  }
};
