import './App.css'
import GameBoard from './components/GameBoard'
import {
  createFoodPair,
  createGoldenFood,
  getNextHead,
  invertDirection,
  queueDirection,
  samePosition,
} from './game/gameUtils'
import { useEffect, useRef, useState } from 'react'

const STARTING_SEGMENTS = [[5, 5], [4, 5], [3, 5]];
const KEY_DIRECTIONS = {
  ArrowRight: 'RIGHT',
  ArrowLeft: 'LEFT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
};
const DIFFICULTIES = {
  easy: {
    label: 'Easy',
    moveInterval: 320,
    confusionDuration: 5_000,
    goldenDuration: [7, 9],
    summary: 'Slow · Purple 5s · Gold 7–9s',
  },
  normal: {
    label: 'Normal',
    moveInterval: 250,
    confusionDuration: 10_000,
    goldenDuration: [5, 7],
    summary: 'Balanced · Purple 10s · Gold 5–7s',
  },
  difficult: {
    label: 'Difficult',
    moveInterval: 180,
    confusionDuration: 15_000,
    goldenDuration: [3, 5],
    summary: 'Fast · Purple 15s · Gold 3–5s',
  },
};
const randomGoldenThreshold = () => 8 + Math.floor(Math.random() * 5);
const randomGoldenDuration = ([minimum, maximum]) => (
  minimum + Math.floor(Math.random() * (maximum - minimum + 1))
);

function App() {
  // The first segment is the head; each pair is [column, row].
  const [segments, setSegments] = useState(STARTING_SEGMENTS);
  const [foods, setFoods] = useState(() => createFoodPair(STARTING_SEGMENTS, 'RIGHT'));
  const [gameOver, setGameOver] = useState(false);
  const [eggsEaten, setEggsEaten] = useState(0);
  const [streaksCompleted, setStreaksCompleted] = useState(0);
  const [streakColor, setStreakColor] = useState(null);
  const [sameColorCount, setSameColorCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [rewardColor, setRewardColor] = useState(null);
  const [swallowEffect, setSwallowEffect] = useState(null);
  const [tailEffect, setTailEffect] = useState(null);
  const [confusionSeconds, setConfusionSeconds] = useState(0);
  const [confusionEndsAt, setConfusionEndsAt] = useState(null);
  const [goldenSeconds, setGoldenSeconds] = useState(0);
  const [goldenEndsAt, setGoldenEndsAt] = useState(null);
  const [goldenCharge, setGoldenCharge] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [crashEffect, setCrashEffect] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [difficulty, setDifficulty] = useState('normal');
  const currentDirectionRef = useRef('RIGHT');
  const directionQueueRef = useRef([]);
  const gameOverRef = useRef(false);
  const effectIdRef = useRef(0);
  const confusionEndsAtRef = useRef(0);
  const goldenEndsAtRef = useRef(0);
  const ordinaryEggsCollectedRef = useRef(0);
  const goldenThresholdRef = useRef(randomGoldenThreshold());
  const difficultySettings = DIFFICULTIES[difficulty];

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

  // Let the wall impact finish before covering the board.
  useEffect(() => {
    if (!crashEffect) return undefined;
    const timeout = setTimeout(() => setShowGameOver(true), 500);
    return () => clearTimeout(timeout);
  }, [crashEffect]);

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

  useEffect(() => {
    if (!goldenEndsAt) return undefined;

    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.ceil((goldenEndsAt - Date.now()) / 1000));
      setGoldenSeconds(remainingSeconds);

      if (remainingSeconds === 0) {
        goldenEndsAtRef.current = 0;
        setGoldenEndsAt(null);
        setFoods((currentFoods) => currentFoods.filter((food) => !food.isGolden));
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [goldenEndsAt]);

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
      const nextQueue = queueDirection(
        directionQueueRef.current,
        currentDirectionRef.current,
        nextDirection,
      );
      if (nextQueue !== directionQueueRef.current) setMouthOpen(false);
      directionQueueRef.current = nextQueue;
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

      const placeNextFoods = (
        nextSnake,
        nextStreakColor = null,
        nextStreakCount = 0,
        preserveGolden = true,
      ) => {
        const activeGolden = preserveGolden && Date.now() < goldenEndsAtRef.current
          ? foods.find((food) => food.isGolden)
          : null;
        const activeHazard = foods.find((food) => food.isHazard) ?? null;
        const persistentFoods = [activeGolden, activeHazard].filter(Boolean);
        const nextFoods = createFoodPair(
          nextSnake,
          movementDirection,
          nextStreakColor,
          nextStreakCount,
          {
            occupiedFoods: persistentFoods,
            includeHazard: persistentFoods.length === 0,
          },
        );

        if (persistentFoods.length > 0) {
          setFoods([...nextFoods, ...persistentFoods]);
          return;
        }

        const goldenReady = ordinaryEggsCollectedRef.current >= goldenThresholdRef.current;
        const hasConfusionEgg = nextFoods.some((food) => food.isHazard);

        if (goldenReady && !hasConfusionEgg && !goldenCharge) {
          const goldenFood = createGoldenFood(nextSnake, movementDirection, nextFoods);
          const durationSeconds = randomGoldenDuration(difficultySettings.goldenDuration);
          const expirationTime = Date.now() + durationSeconds * 1000;
          ordinaryEggsCollectedRef.current = 0;
          goldenThresholdRef.current = randomGoldenThreshold();
          goldenEndsAtRef.current = expirationTime;
          setGoldenEndsAt(expirationTime);
          setGoldenSeconds(durationSeconds);
          setFoods([...nextFoods, goldenFood]);
          return;
        }

        setFoods(nextFoods);
      };

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
          goldenEndsAtRef.current = 0;
          setConfusionEndsAt(null);
          setConfusionSeconds(0);
          setGoldenEndsAt(null);
          setGoldenSeconds(0);
          setGoldenCharge(false);
          setMouthOpen(false);
          if (outsideBoard) {
            const effectId = effectIdRef.current + 1;
            effectIdRef.current = effectId;
            setCrashEffect({
              id: effectId,
              direction: movementDirection,
              position: head,
            });
            setShowGameOver(false);
          } else {
            setCrashEffect(null);
            setShowGameOver(true);
          }
          setGameOver(true);
          return previousSegments;
        }

        const eatenFood = foods.find((food) => samePosition(newHead, food.position));

        if (eatenFood) {
          const effectId = effectIdRef.current + 1;
          effectIdRef.current = effectId;
          setEggsEaten((currentTotal) => currentTotal + 1);
          setMouthOpen(false);
          setSwallowEffect({ id: effectId, color: eatenFood.color });

          if (eatenFood.isGolden) {
            goldenEndsAtRef.current = 0;
            setGoldenEndsAt(null);
            setGoldenSeconds(0);
            if (!streakColor) {
              setGoldenCharge(true);
              setFeedback({
                type: 'golden',
                text: 'GOLDEN CHARGE · NEXT EGG COUNTS TWICE',
              });
              setFoods((currentFoods) => currentFoods.filter((food) => !food.isGolden));
              return [newHead, ...previousSegments.slice(0, -1)];
            }

            const wildcardCount = sameColorCount + 1;
            if (wildcardCount >= 3) {
              setStreakColor(null);
              setSameColorCount(0);
              setStreaksCompleted((currentTotal) => currentTotal + 1);
              const shorterSnake = [newHead, ...previousSegments.slice(0, -2)];
              const safeSnake = shorterSnake.length > 0 ? shorterSnake : [newHead];
              const removedTail = previousSegments.at(-2);
              if (removedTail) {
                setTailEffect({ id: effectId, color: streakColor, position: removedTail });
              }
              setRewardColor(streakColor);
              setFeedback({ type: 'shrink', text: 'GOLDEN STREAK COMPLETE · −1 SEGMENT' });
              placeNextFoods(safeSnake, null, 0, false);
              return safeSnake;
            }

            setSameColorCount(wildcardCount);
            setFeedback({
              type: 'golden',
              text: `GOLD WILDCARD · ${streakColor.toUpperCase()} ${wildcardCount}/3`,
            });
            const movingSnake = [newHead, ...previousSegments.slice(0, -1)];
            placeNextFoods(movingSnake, streakColor, wildcardCount, false);
            return movingSnake;
          }

          if (eatenFood.isHazard) {
            // Clear old turns so only new key presses use reversed controls.
            directionQueueRef.current = [];
            const confusionEnd = Date.now() + difficultySettings.confusionDuration;
            confusionEndsAtRef.current = confusionEnd;
            setConfusionEndsAt(confusionEnd);
            setConfusionSeconds(difficultySettings.confusionDuration / 1000);
            setFeedback({
              type: 'confusion',
              text: `CONTROLS REVERSED · ${difficultySettings.confusionDuration / 1000} SECONDS`,
            });
            setFoods((currentFoods) => currentFoods.filter((food) => !food.isHazard));
            return [newHead, ...previousSegments.slice(0, -1)];
          }

          ordinaryEggsCollectedRef.current += 1;
          const countIncrease = goldenCharge ? 2 : 1;
          const nextCount = eatenFood.color === streakColor
            ? sameColorCount + countIncrease
            : countIncrease;
          if (goldenCharge) setGoldenCharge(false);
          if (nextCount >= 3) {
            setStreakColor(null);
            setSameColorCount(0);
            setStreaksCompleted((currentTotal) => currentTotal + 1);
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
            placeNextFoods(safeSnake);
            return safeSnake;
          }

          setStreakColor(eatenFood.color);
          setSameColorCount(nextCount);
          const longerSnake = [newHead, ...previousSegments];
          setFeedback({
            type: 'collect',
            text: `${eatenFood.color.toUpperCase()} STREAK · ${nextCount}/3`,
          });
          placeNextFoods(longerSnake, eatenFood.color, nextCount);
          return longerSnake;
        }

        const nextPosition = getNextHead(newHead, movementDirection);
        setMouthOpen(foods.some((food) => samePosition(nextPosition, food.position)));
        return [newHead, ...previousSegments.slice(0, -1)];
      });
    }, difficultySettings.moveInterval);

    return () => clearInterval(timer);
  }, [difficultySettings, foods, gameOver, goldenCharge, sameColorCount, streakColor]);

  const resetGame = (nextDifficulty = difficulty, announceMode = false) => {
    currentDirectionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    gameOverRef.current = false;
    confusionEndsAtRef.current = 0;
    goldenEndsAtRef.current = 0;
    ordinaryEggsCollectedRef.current = 0;
    goldenThresholdRef.current = randomGoldenThreshold();
    setSegments(STARTING_SEGMENTS);
    setFoods(createFoodPair(STARTING_SEGMENTS, 'RIGHT'));
    setGameOver(false);
    setEggsEaten(0);
    setStreaksCompleted(0);
    setStreakColor(null);
    setSameColorCount(0);
    setFeedback(announceMode
      ? { type: 'mode', text: `${DIFFICULTIES[nextDifficulty].label.toUpperCase()} MODE` }
      : null);
    setRewardColor(null);
    setSwallowEffect(null);
    setTailEffect(null);
    setConfusionSeconds(0);
    setConfusionEndsAt(null);
    setGoldenSeconds(0);
    setGoldenEndsAt(null);
    setGoldenCharge(false);
    setMouthOpen(false);
    setCrashEffect(null);
    setShowGameOver(false);
    setDifficulty(nextDifficulty);
    setGameId((currentId) => currentId + 1);
  };

  return (
    <main className="app">
      <section className="game-shell" aria-label="SnakeStreak game">
        <header className="game-header">
          <div className="brand" aria-label="SnakeStreak">
            <span className="brand-mark" aria-hidden="true"><i /></span>
            <h1>Snake<span>Streak</span></h1>
          </div>
          <div className="scoreboard">
            <span><small>Eggs</small><strong>{eggsEaten}</strong></span>
            <span><small>Streaks</small><strong>{streaksCompleted}</strong></span>
            <span><small>Size</small><strong>{segments.length}</strong></span>
          </div>
        </header>

        <div className="difficulty-panel">
          <div className="difficulty-picker" aria-label="Game difficulty">
            {Object.entries(DIFFICULTIES).map(([difficultyKey, settings]) => (
              <button
                type="button"
                className={difficulty === difficultyKey ? 'active' : ''}
                aria-pressed={difficulty === difficultyKey}
                key={difficultyKey}
                onClick={() => {
                  if (difficultyKey !== difficulty) resetGame(difficultyKey, true);
                }}
              >
                {settings.label}
              </button>
            ))}
          </div>
          <small>{difficultySettings.summary}</small>
        </div>

        <div className={`streak-status ${streakColor ? `streak-${streakColor}` : ''}`}>
          <span className="streak-label">{streakColor ?? 'Streak'}</span>
          <span className="streak-dots" aria-label={`${sameColorCount} of 3 eggs`}>
            {[0, 1, 2].map((dot) => (
              <i key={dot} className={dot < sameColorCount ? 'filled' : ''} />
            ))}
          </span>
          <strong>{sameColorCount}/3</strong>
        </div>

        <div className="board-frame">
          <GameBoard
            key={gameId}
            segments={segments}
            foods={foods}
            rewardColor={rewardColor}
            swallowEffect={swallowEffect}
            tailEffect={tailEffect}
            confused={confusionSeconds > 0}
            mouthOpen={mouthOpen}
            crashEffect={crashEffect}
            moveInterval={difficultySettings.moveInterval}
          />

          {feedback && <div className={`game-feedback ${feedback.type}`}>{feedback.text}</div>}

          <div className="power-statuses">
            {confusionSeconds > 0 && (
              <div className="confusion-status" role="status">
                <span>Controls reversed <strong>{confusionSeconds}s</strong></span>
                <small>Press the opposite arrow.</small>
              </div>
            )}
            {goldenSeconds > 0 && (
              <div className="golden-status" role="status">
                Golden egg <strong>{goldenSeconds}s</strong>
              </div>
            )}
            {goldenCharge && (
              <div className="golden-status golden-charge" role="status">
                Golden charge <small>Next egg counts twice.</small>
              </div>
            )}
          </div>

          {showGameOver && (
            <div className="game-over">
              <div className="game-over-card">
                <h2>Game over</h2>
                <small>{difficultySettings.label} mode</small>
                <div className="final-stats">
                  <span>
                    <i className="final-icon final-egg" aria-hidden="true">
                      <b /><b /><b />
                    </i>
                    <strong>{eggsEaten}</strong>
                    <small>Eggs eaten</small>
                  </span>
                  <span>
                    <i className="final-icon final-streak" aria-hidden="true">
                      <b /><b /><b />
                    </i>
                    <strong>{streaksCompleted}</strong>
                    <small>Streaks</small>
                  </span>
                </div>
                <button onClick={() => resetGame()}>Play again</button>
              </div>
            </div>
          )}
        </div>

        <p className="sr-only">Use the arrow keys to steer the snake.</p>
      </section>
    </main>
  );
}

export default App
