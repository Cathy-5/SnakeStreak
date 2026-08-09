import './App.css'
import GameBoard from './components/GameBoard'
import { useState, useEffect } from 'react'

function App() {

  const [segments, setSegments] = useState([[5, 5],
        [4, 5],
        [3, 5]]);

  const [food, setFood] = useState([[8, 5]]);

  // Hanlde key down
  const handleKeyDown = (event) => {
    // Go right
    if (event.key === 'ArrowRight') {
      setSegments((prevSegments) => {
        const head = prevSegments[0];
        const newHead = [head[0] + 1, head[1]];

        return [newHead, ...prevSegments.slice(0, -1)];
      });
    }

    // Go left
    if (event.key == 'ArrowLeft') {
      setSegments((prevSegments) => {
        const head = prevSegments[0];
        const newHead = [head[0] - 1, head[1]];

        return [newHead, ...prevSegments.slice(0, -1)];
      });
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  return (
  <main>
    <h1>SnakeStreak</h1>
    <p>A strategic twist on the classic Snake game. Eat three eggs of the same colour in a row to shrink the snake.</p>
    <div >
      <GameBoard segments={segments} food={food} />
      <h2>Press the right arrow key</h2>
      <h2>Snake length: {segments.length}</h2>
    </div>
  </main>
  )

}

export default App
