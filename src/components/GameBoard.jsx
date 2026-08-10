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
}) {
  return (
    <div>
      <h2>Game board</h2>
      <div className={`gameboard ${rewardColor ? `reward-board reward-${rewardColor}` : ''}`}>
        <Snake
          segments={segments}
          rewardColor={rewardColor}
          swallowEffect={swallowEffect}
          confused={confused}
        />
        <Food foods={foods} />
        {tailEffect && <TailDissolve effect={tailEffect} />}
      </div>
    </div>
  )
}
