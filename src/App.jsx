import './App.css'
import GameBoard from './components/GameBoard'
import { createFood, samePosition } from './game/gameUtils'
import { useState, useEffect } from 'react'

const STARTING_SEGMENTS = [[5, 5], [4, 5], [3, 5]];

function App() {
  // The first segment is the head, each pair is [column, row].
  const [segments, setSegments] = useState(STARTING_SEGMENTS);
  const [food, setFood] = useState(() => createFood(STARTING_SEGMENTS));
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [streakColor, setStreakColor] = useState(null);
  const [sameColorCount, setSameColorCount] = useState(0);

  // Keyboard input changes direction, the timer below moves the snake.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const nextDirections = {
        ArrowRight: 'RIGHT',
        ArrowLeft: 'LEFT',
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
      };
      const nextDirection = nextDirections[event.key];

      if (!nextDirection) return;

      event.preventDefault();

      const reverseDirections = {
        RIGHT: 'LEFT',
        LEFT: 'RIGHT',
        UP: 'DOWN',
        DOWN: 'UP',
      };

      if (nextDirection !== reverseDirections[direction]) {
        setDirection(nextDirection);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  // Move one grid cell, then handle collisions and food.
  useEffect(() => {
    if (gameOver) return undefined;

    const timer = setInterval(() => {
      setSegments((previousSegments) => {
        const head = previousSegments[0];
        let newHead;

        if (direction === 'RIGHT') newHead = [head[0] + 1, head[1]];
        if (direction === 'LEFT') newHead = [head[0] - 1, head[1]];
        if (direction === 'UP') newHead = [head[0], head[1] - 1];
        if (direction === 'DOWN') newHead = [head[0], head[1] + 1];

        const outsideBoard =
          newHead[0] < 0 || newHead[0] > 19 ||
          newHead[1] < 0 || newHead[1] > 19;
        const hitBody = previousSegments
          .slice(0, -1)
          .some((segment) => samePosition(segment, newHead));

        if (outsideBoard || hitBody) {
          setGameOver(true);
          return previousSegments;
        }

        const ateFood = samePosition(newHead, food.position);

        if (ateFood) {
          const nextCount = food.color === streakColor ? sameColorCount + 1 : 1;
          setScore((currentScore) => currentScore + 1);

          if (nextCount === 3) {
            setStreakColor(null);
            setSameColorCount(0);
            // The third matching egg removes one segment.
            const shorterSnake = [newHead, ...previousSegments.slice(0, -2)];
            setFood(createFood(shorterSnake));
            return shorterSnake.length > 0 ? shorterSnake : [newHead];
          }

          setStreakColor(food.color);
          setSameColorCount(nextCount);
          const longerSnake = [newHead, ...previousSegments];
          setFood(createFood(longerSnake));
          return longerSnake;
        }

        return [newHead, ...previousSegments.slice(0, -1)];
      });
    }, 250);

    return () => clearInterval(timer);
  }, [direction, food, gameOver, sameColorCount, streakColor]);

  const resetGame = () => {
    setSegments(STARTING_SEGMENTS);
    setFood(createFood(STARTING_SEGMENTS));
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setStreakColor(null);
    setSameColorCount(0);
  };

  return (
    <main>
      <h1>SnakeStreak</h1>
      <p>Eat eggs, build a color streak, and survive as long as possible.</p>
      <div>
        <GameBoard segments={segments} food={food} />
        {gameOver ? (
          <>
            <h2>GAME OVER</h2>
            <button onClick={resetGame}>Restart</button>
          </>
        ) : (
          <>
            <h2>Use the arrow keys to steer</h2>
            <h2>Direction: {direction}</h2>
            <h2>Score: {score}</h2>
            <h2>Egg streak: {sameColorCount} {streakColor ?? ''}</h2>
          </>
        )}
      </div>
    </main>
  );
}

export default App
