const FOOD_COLORS = ['yellow', 'pink', 'blue'];

export function createFood(snake) {
  let position;

  do {
    position = [
      Math.floor(Math.random() * 20),
      Math.floor(Math.random() * 20),
    ];
  } while (snake.some(([x, y]) => x === position[0] && y === position[1]));

  return {
    position,
    color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
  };
}

export function samePosition(first, second) {
  return first[0] === second[0] && first[1] === second[1];
}
