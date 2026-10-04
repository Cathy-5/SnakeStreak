export const BOARD_SIZE = 16;
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

export function createCrackedEggPosition(snake, foods = []) {
  const head = snake[0];
  const occupied = [...snake, ...foods.map((food) => food.position)];
  const edgeCells = [];
  const openCells = [];

  for (let x = 0; x < BOARD_SIZE; x += 1) {
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      const position = [x, y];
      if (occupied.some((cell) => samePosition(cell, position))) continue;

      const distanceFromHead = Math.abs(head[0] - x) + Math.abs(head[1] - y);
      if (distanceFromHead < 4) continue;

      openCells.push(position);
      if (x === 0 || y === 0 || x === BOARD_SIZE - 1 || y === BOARD_SIZE - 1) {
        edgeCells.push(position);
      }
    }
  }

  const candidates = edgeCells.length ? edgeCells : openCells;
  return candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : null;
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

function createFood({ snake, color, zone, occupiedFoods = [], avoidPosition }) {
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

  if (candidates.length === 0) return null;
  const position = candidates[Math.floor(Math.random() * candidates.length)];
  return { position, color };
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
    anchorPosition: [...targetFood.position],
  };
}

export function createRelocatedConfusionFood(snake, direction, foods) {
  const normalFoods = foods.filter((food) => !food.isHazard);
  const avoidPosition = getNextHead(snake[0], direction);

  for (const anchorFood of normalFoods) {
    const confusionFood = createConfusionFood(
      snake,
      anchorFood,
      foods,
      avoidPosition,
    );
    if (confusionFood) return confusionFood;
  }

  return null;
}

export function createRelocatedConfusionPair(snake, direction, foods, hazard) {
  const anchorFood = foods.find((food) => (
    hazard.anchorPosition && samePosition(food.position, hazard.anchorPosition)
  ));
  if (!anchorFood) return foods;

  const preservedFoods = foods.filter((food) => (
    !food.isHazard && !samePosition(food.position, anchorFood.position)
  ));
  const oldPair = [
    { position: hazard.position },
    { position: anchorFood.position },
  ];
  const avoidPosition = getNextHead(snake[0], direction);
  const nextAnchor = createFood({
    snake,
    color: anchorFood.color,
    zone: 'normal',
    occupiedFoods: [...preservedFoods, ...oldPair],
    avoidPosition,
  });
  if (!nextAnchor) return foods;

  const nextHazard = createConfusionFood(
    snake,
    nextAnchor,
    [...preservedFoods, ...oldPair, nextAnchor],
    avoidPosition,
  );
  if (!nextHazard) return foods;

  return [...preservedFoods, nextAnchor, nextHazard];
}

export function hasAvailableMove(snake, direction) {
  const blockedBody = snake.slice(0, -1);
  return Object.keys(REVERSE_DIRECTIONS).some((candidateDirection) => {
    if (candidateDirection === REVERSE_DIRECTIONS[direction]) return false;

    const [x, y] = getNextHead(snake[0], candidateDirection);
    const insideBoard = x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
    return insideBoard && !blockedBody.some((segment) => samePosition(segment, [x, y]));
  });
}

export function createFoodPair(snake, direction, options = {}) {
  const { occupiedFoods = [], includeHazard = true } = options;
  const avoidPosition = getNextHead(snake[0], direction);
  const firstColor = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
  const firstFood = createFood({
    snake,
    color: firstColor,
    zone: 'normal',
    occupiedFoods,
    avoidPosition,
  });
  if (!firstFood) return [];

  const secondFood = createFood({
    snake,
    color: randomDifferentColor(firstColor),
    zone: 'normal',
    occupiedFoods: [...occupiedFoods, firstFood],
    avoidPosition,
  });
  if (!secondFood) return [firstFood];

  if (!includeHazard) return [firstFood, secondFood];

  const confusionFood = createConfusionFood(
    snake,
    firstFood,
    [...occupiedFoods, firstFood, secondFood],
    avoidPosition,
  );

  return confusionFood
    ? [firstFood, secondFood, confusionFood]
    : [firstFood, secondFood];
}
