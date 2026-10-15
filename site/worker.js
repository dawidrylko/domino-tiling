const unrankers = new Map();

const PIECES = {
  domino: {
    canUnrank,
    createUnranker,
    unrankTiling,
    sample: board => sampleRandomTiling(board),
  },
  domicule: {
    canUnrank: canUnrankDomicule,
    createUnranker: createDomiculeUnranker,
    unrankTiling: unrankDomiculeTiling,
    sample: board => sampleDomiculeTiling(board),
  },
};

function getUnranker(board, id) {
  const pieces = PIECES[board.pieces];
  const key = board.id;

  if (!unrankers.has(key)) {
    if (!pieces.canUnrank(board)) {
      [...unrankers.keys()]
        .filter(other => {
          const { board: otherBoard } = unrankers.get(other);
          return !PIECES[otherBoard.pieces].canUnrank(otherBoard);
        })
        .forEach(other => unrankers.delete(other));
    }

    const unranker = pieces.createUnranker(board, progress =>
      postMessage({ id, type: 'progress', progress }),
    );

    unrankers.set(key, { board, unranker });
  }

  return unrankers.get(key).unranker;
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
        tilings.push(PIECES[board.pieces].unrankTiling(unranker, rank));
      }
    } else if (type === 'random') {
      for (let i = 0; i < data.count; i++) {
        tilings.push(PIECES[board.pieces].sample(board));
      }
    }

    postMessage({ id, type: 'result', tilings });
  } catch (error) {
    postMessage({ id, type: 'error', message: error.message });
  }
};
