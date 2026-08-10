import '../App.css'

export default function Snake({ segments, rewardColor, swallowEffect, confused }) {
  const swallowIndex = Math.min(1, segments.length - 1);

  return segments.map(([x, y], index) => {
    const isSwallowSegment = Boolean(swallowEffect) && index === swallowIndex;

    return (
      <div
        className={`snake ${rewardColor ? `snake-reward reward-${rewardColor}` : ''} ${isSwallowSegment ? `snake-swallow reward-${swallowEffect.color}` : ''} ${confused ? 'snake-confused' : ''} ${confused && index === 0 ? 'snake-confused-head' : ''}`}
        key={isSwallowSegment ? `swallow-${swallowEffect.id}-${index}` : `segment-${index}`}
        style={{
          gridColumn: x + 1,
          gridRow: y + 1,
          '--reward-delay': `${Math.min(index, 12) * 38}ms`,
        }}
      />
    );
  });
}
