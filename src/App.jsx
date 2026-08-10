import './App.css'
import GameBoard from './components/GameBoard'
import { createFoodPair, invertDirection, queueDirection, samePosition } from './game/gameUtils'
import { useEffect, useRef, useState } from 'react'

const STARTING_SEGMENTS = [[5, 5], [4, 5], [3, 5]];
const KEY_DIRECTIONS = {
  ArrowRight: 'RIGHT',
  ArrowLeft: 'LEFT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
};
const CONFUSION_DURATION_MS = 10_000;

function App() {
  // The first segment is the head; each pair is [column, row].
  const [segments, setSegments] = useState(STARTING_SEGMENTS);
  const [foods, setFoods] = useState(() => createFoodPair(STARTING_SEGMENTS, 'RIGHT'));
  const [direction, setDirection] = useState('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [streakColor, setStreakColor] = useState(null);
  const [sameColorCount, setSameColorCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [rewardColor, setRewardColor] = useState(null);
  const [swallowEffect, setSwallowEffect] = useState(null);
  const [tailEffect, setTailEffect] = useState(null);
  const [confusionSeconds, setConfusionSeconds] = useState(0);
  const [confusionEndsAt, setConfusionEndsAt] = useState(null);
  const currentDirectionRef = useRef('RIGHT');
  const directionQueueRef = useRef([]);
  const gameOverRef = useRef(false);
  const effectIdRef = useRef(0);
  const confusionEndsAtRef = useRef(0);

  // Remove collection feedback after a short moment.
  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 1100);
    return () => clearTimeout(timeout);
  }, [feedback]);

  // Keep the completion reward visible long enough to read.
  useEffect(() => {
    if (!rewardColor) return undefined;
    const timeout = setTimeout(() => setRewardColor(null), 900);
    return () => clearTimeout(timeout);
  }, [rewardColor]);

  useEffect(() => {
    if (!swallowEffect) return undefined;
    const timeout = setTimeout(() => setSwallowEffect(null), 300);
    return () => clearTimeout(timeout);
  }, [swallowEffect]);

  useEffect(() => {
    if (!tailEffect) return undefined;
    const timeout = setTimeout(() => setTailEffect(null), 600);
    return () => clearTimeout(timeout);
  }, [tailEffect]);

  // Use elapsed time so confusion is independent of snake movement.
  useEffect(() => {
    if (!confusionEndsAt) return undefined;

    const updateCountdown = () => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((confusionEndsAt - Date.now()) / 1000),
      );
      setConfusionSeconds(remainingSeconds);

      if (remainingSeconds === 0) {
        confusionEndsAtRef.current = 0;
        setConfusionEndsAt(null);
        setFeedback({ type: 'restored', text: 'CONTROLS RESTORED' });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [confusionEndsAt]);

  // Keyboard input changes direction; the timer below moves the snake.
  useEffect(() => {
    const handleKeyDown = (event) => {
      const requestedDirection = KEY_DIRECTIONS[event.key];

      if (!requestedDirection) return;

      event.preventDefault();
      if (event.repeat || gameOverRef.current) return;

      const nextDirection = Date.now() < confusionEndsAtRef.current
        ? invertDirection(requestedDirection)
        : requestedDirection;

      // Queue at most two valid turns and consume one on each game tick.
      directionQueueRef.current = queueDirection(
        directionQueueRef.current,
        currentDirectionRef.current,
        nextDirection,
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Move one grid cell, then handle collisions and eggs.
  useEffect(() => {
    if (gameOver) return undefined;

    const timer = setInterval(() => {
      const queuedDirection = directionQueueRef.current.shift();
      const movementDirection = queuedDirection ?? currentDirectionRef.current;
      currentDirectionRef.current = movementDirection;
      setDirection(movementDirection);

      setSegments((previousSegments) => {
        const head = previousSegments[0];
        let newHead;

        if (movementDirection === 'RIGHT') newHead = [head[0] + 1, head[1]];
        if (movementDirection === 'LEFT') newHead = [head[0] - 1, head[1]];
        if (movementDirection === 'UP') newHead = [head[0], head[1] - 1];
        if (movementDirection === 'DOWN') newHead = [head[0], head[1] + 1];

        const outsideBoard =
          newHead[0] < 0 || newHead[0] > 19 ||
          newHead[1] < 0 || newHead[1] > 19;
        const hitBody = previousSegments
          .slice(0, -1)
          .some((segment) => samePosition(segment, newHead));

        if (outsideBoard || hitBody) {
          gameOverRef.current = true;
          directionQueueRef.current = [];
          confusionEndsAtRef.current = 0;
          setConfusionEndsAt(null);
          setConfusionSeconds(0);
          setGameOver(true);
          return previousSegments;
        }

        const eatenFood = foods.find((food) => samePosition(newHead, food.position));

        if (eatenFood) {
          const effectId = effectIdRef.current + 1;
          effectIdRef.current = effectId;
          setSwallowEffect({ id: effectId, color: eatenFood.color });

          if (eatenFood.isHazard) {
            // Clear old turns so only new key presses use reversed controls.
            directionQueueRef.current = [];
            const confusionEnd = Date.now() + CONFUSION_DURATION_MS;
            confusionEndsAtRef.current = confusionEnd;
            setConfusionEndsAt(confusionEnd);
            setConfusionSeconds(CONFUSION_DURATION_MS / 1000);
            setFeedback({
              type: 'confusion',
              text: 'CONTROLS REVERSED · 10 SECONDS',
            });
            setFoods((currentFoods) => currentFoods.filter((food) => !food.isHazard));
            return [newHead, ...previousSegments.slice(0, -1)];
          }

          const nextCount = eatenFood.color === streakColor ? sameColorCount + 1 : 1;
          setScore((currentScore) => currentScore + 1);

          if (nextCount === 3) {
            setStreakColor(null);
            setSameColorCount(0);
            // The third matching egg removes one segment instead of growing.
            const shorterSnake = [newHead, ...previousSegments.slice(0, -2)];
            const safeSnake = shorterSnake.length > 0 ? shorterSnake : [newHead];
            // This is the extra tail cell lost to shrinking, not normal movement.
            const removedTail = previousSegments.at(-2);
            if (removedTail) {
              setTailEffect({ id: effectId, color: eatenFood.color, position: removedTail });
            }
            setRewardColor(eatenFood.color);
            setFeedback({ type: 'shrink', text: 'STREAK COMPLETE · −1 SEGMENT' });
            setFoods(createFoodPair(safeSnake, movementDirection));
            return safeSnake;
          }

          setStreakColor(eatenFood.color);
          setSameColorCount(nextCount);
          const longerSnake = [newHead, ...previousSegments];
          setFeedback({
            type: 'collect',
            text: `${eatenFood.color.toUpperCase()} STREAK · ${nextCount}/3`,
          });
          setFoods(createFoodPair(longerSnake, movementDirection, eatenFood.color, nextCount));
          return longerSnake;
        }

        return [newHead, ...previousSegments.slice(0, -1)];
      });
    }, 250);

    return () => clearInterval(timer);
  }, [foods, gameOver, sameColorCount, streakColor]);

  const resetGame = () => {
    currentDirectionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    gameOverRef.current = false;
    confusionEndsAtRef.current = 0;
    setSegments(STARTING_SEGMENTS);
    setFoods(createFoodPair(STARTING_SEGMENTS, 'RIGHT'));
    setDirection('RIGHT');
    setGameOver(false);
    setScore(0);
    setStreakColor(null);
    setSameColorCount(0);
    setFeedback(null);
    setRewardColor(null);
    setSwallowEffect(null);
    setTailEffect(null);
    setConfusionSeconds(0);
    setConfusionEndsAt(null);
  };

  return (
    <main>
      <h1>SnakeStreak</h1>
      <p>Choose a color, build a three-egg streak, and survive.</p>
      <div className="game-stats">
        <span>Score <strong>{score}</strong></span>
        <span>Length <strong>{segments.length}</strong></span>
        <span className={`streak-status ${streakColor ? `streak-${streakColor}` : ''}`}>
          {streakColor ? `${streakColor} streak` : 'Choose a color'}
          <strong>{sameColorCount}/3</strong>
          <span className="streak-dots" aria-label={`${sameColorCount} of 3 eggs`}>
            {[0, 1, 2].map((dot) => (
              <i key={dot} className={dot < sameColorCount ? 'filled' : ''} />
            ))}
          </span>
        </span>
      </div>
      <GameBoard
        segments={segments}
        foods={foods}
        rewardColor={rewardColor}
        swallowEffect={swallowEffect}
        tailEffect={tailEffect}
        confused={confusionSeconds > 0}
      />
      {feedback && <div className={`game-feedback ${feedback.type}`}>{feedback.text}</div>}
      {confusionSeconds > 0 && (
        <div className="confusion-status" role="status">
          <span>CONTROLS REVERSED <strong>{confusionSeconds}s</strong></span>
          <small>Press the opposite arrow to move where you want.</small>
        </div>
      )}
      {gameOver ? (
        <>
          <h2>GAME OVER</h2>
          <button onClick={resetGame}>Restart</button>
        </>
      ) : (
        <>
          <h2>Use the arrow keys to steer</h2>
          <h2>Direction: {direction}</h2>
        </>
      )}
    </main>
  );
}

export default App
