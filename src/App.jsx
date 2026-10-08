import './App.css'
import GameBoard from './components/GameBoard'
import RecordsDashboard from './components/RecordsDashboard'
import SnakeFace from './components/SnakeFace'
import WowSnake from './components/WowSnake'
import {
  createGameAudioBank,
  playGameSound,
  stopAllGameSounds,
  stopGameSound,
  unlockGameAudio,
} from './audio/gameAudio'
import {
  BOARD_SIZE,
  createFoodPair,
  createCrackedEggPosition,
  createRelocatedConfusionPair,
  createRelocatedConfusionFood,
  hasAvailableMove,
  invertDirection,
  queueDirection,
  samePosition,
} from './game/gameUtils'
import {
  createEmptyRecords,
  loadRecords,
  recordFinishedRun,
  saveRecords,
  updatePersonalBest,
} from './game/records'
import { useEffect, useEffectEvent, useRef, useState } from 'react'

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
    moveInterval: 205,
    confusionDuration: 5_000,
    crackedEggs: false,
    purpleOnly: false,
  },
  normal: {
    label: 'Normal',
    moveInterval: 155,
    confusionDuration: 10_000,
    crackedEggs: true,
    crackedEggMoveInterval: 310,
    crackedEggLungeWarning: 1_200,
    crackedEggLungeSteps: 1,
    purpleOnly: false,
  },
  difficult: {
    label: 'Difficult',
    moveInterval: 110,
    confusionDuration: 15_000,
    crackedEggs: true,
    crackedEggMoveInterval: 110,
    crackedEggLungeWarning: 900,
    crackedEggLungeSteps: 2,
    purpleOnly: true,
  },
};
const HAZARD_RELOCATION_DELAY_MS = 900;
const HAZARD_PAIR_LIFETIME_MS = 6_000;
const CRACKED_EGG_WARNING_MS = 3_000;
const CRACKED_EGG_CHASE_MS = 8_000;
const CRACKED_EGG_RESPAWN_DELAY_MS = 15_000;
const PURPLE_SURGE_DURATION_MS = 4_000;
const PURPLE_SURGE_WARNING_MS = 3_000;
const PURPLE_SURGE_INTERVAL_MS = 30_000;
const purpleSurgeDelay = (isFirstSchedule) => (
  isFirstSchedule
    ? PURPLE_SURGE_INTERVAL_MS - PURPLE_SURGE_WARNING_MS
    : PURPLE_SURGE_INTERVAL_MS - PURPLE_SURGE_WARNING_MS - PURPLE_SURGE_DURATION_MS
);
const DIFFICULTY_LABELS = Object.fromEntries(
  Object.entries(DIFFICULTIES).map(([key, settings]) => [key, settings.label]),
);
const getHazardKey = (food) => food
  ? `${food.position.join('-')}:${food.anchorPosition?.join('-')}`
  : null;

function App() {
  // The first segment is the head; each pair is [column, row].
  const [segments, setSegments] = useState(STARTING_SEGMENTS);
  const [direction, setDirection] = useState('RIGHT');
  const [foods, setFoods] = useState(() => createFoodPair(STARTING_SEGMENTS, 'RIGHT'));
  const [gameOver, setGameOver] = useState(false);
  const [eggsEaten, setEggsEaten] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [swallowEffect, setSwallowEffect] = useState(null);
  const [tailEffect, setTailEffect] = useState(null);
  const [confusionSeconds, setConfusionSeconds] = useState(0);
  const [confusionEndsAt, setConfusionEndsAt] = useState(null);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [crashEffect, setCrashEffect] = useState(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameId, setGameId] = useState(0);
  const [difficulty, setDifficulty] = useState('normal');
  const [purpleSurge, setPurpleSurge] = useState(false);
  const [purpleWarningSeconds, setPurpleWarningSeconds] = useState(0);
  const [hazardRelocation, setHazardRelocation] = useState(null);
  const [crackedEgg, setCrackedEgg] = useState(null);
  const crackedEggId = crackedEgg?.id;
  const crackedEggPhase = crackedEgg?.phase;
  const crackedEggEndsAt = crackedEgg?.endsAt;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [records, setRecords] = useState(loadRecords);
  const [showRecords, setShowRecords] = useState(false);
  const [clearRecordsArmed, setClearRecordsArmed] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const difficultySettings = DIFFICULTIES[difficulty];
  const movementInterval = difficultySettings.moveInterval;
  const currentRecord = records[difficulty];
  const activeHazardKey = getHazardKey(foods.find((food) => food.isHazard));
  const currentDirectionRef = useRef('RIGHT');
  const directionQueueRef = useRef([]);
  const gameOverRef = useRef(false);
  const effectIdRef = useRef(0);
  const confusionEndsAtRef = useRef(0);
  const latestSegmentsRef = useRef(STARTING_SEGMENTS);
  const audioBankRef = useRef(null);
  const soundEnabledRef = useRef(true);
  const eggsEatenRef = useRef(0);
  const runRecordedRef = useRef(false);
  const endingQueuedRef = useRef(false);
  const foodsRef = useRef(foods);
  const difficultySettingsRef = useRef(difficultySettings);
  const crackedEggRef = useRef(null);
  const crackedEggUnlockedRef = useRef(false);
  const crackedEggRespawnTimerRef = useRef(null);

  const spawnCrackedEgg = useEffectEvent((snake = latestSegmentsRef.current) => {
    if (gameOverRef.current || crackedEggRef.current) return false;

    const position = createCrackedEggPosition(snake, foodsRef.current);
    if (!position) return false;

    const egg = {
      id: effectIdRef.current + 1,
      position,
      phase: 'warning',
      secondsLeft: CRACKED_EGG_WARNING_MS / 1000,
    };
    crackedEggRef.current = egg;
    setCrackedEgg(egg);
    return true;
  });

  const scheduleCrackedEggRespawn = useEffectEvent(() => {
    clearTimeout(crackedEggRespawnTimerRef.current);
    crackedEggRespawnTimerRef.current = setTimeout(() => {
      crackedEggRespawnTimerRef.current = null;
      spawnCrackedEgg();
    }, CRACKED_EGG_RESPAWN_DELAY_MS);
  });

  useEffect(() => () => clearTimeout(crackedEggRespawnTimerRef.current), []);

  const handleDirectionInput = (requestedDirection) => {
    if (!requestedDirection || gameOverRef.current) return;
    if (soundEnabledRef.current) unlockGameAudio(audioBankRef.current);

    const nextDirection = Date.now() < confusionEndsAtRef.current
      ? invertDirection(requestedDirection)
      : requestedDirection;
    const nextQueue = queueDirection(
      directionQueueRef.current,
      currentDirectionRef.current,
      nextDirection,
    );

    if (nextQueue !== directionQueueRef.current) setMouthOpen(false);
    directionQueueRef.current = nextQueue;
  };
  const handleKeyboardDirection = useEffectEvent(handleDirectionInput);

  const finishRun = useEffectEvent((reason, crashData = null) => {
    if (gameOverRef.current) return;

    gameOverRef.current = true;
    directionQueueRef.current = [];
    confusionEndsAtRef.current = 0;
    stopGameSound(audioBankRef.current, 'poisonState');
    setConfusionEndsAt(null);
    setConfusionSeconds(0);
    setMouthOpen(false);
    setPurpleSurge(false);
    setPurpleWarningSeconds(0);
    setHazardRelocation(null);
    clearTimeout(crackedEggRespawnTimerRef.current);
    crackedEggRespawnTimerRef.current = null;
    crackedEggRef.current = null;
    setCrackedEgg(null);
    setEndReason(reason);

    if (!runRecordedRef.current) {
      runRecordedRef.current = true;
      recordFinishedRun(setRecords, difficulty, reason === 'victory');
    }

    if ((reason === 'wall' || reason === 'cracked') && crashData) {
      if (soundEnabledRef.current) playGameSound(audioBankRef.current, 'crash');
      const effectId = effectIdRef.current + 1;
      effectIdRef.current = effectId;
      setCrashEffect({ id: effectId, kind: reason, ...crashData });
      setShowGameOver(false);
    } else {
      setCrashEffect(null);
      setShowGameOver(true);
    }

    if (reason === 'victory' && soundEnabledRef.current) {
      stopAllGameSounds(audioBankRef.current);
      playGameSound(audioBankRef.current, 'winner');
    }

    setGameOver(true);
  });

  useEffect(() => {
    const audioBank = createGameAudioBank();
    audioBankRef.current = audioBank;
    return () => {
      stopAllGameSounds(audioBank);
      audioBankRef.current = null;
    };
  }, []);

  useEffect(() => {
    latestSegmentsRef.current = segments;
  }, [segments]);

  // Warn before the timed Difficult-mode reversal so players can react.
  useEffect(() => {
    if (difficulty !== 'difficult' || gameOver) return undefined;

    let startTimeout;
    let warningInterval;
    let endTimeout;
    const scheduleNextSurge = (isFirstSchedule = false) => {
      startTimeout = setTimeout(() => {
        if (confusionEndsAtRef.current > Date.now()) {
          scheduleNextSurge();
          return;
        }

        let remainingSeconds = 3;
        setPurpleWarningSeconds(remainingSeconds);
        setFeedback({ type: 'purple', text: 'REVERSE DIRECTION IN 3 SECONDS' });

        warningInterval = setInterval(() => {
          if (confusionEndsAtRef.current > Date.now()) {
            clearInterval(warningInterval);
            setPurpleWarningSeconds(0);
            scheduleNextSurge();
            return;
          }

          remainingSeconds -= 1;
          if (remainingSeconds > 0) {
            setPurpleWarningSeconds(remainingSeconds);
            setFeedback({
              type: 'purple',
              text: `REVERSE DIRECTION IN ${remainingSeconds} SECONDS`,
            });
            return;
          }

          clearInterval(warningInterval);
          setPurpleWarningSeconds(0);
          setPurpleSurge(true);
          const confusionEnd = Date.now() + PURPLE_SURGE_DURATION_MS;
          confusionEndsAtRef.current = confusionEnd;
          setConfusionEndsAt(confusionEnd);
          setConfusionSeconds(PURPLE_SURGE_DURATION_MS / 1000);
          setFeedback({ type: 'purple', text: 'PURPLE SNAKE · CONTROLS REVERSED' });
          endTimeout = setTimeout(() => {
            setPurpleSurge(false);
            scheduleNextSurge();
          }, PURPLE_SURGE_DURATION_MS);
        }, 1_000);
      }, purpleSurgeDelay(isFirstSchedule));
    };

    scheduleNextSurge(true);
    return () => {
      clearTimeout(startTimeout);
      clearInterval(warningInterval);
      clearTimeout(endTimeout);
    };
  }, [difficulty, gameId, gameOver]);

  // Give the player a brief warning, then let the cracked egg chase for a while.
  useEffect(() => {
    if (!crackedEggId || gameOver) return undefined;

    if (crackedEggPhase === 'warning') {
      let secondsLeft = CRACKED_EGG_WARNING_MS / 1000;
      const timer = setInterval(() => {
        const currentEgg = crackedEggRef.current;
        if (!currentEgg || currentEgg.id !== crackedEggId) return;
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          const updatedEgg = { ...currentEgg, secondsLeft };
          crackedEggRef.current = updatedEgg;
          setCrackedEgg(updatedEgg);
          return;
        }

        const chasingEgg = {
          ...currentEgg,
          phase: 'chasing',
          nextMoveAt: Date.now() + difficultySettingsRef.current.crackedEggMoveInterval,
          endsAt: Date.now() + CRACKED_EGG_CHASE_MS,
          secondsLeft: CRACKED_EGG_CHASE_MS / 1000,
        };
        crackedEggRef.current = chasingEgg;
        setCrackedEgg(chasingEgg);
        setFeedback({ type: 'cracked', text: 'IT HATCHED · RUN!' });
      }, 1_000);
      return () => clearInterval(timer);
    }

    if (crackedEggPhase === 'telegraph') {
      const id = crackedEggId;
      const timer = setTimeout(() => {
        const currentEgg = crackedEggRef.current;
        if (!currentEgg || currentEgg.id !== id || currentEgg.phase !== 'telegraph') return;
        const lungingEgg = { ...currentEgg, phase: 'lunging' };
        crackedEggRef.current = lungingEgg;
        setCrackedEgg(lungingEgg);
        setFeedback({ type: 'cracked', text: 'IT’S LUNGING · DODGE!' });
      }, difficultySettingsRef.current.crackedEggLungeWarning);
      return () => clearTimeout(timer);
    }

    const id = crackedEggId;
    const endsAt = crackedEggEndsAt;
    const updateCountdown = () => {
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      const currentEgg = crackedEggRef.current;
      if (!currentEgg || currentEgg.id !== id) return;
      if (secondsLeft === 0) {
        crackedEggRef.current = null;
        setCrackedEgg(null);
        setFeedback({ type: 'cracked', text: 'THE CRACKED EGG GAVE UP' });
        scheduleCrackedEggRespawn();
        return;
      }

      const updatedEgg = { ...currentEgg, secondsLeft };
      crackedEggRef.current = updatedEgg;
      setCrackedEgg(updatedEgg);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [crackedEggEndsAt, crackedEggId, crackedEggPhase, gameOver]);

  // Keep movement logic connected to the latest food and difficulty state.
  useEffect(() => {
    foodsRef.current = foods;
    difficultySettingsRef.current = difficultySettings;
  }, [difficultySettings, foods]);

  // End early when every legal forward turn is blocked.
  useEffect(() => {
    if (gameOver || segments.length < 2) return;
    if (!hasAvailableMove(segments, currentDirectionRef.current)) finishRun('trapped');
  }, [gameOver, segments]);

  // Remove collection feedback after a short moment.
  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 1100);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    if (!swallowEffect) return undefined;
    const timeout = setTimeout(() => setSwallowEffect(null), 700);
    return () => clearTimeout(timeout);
  }, [swallowEffect]);

  useEffect(() => {
    if (!tailEffect) return undefined;
    const timeout = setTimeout(() => setTailEffect(null), 600);
    return () => clearTimeout(timeout);
  }, [tailEffect]);

  // Keep the old hazard dangerous briefly before attaching its replacement.
  useEffect(() => {
    if (!hazardRelocation || gameOver) return undefined;

    const timeout = setTimeout(() => {
      setFoods((currentFoods) => {
        const foodsWithoutHazard = currentFoods.filter((food) => !food.isHazard);
        const nextHazard = createRelocatedConfusionFood(
          latestSegmentsRef.current,
          currentDirectionRef.current,
          foodsWithoutHazard,
        );
        return nextHazard ? [...foodsWithoutHazard, nextHazard] : foodsWithoutHazard;
      });
      setHazardRelocation(null);
    }, HAZARD_RELOCATION_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [gameOver, hazardRelocation]);

  // Cycle an untouched purple egg and its guarded egg as one pair.
  useEffect(() => {
    if (!activeHazardKey || hazardRelocation || gameOver) return undefined;

    const timeout = setTimeout(() => {
      setFoods((currentFoods) => {
        const currentHazard = currentFoods.find((food) => (
          food.isHazard && getHazardKey(food) === activeHazardKey
        ));
        if (!currentHazard) return currentFoods;

        return createRelocatedConfusionPair(
          latestSegmentsRef.current,
          currentDirectionRef.current,
          currentFoods,
          currentHazard,
        );
      });
    }, HAZARD_PAIR_LIFETIME_MS);

    return () => clearTimeout(timeout);
  }, [activeHazardKey, gameOver, hazardRelocation]);

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
        stopGameSound(audioBankRef.current, 'poisonState');
        confusionEndsAtRef.current = 0;
        setConfusionEndsAt(null);
        setFeedback({ type: 'restored', text: 'CONTROLS RESTORED' });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 250);
    return () => clearInterval(timer);
  }, [confusionEndsAt]);

  // Move one grid cell, then handle collisions and eggs.
  useEffect(() => {
    if (gameOver) return undefined;

    const scheduleRunEnding = (reason, crashData = null) => {
      if (endingQueuedRef.current || gameOverRef.current) return;
      endingQueuedRef.current = true;
      queueMicrotask(() => {
        endingQueuedRef.current = false;
        finishRun(reason, crashData);
      });
    };

    const moveOneStep = () => {
      const queuedDirection = directionQueueRef.current.shift();
      const movementDirection = queuedDirection ?? currentDirectionRef.current;
      const currentFoods = foodsRef.current;
      const currentDifficultySettings = difficultySettingsRef.current;
      currentDirectionRef.current = movementDirection;
      setDirection(movementDirection);

      const maybeStartCrackedEgg = (snake) => {
        if (
          !currentDifficultySettings.crackedEggs ||
          crackedEggUnlockedRef.current || crackedEggRef.current ||
          snake.length < STARTING_SEGMENTS.length * 2
        ) return false;

        crackedEggUnlockedRef.current = true;
        return spawnCrackedEgg(snake);
      };

      const placeNextFoods = (nextSnake, preserveHazard = true) => {
        const activeHazard = preserveHazard
          ? currentFoods.find((food) => food.isHazard) ?? null
          : null;
        const persistentFoods = [activeHazard].filter(Boolean);
        const occupiedFoods = crackedEggRef.current
          ? [...persistentFoods, { position: crackedEggRef.current.position }]
          : persistentFoods;
        const nextFoods = createFoodPair(nextSnake, movementDirection, {
          occupiedFoods,
          includeHazard: persistentFoods.length === 0 && preserveHazard,
          purpleOnly: currentDifficultySettings.purpleOnly,
        });

        const hasFoodToCollect = currentDifficultySettings.purpleOnly
          ? nextFoods.length > 0
          : nextFoods.some((food) => !food.isHazard);
        if (!hasFoodToCollect) {
          setFoods([...nextFoods, ...persistentFoods]);
          scheduleRunEnding('victory');
          return;
        }

        setFoods([...nextFoods, ...persistentFoods]);
      };

      const previousSegments = latestSegmentsRef.current;
      // Run collision and effect logic once per tick, outside React's updater callback.
      const nextSegments = (() => {
        const head = previousSegments[0];
        let newHead;

        if (movementDirection === 'RIGHT') newHead = [head[0] + 1, head[1]];
        if (movementDirection === 'LEFT') newHead = [head[0] - 1, head[1]];
        if (movementDirection === 'UP') newHead = [head[0], head[1] - 1];
        if (movementDirection === 'DOWN') newHead = [head[0], head[1] + 1];

        const outsideBoard =
          newHead[0] < 0 || newHead[0] >= BOARD_SIZE ||
          newHead[1] < 0 || newHead[1] >= BOARD_SIZE;
        const hitBody = previousSegments
          .slice(0, -1)
          .some((segment) => samePosition(segment, newHead));

        if (outsideBoard || hitBody) {
          scheduleRunEnding(
            outsideBoard ? 'wall' : 'self',
            outsideBoard ? { direction: movementDirection, position: head } : null,
          );
          return previousSegments;
        }

        const activeCrackedEgg = crackedEggRef.current;
        if (
          activeCrackedEgg?.phase === 'chasing' ||
          activeCrackedEgg?.phase === 'telegraph' ||
          activeCrackedEgg?.phase === 'lunging'
        ) {
          let nextCrackedPosition = activeCrackedEgg.position;
          const eggPath = [activeCrackedEgg.position];
          const target = activeCrackedEgg.phase === 'lunging'
            ? activeCrackedEgg.targetPosition
            : newHead;
          const getNextChaseCell = (from, toward) => {
            const [eggX, eggY] = from;
            const candidates = [
              [eggX + 1, eggY], [eggX - 1, eggY],
              [eggX, eggY + 1], [eggX, eggY - 1],
            ].filter(([x, y]) => (
              x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE &&
              !currentFoods.some((food) => samePosition(food.position, [x, y]))
            ));
            if (!candidates.length) return from;

            const distanceToTarget = ([x, y]) => (
              Math.abs(toward[0] - x) + Math.abs(toward[1] - y)
            );
            const closestDistance = Math.min(...candidates.map(distanceToTarget));
            return candidates.find((position) => distanceToTarget(position) === closestDistance);
          };

          if (
            activeCrackedEgg.phase === 'chasing' &&
            Date.now() + 10 >= activeCrackedEgg.nextMoveAt
          ) {
            const distanceToHead = Math.abs(newHead[0] - nextCrackedPosition[0])
              + Math.abs(newHead[1] - nextCrackedPosition[1]);
            if (distanceToHead <= 3) {
              const aimingEgg = {
                ...activeCrackedEgg,
                phase: 'telegraph',
                targetPosition: [...newHead],
              };
              crackedEggRef.current = aimingEgg;
              setCrackedEgg(aimingEgg);
              setFeedback({ type: 'cracked', text: 'IT’S TAKING AIM · MOVE!' });
            } else {
              nextCrackedPosition = getNextChaseCell(nextCrackedPosition, newHead);
              eggPath.push(nextCrackedPosition);
            }
          } else if (activeCrackedEgg.phase === 'lunging') {
            for (let step = 0; step < currentDifficultySettings.crackedEggLungeSteps; step += 1) {
              if (samePosition(nextCrackedPosition, target)) break;
              const nextCell = getNextChaseCell(nextCrackedPosition, target);
              if (samePosition(nextCell, nextCrackedPosition)) break;
              nextCrackedPosition = nextCell;
              eggPath.push(nextCrackedPosition);
            }
          }

          const nextSnakeBody = [newHead, ...previousSegments.slice(0, -1)];
          const eggTouchesSnake = eggPath
            .some((eggPosition) => nextSnakeBody.some((segment) => (
              samePosition(segment, eggPosition)
            )));

          if (eggTouchesSnake) {
            scheduleRunEnding('cracked', {
              direction: movementDirection,
              position: activeCrackedEgg.position,
            });
            return previousSegments;
          }

          const lungeFinished = activeCrackedEgg.phase === 'lunging' && (
            samePosition(nextCrackedPosition, target) ||
            samePosition(nextCrackedPosition, activeCrackedEgg.position)
          );
          if (eggPath.length > 1 || lungeFinished) {
            const movedEgg = {
              ...activeCrackedEgg,
              position: nextCrackedPosition,
              nextMoveAt: Date.now() + currentDifficultySettings.crackedEggMoveInterval,
              ...(lungeFinished ? { phase: 'chasing', targetPosition: undefined } : {}),
            };
            crackedEggRef.current = movedEgg;
            setCrackedEgg(movedEgg);
          }
        }

        const eatenFood = currentFoods.find((food) => samePosition(newHead, food.position));

        if (eatenFood) {
          const effectId = effectIdRef.current + 1;
          effectIdRef.current = effectId;
          const nextEggTotal = eggsEatenRef.current + 1;
          eggsEatenRef.current = nextEggTotal;
          setEggsEaten(nextEggTotal);
          updatePersonalBest(setRecords, difficulty, 'bestEggs', nextEggTotal);
          setMouthOpen(false);
          setSwallowEffect({ id: effectId, color: eatenFood.color });

          if (soundEnabledRef.current) {
            if (eatenFood.isHazard) {
              playGameSound(audioBankRef.current, 'poisonPickup');
              playGameSound(audioBankRef.current, 'poisonState');
            } else {
              playGameSound(audioBankRef.current, 'swallow');
            }
          }

          const linkedHazard = !eatenFood.isHazard && currentFoods.find((food) => (
            food.isHazard &&
            food.anchorPosition &&
            samePosition(food.anchorPosition, eatenFood.position)
          ));
          if (linkedHazard) {
            setHazardRelocation({ id: effectId, position: linkedHazard.position });
          }

          if (eatenFood.isHazard) {
            // Clear old turns so only new key presses use reversed controls.
            directionQueueRef.current = [];
            setHazardRelocation(null);
            const confusionEnd = Date.now() + currentDifficultySettings.confusionDuration;
            confusionEndsAtRef.current = confusionEnd;
            setConfusionEndsAt(confusionEnd);
            setConfusionSeconds(currentDifficultySettings.confusionDuration / 1000);
            setFeedback({
              type: 'confusion',
              text: `REVERSE · +1 SEGMENT · ${currentDifficultySettings.confusionDuration / 1000} SECONDS`,
            });
            const movingSnake = [newHead, ...previousSegments];
            const remainingFoods = currentFoods.filter((food) => !food.isHazard);
            const startedCrackedEgg = maybeStartCrackedEgg(movingSnake);

            if (currentDifficultySettings.purpleOnly) {
              const occupiedFoods = crackedEggRef.current
                ? [{ position: crackedEggRef.current.position }]
                : [];
              const nextFoods = createFoodPair(movingSnake, movementDirection, {
                occupiedFoods,
                purpleOnly: true,
              });
              setFoods(nextFoods);
              if (nextFoods.length === 0) scheduleRunEnding('victory');
            } else {
              const nextHazard = createRelocatedConfusionFood(
                movingSnake,
                movementDirection,
                remainingFoods,
              );
              setFoods(nextHazard ? [...remainingFoods, nextHazard] : remainingFoods);
            }

            if (startedCrackedEgg) {
              setFeedback({ type: 'cracked', text: 'SOMETHING’S CRACKING…' });
            }
            return movingSnake;
          }

          const longerSnake = [newHead, ...previousSegments];
          const startedCrackedEgg = maybeStartCrackedEgg(longerSnake);
          setFeedback(startedCrackedEgg
            ? { type: 'cracked', text: 'SOMETHING’S CRACKING…' }
            : { type: 'collect', text: `${eatenFood.color.toUpperCase()} EGG · +1 SEGMENT` });
          placeNextFoods(longerSnake, !linkedHazard);
          return longerSnake;
        }

        const eggNearby = currentFoods.some((food) => {
          const distanceX = Math.abs(food.position[0] - newHead[0]);
          const distanceY = Math.abs(food.position[1] - newHead[1]);
          return Math.max(distanceX, distanceY) <= 2;
        });
        setMouthOpen(eggNearby);
        return [newHead, ...previousSegments.slice(0, -1)];
      })();
      latestSegmentsRef.current = nextSegments;
      setSegments(nextSegments);
    };

    // Align discrete game steps with display frames to avoid timer/paint drift.
    let animationFrame = 0;
    let previousFrameTime = null;
    let elapsedSinceMove = 0;
    const animate = (timestamp) => {
      if (previousFrameTime !== null) {
        elapsedSinceMove += Math.min(timestamp - previousFrameTime, movementInterval);
      }
      previousFrameTime = timestamp;

      if (elapsedSinceMove >= movementInterval) {
        elapsedSinceMove %= movementInterval;
        moveOneStep();
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [difficulty, gameOver, movementInterval]);

  const resetGame = (nextDifficulty = difficulty, announceMode = false) => {
    stopAllGameSounds(audioBankRef.current);
    currentDirectionRef.current = 'RIGHT';
    setDirection('RIGHT');
    directionQueueRef.current = [];
    gameOverRef.current = false;
    confusionEndsAtRef.current = 0;
    eggsEatenRef.current = 0;
    runRecordedRef.current = false;
    endingQueuedRef.current = false;
    crackedEggRef.current = null;
    crackedEggUnlockedRef.current = false;
    clearTimeout(crackedEggRespawnTimerRef.current);
    crackedEggRespawnTimerRef.current = null;
    setSegments(STARTING_SEGMENTS);
    const resetFoods = createFoodPair(STARTING_SEGMENTS, 'RIGHT', {
      purpleOnly: DIFFICULTIES[nextDifficulty].purpleOnly,
    });
    foodsRef.current = resetFoods;
    setFoods(resetFoods);
    setGameOver(false);
    setEggsEaten(0);
    setFeedback(announceMode
      ? { type: 'mode', text: `${DIFFICULTIES[nextDifficulty].label.toUpperCase()} MODE` }
      : null);
    setSwallowEffect(null);
    setTailEffect(null);
    setConfusionSeconds(0);
    setConfusionEndsAt(null);
    setMouthOpen(false);
    setPurpleSurge(false);
    setPurpleWarningSeconds(0);
    setCrashEffect(null);
    setShowGameOver(false);
    setEndReason(null);
    setHazardRelocation(null);
    setCrackedEgg(null);
    setDifficulty(nextDifficulty);
    difficultySettingsRef.current = DIFFICULTIES[nextDifficulty];
    setGameId((currentId) => currentId + 1);
  };
  const restartFromKeyboard = useEffectEvent(() => resetGame());

  // Arrow keys steer during play; Enter restarts after an ending.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && gameOverRef.current) {
        event.preventDefault();
        restartFromKeyboard();
        return;
      }

      const requestedDirection = KEY_DIRECTIONS[event.key];
      if (!requestedDirection) return;

      event.preventDefault();
      if (event.repeat || gameOverRef.current) return;
      handleKeyboardDirection(requestedDirection);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSound = () => {
    const nextSoundEnabled = !soundEnabledRef.current;
    soundEnabledRef.current = nextSoundEnabled;
    setSoundEnabled(nextSoundEnabled);

    if (!nextSoundEnabled) {
      stopAllGameSounds(audioBankRef.current);
      return;
    }

    unlockGameAudio(audioBankRef.current);
    if (Date.now() < confusionEndsAtRef.current) {
      playGameSound(audioBankRef.current, 'poisonState');
    }
  };

  const handleClearRecords = () => {
    if (!clearRecordsArmed) {
      setClearRecordsArmed(true);
      return;
    }

    const emptyRecords = createEmptyRecords();
    setRecords(emptyRecords);
    saveRecords(emptyRecords);
    setClearRecordsArmed(false);
  };

  const endingTitle = endReason === 'victory'
    ? 'Board mastered!'
    : endReason === 'cracked'
      ? 'The cracked egg caught you!'
    : endReason === 'trapped'
      ? 'No moves left'
      : 'Game over';
  return (
    <main className="app">
      <section className="game-shell" aria-label="Snake Break game">
        <div className="game-top-panel">
        <header className="game-header">
          <div className="brand" aria-label="Snake Break">
            <span className="brand-mark" aria-hidden="true"><SnakeFace /></span>
            <div className="brand-copy">
              <h1 aria-label="Snake Break">
                <span className="brand-word-snake">Snake</span>
                <svg className="brand-b-character" viewBox="0 0 80 84" aria-hidden="true">
                  <path
                    className="brand-b-shell"
                    d="M22 6C43 1 64 10 70 25C75 38 66 42 55 44C68 47 74 59 67 71C59 83 37 82 19 75L7 69L22 63L7 57L22 52L7 46L22 41L7 35L21 30L9 24L23 19L15 12Z"
                  />
                  <path className="brand-b-spot" d="M43 15C49 12 57 18 56 25C55 31 49 36 44 34C39 32 38 26 41 22C39 19 40 16 43 15Z" />
                  <path className="brand-b-spot" d="M46 50C52 47 59 52 59 58C59 64 52 69 47 67C41 66 39 60 42 56C40 53 42 51 46 50Z" />
                  <circle className="brand-b-freckle" cx="31" cy="16" r="2" />
                  <circle className="brand-b-freckle" cx="62" cy="34" r="1.8" />
                  <circle className="brand-b-freckle" cx="32" cy="49" r="1.8" />
                  <circle className="brand-b-freckle" cx="58" cy="73" r="2" />
                </svg>
                <span className="brand-word-rest">reak</span>
              </h1>
              <p className="brand-tagline">A tiny escape between tasks</p>
            </div>
          </div>
          <div className="scoreboard">
            <span>
              <small>Eggs</small><strong>{eggsEaten}</strong><em>Best {currentRecord.bestEggs}</em>
            </span>
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
          <small className="difficulty-rule-hint">
            {difficulty === 'easy' && 'Purple eggs reverse you and add a segment · no chaser'}
            {difficulty === 'normal' && 'Purple eggs reverse you and add a segment · cracked egg chases'}
            {difficulty === 'difficult' && 'Purple eggs only · reverse and grow · cracked egg chases'}
          </small>
          <div className="utility-actions">
            <button
              type="button"
              className={`records-toggle ${showRecords ? 'active' : ''}`}
              aria-expanded={showRecords}
              onClick={() => {
                setShowRecords((currentValue) => !currentValue);
                setClearRecordsArmed(false);
              }}
            >
              Records
            </button>
            <button
              type="button"
              className={`sound-toggle ${soundEnabled ? 'active' : ''}`}
              aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
              aria-pressed={soundEnabled}
              onClick={toggleSound}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path className="speaker-shape" d="M4 9h4l5-4v14l-5-4H4z" />
                <path className="sound-wave" d="M16 8c1.7 2 1.7 6 0 8M19 5c3.7 4 3.7 10 0 14" />
                <path className="sound-slash" d="M4 4l16 16" />
              </svg>
            </button>
          </div>
        </div>

        {showRecords && (
          <RecordsDashboard
            records={records}
            labels={DIFFICULTY_LABELS}
            clearArmed={clearRecordsArmed}
            onClear={handleClearRecords}
            onClose={() => {
              setShowRecords(false);
              setClearRecordsArmed(false);
            }}
          />
        )}

        <p className="swipe-hint" role="status">
          <span className="swipe-hint-icon" aria-hidden="true">↕ ↔</span>
          <span>Swipe anywhere on the board to move</span>
        </p>
        </div>

        <div className="board-frame">
          <GameBoard
            key={gameId}
            segments={segments}
            direction={direction}
            foods={foods}
            crackedEgg={crackedEgg}
            swallowEffect={swallowEffect}
            tailEffect={tailEffect}
            confused={confusionSeconds > 0}
            mouthOpen={mouthOpen}
            crashEffect={crashEffect}
            moveInterval={difficultySettings.moveInterval}
            purpleSnake={confusionSeconds > 0 || purpleSurge}
            onDirectionChange={handleDirectionInput}
            relocatingHazardPosition={hazardRelocation?.position ?? null}
            hazardLifetime={HAZARD_PAIR_LIFETIME_MS}
          />

          {feedback && <div className={`game-feedback ${feedback.type}`}>{feedback.text}</div>}

          <div className="power-statuses">
            {crackedEgg?.phase === 'warning' && (
              <div className="cracked-egg-status cracked-egg-warning-status" role="status">
                <span>Cracked egg hatches in</span>
                <strong>{crackedEgg.secondsLeft}</strong>
              </div>
            )}
            {crackedEgg?.phase === 'chasing' && (
              <div className="cracked-egg-status" role="status">
                <span>It is chasing you</span>
                <strong>{crackedEgg.secondsLeft}s</strong>
              </div>
            )}
            {crackedEgg?.phase === 'telegraph' && (
              <div className="cracked-egg-status cracked-egg-warning-status" role="status">
                <span>It’s aiming at your last spot</span>
                <strong>{(difficultySettings.crackedEggLungeWarning / 1000).toFixed(1)}s</strong>
              </div>
            )}
            {crackedEgg?.phase === 'lunging' && (
              <div className="cracked-egg-status" role="status">
                <span>It’s lunging · dodge!</span>
                <strong>!</strong>
              </div>
            )}
            {purpleWarningSeconds > 0 && (
              <div className="purple-warning" role="status">
                <span>Reverse direction in</span>
                <strong>{purpleWarningSeconds}</strong>
              </div>
            )}
            {confusionSeconds > 0 && (
              <div className="confusion-status" role="status">
                <span>Reverse direction <strong>{confusionSeconds}s</strong></span>
                <small>Press the opposite arrow.</small>
              </div>
            )}
            {purpleSurge && (
              <div className="purple-status" role="status">
                Purple snake <small>Stay sharp.</small>
              </div>
            )}
          </div>

          {showGameOver && (
            <div className={`game-over ${endReason === 'victory' ? 'victory-overlay' : ''}`}>
              <div className={`game-over-card ${endReason === 'victory' ? 'victory-card' : ''}`}>
                {endReason === 'victory' && <WowSnake />}
                <h2>{endingTitle}</h2>
                <div className="final-stats">
                  <span>
                    <i className="final-icon final-egg" aria-hidden="true">
                      <b /><b /><b />
                    </i>
                    <strong>{eggsEaten}</strong>
                    <small>Eggs eaten</small>
                    <em>Best {currentRecord.bestEggs}</em>
                  </span>
                  <span>
                    <i className="final-icon final-size" aria-hidden="true"><b /><b /><b /></i>
                    <strong>{segments.length}</strong>
                    <small>Snake size</small>
                    <em>Segments</em>
                  </span>
                </div>
                <button onClick={() => resetGame()}>Play again</button>
              </div>
            </div>
          )}
        </div>

        <p className="sr-only">Use the arrow keys or swipe anywhere on the board to steer.</p>
      </section>
    </main>
  );
}

export default App
