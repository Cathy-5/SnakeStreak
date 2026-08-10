export const BOARD_SIZE = 20;
export const FOOD_COLORS = ['brown', 'pink', 'blue'];

const REVERSE_DIRECTIONS = {
  RIGHT: 'LEFT',
  LEFT: 'RIGHT',
  UP: 'DOWN',
  DOWN: 'UP',
};

export function invertDirection(direction) {
  return REVERSE_DIRECTIONS[direction];
}

export function queueDirection(queue, currentDirection, nextDirection) {
  if (queue.length >= 2) return queue;

  const directionToCompare = queue.at(-1) ?? currentDirection;
  if (
    nextDirection === directionToCompare ||
    nextDirection === REVERSE_DIRECTIONS[directionToCompare]
  ) {
    return queue;
  }

  return [...queue, nextDirection];
}

export function samePosition(first, second) {
  return first[0] === second[0] && first[1] === second[1];
}

export function getNextHead([x, y], direction) {
  if (direction === 'RIGHT') return [x + 1, y];
  if (direction === 'LEFT') return [x - 1, y];
  if (direction === 'UP') return [x, y - 1];
  return [x, y + 1];
}

function positionsForZone(zone) {
  const positions = [];

  for (let x = 0; x < BOARD_SIZE; x += 1) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      const distanceFromEdge = Math.min(x, y, BOARD_SIZE - 1 - x, BOARD_SIZE - 1 - y);
      const isAllowed =
        zone === 'center' ? distanceFromEdge >= 4 :
        zone === 'edge-4' ? distanceFromEdge < 4 :
        zone === 'edge-2' ? distanceFromEdge < 2 : true;

      if (isAllowed) positions.push([x, y]);
    }
  }

  return positions;
}

function createFood({ snake, color, zone, occupiedFoods = [], avoidPosition, isTarget = false }) {
  const blocked = [
    ...snake,
    ...occupiedFoods.map((food) => food.position),
    avoidPosition,
  ].filter(Boolean);
  let candidates = positionsForZone(zone).filter((position) => {
    return !blocked.some((blockedPosition) => samePosition(position, blockedPosition));
  });

  // Fall back to the full board if a preferred zone has no valid cell.
  if (candidates.length === 0) {
    candidates = positionsForZone('normal').filter((position) => {
      return !blocked.some((blockedPosition) => samePosition(position, blockedPosition));
    });
  }

  const position = candidates[Math.floor(Math.random() * candidates.length)];
  return { position, color, isTarget };
}

function randomDifferentColor(color) {
  const choices = FOOD_COLORS.filter((candidate) => candidate !== color);
  return choices[Math.floor(Math.random() * choices.length)];
}

function createConfusionFood(snake, targetFood, occupiedFoods, avoidPosition) {
  const [targetX, targetY] = targetFood.position;
  const blocked = [...snake, ...occupiedFoods.map((food) => food.position), avoidPosition];
  const nearbyPositions = [
    [targetX - 1, targetY],
    [targetX + 1, targetY],
    [targetX, targetY - 1],
    [targetX, targetY + 1],
    [targetX - 1, targetY - 1],
    [targetX + 1, targetY - 1],
    [targetX - 1, targetY + 1],
    [targetX + 1, targetY + 1],
  ];
  const candidates = nearbyPositions.filter(([x, y]) => {
    const insideBoard = x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    return insideBoard && !blocked.some((position) => samePosition(position, [x, y]));
  });

  if (candidates.length === 0) return null;

  return {
    position: candidates[Math.floor(Math.random() * candidates.length)],
    color: 'purple',
    isHazard: true,
  };
}

export function createGoldenFood(snake, direction, occupiedFoods = []) {
  return {
    ...createFood({
      snake,
      color: 'gold',
      zone: 'edge-2',
      occupiedFoods,
      avoidPosition: getNextHead(snake[0], direction),
    }),
    isGolden: true,
  };
}

export function createFoodPair(
  snake,
  direction,
  streakColor = null,
  streakCount = 0,
  options = {},
) {
  const { occupiedFoods = [], includeHazard = true } = options;
  const avoidPosition = getNextHead(snake[0], direction);

  if (!streakColor) {
    const firstColor = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    const firstFood = createFood({
      snake,
      color: firstColor,
      zone: 'normal',
      occupiedFoods,
      avoidPosition,
    });
    const secondFood = createFood({
      snake,
      color: randomDifferentColor(firstColor),
      zone: 'normal',
      occupiedFoods: [...occupiedFoods, firstFood],
      avoidPosition,
    });

    return [firstFood, secondFood];
  }

  const targetFood = createFood({
    snake,
    color: streakColor,
    zone: streakCount >= 2 ? 'edge-2' : 'edge-4',
    occupiedFoods,
    avoidPosition,
    isTarget: true,
  });
  const alternativeFood = createFood({
    snake,
    color: randomDifferentColor(streakColor),
    zone: 'center',
    occupiedFoods: [...occupiedFoods, targetFood],
    avoidPosition,
  });

  if (streakCount >= 2 && includeHazard) {
    const confusionFood = createConfusionFood(
      snake,
      targetFood,
      [...occupiedFoods, targetFood, alternativeFood],
      avoidPosition,
    );

    if (confusionFood) return [targetFood, alternativeFood, confusionFood];
  }

  return [targetFood, alternativeFood];
}
