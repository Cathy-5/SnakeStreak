import '../App.css'
import Food from './Food'
import Snake from './Snake'
import TailDissolve from './TailDissolve'

export default function GameBoard({
  segments,
  foods,
  rewardColor,
  swallowEffect,
  tailEffect,
  confused,
  mouthOpen,
  crashEffect,
  moveInterval,
}) {
  return (
    <div
      className={`gameboard ${rewardColor ? `reward-board reward-${rewardColor}` : ''} ${crashEffect ? `board-crash crash-${crashEffect.direction.toLowerCase()}` : ''}`}
      style={{ '--move-duration': `${moveInterval}ms` }}
    >
      <Snake
        segments={segments}
        rewardColor={rewardColor}
        swallowEffect={swallowEffect}
        confused={confused}
        mouthOpen={mouthOpen}
        crashEffect={crashEffect}
      />
      <Food foods={foods} />
      {tailEffect && <TailDissolve effect={tailEffect} />}
      {crashEffect && (
        <span
          className={`smash-effect smash-${crashEffect.direction.toLowerCase()}`}
          style={{
            left: `${(crashEffect.position[0] + 0.5) * 5}%`,
            top: `${(crashEffect.position[1] + 0.5) * 5}%`,
          }}
          aria-hidden="true"
        >
          <i /><i /><i /><i /><i />
        </span>
      )}
    </div>
  )
}
