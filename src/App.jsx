import './App.css'
import GameBoard from './components/GameBoard'
import { useState, useEffect } from 'react'

function App() {

  // The first segment is the head, each pair is [column, row].
  const [segments, setSegments] = useState([[5, 5],
        [4, 5],
        [3, 5]]);

  const [food] = useState([[8, 5]]);
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);

  // Keyboard input changes directionm the timer below moves the snake.
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [direction]);

  // Move one grid cell at a fixed interval and remove the old tail.
  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setSegments((prevSegments) => {
        const head = prevSegments[0];
        let newHead;

        if (direction === 'RIGHT') newHead = [head[0] + 1, head[1]];
        if (direction === 'LEFT') newHead = [head[0] - 1, head[1]];
        if (direction === 'UP') newHead = [head[0], head[1] - 1];
        if (direction === 'DOWN') newHead = [head[0], head[1] + 1];

        if (newHead[0] < 0 || newHead[0] > 19 || newHead[1] < 0 || newHead[1] > 19) {
          setGameOver(true);
          return prevSegments;
        }

        return [newHead, ...prevSegments.slice(0, -1)];
      });
    }, 250);

    return () => clearInterval(timer);
  }, [direction, gameOver]);


  return (
    <main>
      <h1>SnakeStreak</h1>
      <p>A strategic twist on the classic Snake game. Eat three eggs of the same colour in a row to shrink the snake.</p>
      <div>
        <GameBoard segments={segments} food={food} />
        {gameOver ? (
          <h2>gameOver</h2>
        ) : (
          <>
            <h2>Use the arrow keys to steer</h2>
            <h2>Direction: {direction}</h2>
            <h2>Snake length: {segments.length}</h2>
          </>
        )}
      </div>
    </main>
  );
}

export default App
