
import './App.css'
import GameBoard from './components/GameBoard'

function App() {
  return (
  <main>
    <h1>SnakeStreak</h1>
    <p>A strategic twist on the classic Snake game. Eat three eggs of the same colour in a row to shrink the snake.</p>
    <div>
      <GameBoard/>
    </div>
  </main>
  )

}

export default App
