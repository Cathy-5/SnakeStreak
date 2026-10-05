import '../App.css'
import { useRef } from 'react'
import Food from './Food'
import CrackedEgg from './CrackedEgg'
import Snake from './Snake'
import TailDissolve from './TailDissolve'
import { BOARD_SIZE } from '../game/gameUtils'

export default function GameBoard({
  segments,
  direction,
  foods,
  crackedEgg,
  swallowEffect,
  tailEffect,
  confused,
  mouthOpen,
  crashEffect,
  moveInterval,
  purpleSnake,
  onDirectionChange,
  relocatingHazardPosition,
  hazardLifetime,
}) {
  const swipeStartRef = useRef(null);

  const handlePointerDown = (event) => {
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    const swipeThreshold = Math.max(18, Math.min(34, event.currentTarget.clientWidth * 0.06));
    if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < swipeThreshold) return;

    if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
      onDirectionChange(horizontalDistance > 0 ? 'RIGHT' : 'LEFT');
      return;
    }

    onDirectionChange(verticalDistance > 0 ? 'DOWN' : 'UP');
  };

  return (
    <div
      className={`gameboard ${crashEffect ? `board-crash crash-${crashEffect.direction.toLowerCase()}` : ''}`}
      style={{
        '--move-duration': `${Math.max(50, moveInterval)}ms`,
        '--grid-size': BOARD_SIZE,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { swipeStartRef.current = null; }}
      aria-label="Game board. Swipe to steer."
    >
      <Snake
        segments={segments}
        direction={direction}
        swallowEffect={swallowEffect}
        confused={confused}
        mouthOpen={mouthOpen}
        crashEffect={crashEffect}
        purpleSnake={purpleSnake}
        moveInterval={moveInterval}
      />
      <Food
        foods={foods}
        relocatingHazardPosition={relocatingHazardPosition}
        hazardLifetime={hazardLifetime}
      />
      {crackedEgg && (
        <CrackedEgg
          position={crackedEgg.position}
          phase={crackedEgg.phase}
          targetPosition={crackedEgg.phase === 'telegraph' ? crackedEgg.targetPosition : null}
        />
      )}
      {tailEffect && <TailDissolve effect={tailEffect} />}
      {crashEffect && (
        <span
          className={`smash-effect smash-${crashEffect.direction.toLowerCase()}`}
          style={{
            left: `${(crashEffect.position[0] + 0.5) * 100 / BOARD_SIZE}%`,
            top: `${(crashEffect.position[1] + 0.5) * 100 / BOARD_SIZE}%`,
          }}
          aria-hidden="true"
        >
          <i /><i /><i /><i /><i />
        </span>
      )}
    </div>
  )
}
