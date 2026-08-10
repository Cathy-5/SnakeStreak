export const RECORDS_STORAGE_KEY = 'snakestreak-records-v1';

const EMPTY_RECORD = {
  bestEggs: 0,
  bestStreaks: 0,
  gamesPlayed: 0,
  boardsCleared: 0,
};

export function createEmptyRecords() {
  return {
    easy: { ...EMPTY_RECORD },
    normal: { ...EMPTY_RECORD },
    difficult: { ...EMPTY_RECORD },
  };
}

export function loadRecords() {
  const emptyRecords = createEmptyRecords();

  try {
    const savedRecords = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY));
    if (!savedRecords) return emptyRecords;

    return Object.fromEntries(Object.keys(emptyRecords).map((difficulty) => [
      difficulty,
      { ...EMPTY_RECORD, ...savedRecords[difficulty] },
    ]));
  } catch {
    return emptyRecords;
  }
}

export function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // The game still works when storage is unavailable.
  }
}

export function updatePersonalBest(setRecords, difficulty, field, value) {
  setRecords((currentRecords) => {
    if (value <= currentRecords[difficulty][field]) return currentRecords;

    const nextRecords = {
      ...currentRecords,
      [difficulty]: {
        ...currentRecords[difficulty],
        [field]: value,
      },
    };
    saveRecords(nextRecords);
    return nextRecords;
  });
}

export function recordFinishedRun(setRecords, difficulty, clearedBoard) {
  setRecords((currentRecords) => {
    const currentDifficulty = currentRecords[difficulty];
    const nextRecords = {
      ...currentRecords,
      [difficulty]: {
        ...currentDifficulty,
        gamesPlayed: currentDifficulty.gamesPlayed + 1,
        boardsCleared: currentDifficulty.boardsCleared + (clearedBoard ? 1 : 0),
      },
    };
    saveRecords(nextRecords);
    return nextRecords;
  });
}
