import './App.css'
import GameBoard from './components/GameBoard'
import MobileControls from './components/MobileControls'
import RecordsDashboard from './components/RecordsDashboard'
import WowSnake from './components/WowSnake'
import {
  createGameAudioBank,
  playGameSound,
  stopAllGameSounds,
  stopGameSound,
  unlockGameAudio,
} from './audio/gameAudio'
import {
  createFoodPair,
  createGoldenFood,
  createRelocatedConfusionPair,
  createRelocatedConfusionFood,
  getNextHead,
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
    goldenDuration: [7, 9],
  },
  normal: {
    label: 'Normal',
    moveInterval: 155,
    confusionDuration: 10_000,
    goldenDuration: [5, 7],
  },
  difficult: {
    label: 'Difficult',
    moveInterval: 110,
    confusionDuration: 15_000,
    goldenDuration: [3, 5],
  },
};
const randomGoldenThreshold = () => 8 + Math.floor(Math.random() * 5);
const randomGoldenDuration = ([minimum, maximum]) => (
  minimum + Math.floor(Math.random() * (maximum - minimum + 1))
);
const HAZARD_RELOCATION_DELAY_MS = 900;
const HAZARD_PAIR_LIFETIME_MS = 6_000;
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
  const [purpleSurge, setPurpleSurge] = useState(false);
  const [purpleWarningSeconds, setPurpleWarningSeconds] = useState(0);
  const [hazardRelocation, setHazardRelocation] = useState(null);
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
  const goldenEndsAtRef = useRef(0);
  const ordinaryEggsCollectedRef = useRef(0);
  const goldenThresholdRef = useRef(randomGoldenThreshold());
  const latestSegmentsRef = useRef(STARTING_SEGMENTS);
  const audioBankRef = useRef(null);
  const soundEnabledRef = useRef(true);
  const eggsEatenRef = useRef(0);
  const streaksCompletedRef = useRef(0);
  const runRecordedRef = useRef(false);
  const endingQueuedRef = useRef(false);
  const foodsRef = useRef(foods);
  const streakColorRef = useRef(streakColor);
  const sameColorCountRef = useRef(sameColorCount);
  const goldenChargeRef = useRef(goldenCharge);
  const difficultySettingsRef = useRef(difficultySettings);

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
    goldenEndsAtRef.current = 0;
    stopGameSound(audioBankRef.current, 'poisonState');
    setConfusionEndsAt(null);
    setConfusionSeconds(0);
    setGoldenEndsAt(null);
    setGoldenSeconds(0);
    goldenChargeRef.current = false;
    setGoldenCharge(false);
    setMouthOpen(false);
    setPurpleSurge(false);
    setPurpleWarningSeconds(0);
    setHazardRelocation(null);
    setEndReason(reason);

    if (!runRecordedRef.current) {
      runRecordedRef.current = true;
      recordFinishedRun(setRecords, difficulty, reason === 'victory');
    }

    if (reason === 'wall' && crashData) {
      if (soundEnabledRef.current) playGameSound(audioBankRef.current, 'crash');
      const effectId = effectIdRef.current + 1;
      effectIdRef.current = effectId;
      setCrashEffect({ id: effectId, ...crashData });
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

  // Keep the long-lived movement timer connected to the latest game state.
  useEffect(() => {
    foodsRef.current = foods;
    streakColorRef.current = streakColor;
    sameColorCountRef.current = sameColorCount;
    goldenChargeRef.current = goldenCharge;
    difficultySettingsRef.current = difficultySettings;
  }, [difficultySettings, foods, goldenCharge, sameColorCount, streakColor]);

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

    const timer = setInterval(() => {
      const queuedDirection = directionQueueRef.current.shift();
      const movementDirection = queuedDirection ?? currentDirectionRef.current;
      const currentFoods = foodsRef.current;
      const currentStreakColor = streakColorRef.current;
      const currentSameColorCount = sameColorCountRef.current;
      const currentGoldenCharge = goldenChargeRef.current;
      const currentDifficultySettings = difficultySettingsRef.current;
      currentDirectionRef.current = movementDirection;

      const placeNextFoods = (
        nextSnake,
        nextStreakColor = null,
        nextStreakCount = 0,
        preserveGolden = true,
        preserveHazard = true,
      ) => {
        const activeGolden = preserveGolden && Date.now() < goldenEndsAtRef.current
          ? currentFoods.find((food) => food.isGolden)
          : null;
        const activeHazard = preserveHazard
          ? currentFoods.find((food) => food.isHazard) ?? null
          : null;
        const persistentFoods = [activeGolden, activeHazard].filter(Boolean);
        const nextFoods = createFoodPair(
          nextSnake,
          movementDirection,
          nextStreakColor,
          nextStreakCount,
          {
            occupiedFoods: persistentFoods,
            includeHazard: persistentFoods.length === 0 && preserveHazard,
          },
        );

        const normalFoodCount = nextFoods.filter((food) => !food.isHazard && !food.isGolden).length;
        if (normalFoodCount < 2) {
          setFoods([...nextFoods, ...persistentFoods]);
          scheduleRunEnding('victory');
          return;
        }

        if (activeGolden) {
          setFoods([...nextFoods, ...persistentFoods]);
          return;
        }

        const goldenReady = ordinaryEggsCollectedRef.current >= goldenThresholdRef.current;
        const hasConfusionEgg = nextFoods.some((food) => food.isHazard);

        if (goldenReady && !hasConfusionEgg && !currentGoldenCharge) {
          const occupiedFoods = [...nextFoods, ...persistentFoods];
          const goldenFood = createGoldenFood(nextSnake, movementDirection, occupiedFoods);
          if (!goldenFood) {
            setFoods(occupiedFoods);
            return;
          }
          const durationSeconds = randomGoldenDuration(currentDifficultySettings.goldenDuration);
          const expirationTime = Date.now() + durationSeconds * 1000;
          ordinaryEggsCollectedRef.current = 0;
          goldenThresholdRef.current = randomGoldenThreshold();
          goldenEndsAtRef.current = expirationTime;
          setGoldenEndsAt(expirationTime);
          setGoldenSeconds(durationSeconds);
          setFoods([...occupiedFoods, goldenFood]);
          return;
        }

        setFoods([...nextFoods, ...persistentFoods]);
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
          scheduleRunEnding(
            outsideBoard ? 'wall' : 'self',
            outsideBoard ? { direction: movementDirection, position: head } : null,
          );
          return previousSegments;
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

          if (eatenFood.isGolden) {
            goldenEndsAtRef.current = 0;
            setGoldenEndsAt(null);
            setGoldenSeconds(0);
            if (!currentStreakColor) {
              goldenChargeRef.current = true;
              setGoldenCharge(true);
              setFeedback({
                type: 'golden',
                text: 'GOLDEN CHARGE · NEXT EGG COUNTS TWICE',
              });
              setFoods((currentFoods) => currentFoods.filter((food) => !food.isGolden));
              return [newHead, ...previousSegments.slice(0, -1)];
            }

            const wildcardCount = currentSameColorCount + 1;
            if (wildcardCount >= 3) {
              if (soundEnabledRef.current) playGameSound(audioBankRef.current, 'streak');
              streakColorRef.current = null;
              sameColorCountRef.current = 0;
              setStreakColor(null);
              setSameColorCount(0);
              const nextStreakTotal = streaksCompletedRef.current + 1;
              streaksCompletedRef.current = nextStreakTotal;
              setStreaksCompleted(nextStreakTotal);
              updatePersonalBest(setRecords, difficulty, 'bestStreaks', nextStreakTotal);
              const shorterSnake = [newHead, ...previousSegments.slice(0, -2)];
              const safeSnake = shorterSnake.length > 0 ? shorterSnake : [newHead];
              const removedTail = previousSegments.at(-2);
              if (removedTail) {
                setTailEffect({ id: effectId, color: currentStreakColor, position: removedTail });
              }
              setRewardColor(currentStreakColor);
              setFeedback({ type: 'shrink', text: 'GOLDEN STREAK COMPLETE · −1 SEGMENT' });
              placeNextFoods(safeSnake, null, 0, false);
              return safeSnake;
            }

            sameColorCountRef.current = wildcardCount;
            setSameColorCount(wildcardCount);
            setFeedback({
              type: 'golden',
              text: `GOLD WILDCARD · ${currentStreakColor.toUpperCase()} ${wildcardCount}/3`,
            });
            const movingSnake = [newHead, ...previousSegments.slice(0, -1)];
            placeNextFoods(movingSnake, currentStreakColor, wildcardCount, false);
            return movingSnake;
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
              text: `REVERSE DIRECTION · ${currentDifficultySettings.confusionDuration / 1000} SECONDS`,
            });
            setFoods((currentFoods) => currentFoods.filter((food) => !food.isHazard));
            return [newHead, ...previousSegments.slice(0, -1)];
          }

          ordinaryEggsCollectedRef.current += 1;
          const countIncrease = currentGoldenCharge ? 2 : 1;
          const nextCount = eatenFood.color === currentStreakColor
            ? currentSameColorCount + countIncrease
            : countIncrease;
          if (currentGoldenCharge) {
            goldenChargeRef.current = false;
            setGoldenCharge(false);
          }
          if (nextCount >= 3) {
            if (soundEnabledRef.current) playGameSound(audioBankRef.current, 'streak');
            streakColorRef.current = null;
            sameColorCountRef.current = 0;
            setStreakColor(null);
            setSameColorCount(0);
            const nextStreakTotal = streaksCompletedRef.current + 1;
            streaksCompletedRef.current = nextStreakTotal;
            setStreaksCompleted(nextStreakTotal);
            updatePersonalBest(setRecords, difficulty, 'bestStreaks', nextStreakTotal);
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

          streakColorRef.current = eatenFood.color;
          sameColorCountRef.current = nextCount;
          setStreakColor(eatenFood.color);
          setSameColorCount(nextCount);
          const longerSnake = [newHead, ...previousSegments];
          setFeedback({
            type: 'collect',
            text: `${eatenFood.color.toUpperCase()} STREAK · ${nextCount}/3`,
          });
          placeNextFoods(longerSnake, eatenFood.color, nextCount, true, !linkedHazard);
          return longerSnake;
        }

        const nextPosition = getNextHead(newHead, movementDirection);
        setMouthOpen(currentFoods.some((food) => samePosition(nextPosition, food.position)));
        return [newHead, ...previousSegments.slice(0, -1)];
      });
    }, movementInterval);

    return () => clearInterval(timer);
  }, [difficulty, gameOver, movementInterval]);

  const resetGame = (nextDifficulty = difficulty, announceMode = false) => {
    stopAllGameSounds(audioBankRef.current);
    currentDirectionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    gameOverRef.current = false;
    confusionEndsAtRef.current = 0;
    goldenEndsAtRef.current = 0;
    ordinaryEggsCollectedRef.current = 0;
    eggsEatenRef.current = 0;
    streaksCompletedRef.current = 0;
    runRecordedRef.current = false;
    endingQueuedRef.current = false;
    streakColorRef.current = null;
    sameColorCountRef.current = 0;
    goldenChargeRef.current = false;
    goldenThresholdRef.current = randomGoldenThreshold();
    setSegments(STARTING_SEGMENTS);
    const resetFoods = createFoodPair(STARTING_SEGMENTS, 'RIGHT');
    foodsRef.current = resetFoods;
    setFoods(resetFoods);
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
    setPurpleSurge(false);
    setPurpleWarningSeconds(0);
    setCrashEffect(null);
    setShowGameOver(false);
    setEndReason(null);
    setHazardRelocation(null);
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
    : endReason === 'trapped'
      ? 'No moves left'
      : 'Game over';
  return (
    <main className="app">
      <section className="game-shell" aria-label="SnakeStreak game">
        <header className="game-header">
          <div className="brand" aria-label="SnakeStreak">
            <span className="brand-mark" aria-hidden="true"><i /></span>
            <h1>Snake<span>Streak</span></h1>
          </div>
          <div className="scoreboard">
            <span>
              <small>Eggs</small><strong>{eggsEaten}</strong><em>Best {currentRecord.bestEggs}</em>
            </span>
            <span>
              <small>Streaks</small><strong>{streaksCompleted}</strong><em>Best {currentRecord.bestStreaks}</em>
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
            purpleSnake={confusionSeconds > 0 || purpleSurge}
            onDirectionChange={handleDirectionInput}
            relocatingHazardPosition={hazardRelocation?.position ?? null}
            hazardLifetime={HAZARD_PAIR_LIFETIME_MS}
          />

          <MobileControls onDirectionChange={handleDirectionInput} />

          {feedback && <div className={`game-feedback ${feedback.type}`}>{feedback.text}</div>}

          <div className="power-statuses">
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
                    <i className="final-icon final-streak" aria-hidden="true">
                      <b /><b /><b />
                    </i>
                    <strong>{streaksCompleted}</strong>
                    <small>Streaks</small>
                    <em>Best {currentRecord.bestStreaks}</em>
                  </span>
                </div>
                <button onClick={() => resetGame()}>Play again</button>
              </div>
            </div>
          )}
        </div>

        <p className="sr-only">Use the arrow keys, swipe the board, or use the direction buttons to steer.</p>
      </section>
    </main>
  );
}

export default App
