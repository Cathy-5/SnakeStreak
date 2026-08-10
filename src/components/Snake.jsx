import '../App.css'

function getFacingDirection(segments) {
  if (segments.length < 2) return 'right';

  const [headX, headY] = segments[0];
  const [neckX, neckY] = segments[1];
  if (headX > neckX) return 'right';
  if (headX < neckX) return 'left';
  if (headY > neckY) return 'down';
  return 'up';
}

function getConnectionClass(segments, index) {
  if (index === 0) return '';

  const [x, y] = segments[index];
  const [previousX, previousY] = segments[index - 1];
  if (previousX > x) return 'connect-right';
  if (previousX < x) return 'connect-left';
  if (previousY > y) return 'connect-down';
  return 'connect-up';
}

export default function Snake({
  segments,
  rewardColor,
  swallowEffect,
  confused,
  mouthOpen,
  crashEffect,
}) {
  const swallowIndex = Math.min(1, segments.length - 1);
  const facingDirection = getFacingDirection(segments);

  return segments.map(([x, y], index) => {
    const isSwallowSegment = Boolean(swallowEffect) && index === swallowIndex;
    const segmentType = index === 0
      ? 'snake-head'
      : index === segments.length - 1 ? 'snake-tail' : 'snake-body';
    const connectionClass = getConnectionClass(segments, index);
    const isCrashingHead = Boolean(crashEffect) && index === 0;

    return (
      <div
        className={`snake-cell ${index === 0 ? 'snake-cell-head' : ''} ${isSwallowSegment ? 'snake-cell-swallow' : ''}`}
        key={`segment-${index}`}
        style={{
          transform: `translate(${x * 100}%, ${y * 100}%)`,
          '--crash-delay': `${Math.min(index, 8) * 10}ms`,
        }}
      >
        <div
          className={`snake ${segmentType} ${connectionClass} ${rewardColor ? `snake-reward reward-${rewardColor}` : ''} ${isSwallowSegment ? `snake-swallow reward-${swallowEffect.color}` : ''} ${confused ? 'snake-confused' : ''} ${confused && index === 0 ? 'snake-confused-head' : ''} ${mouthOpen && index === 0 ? 'snake-mouth-open' : ''} ${isCrashingHead ? `snake-crash crash-${crashEffect.direction.toLowerCase()}` : ''}`}
          key={isSwallowSegment ? `swallow-${swallowEffect.id}` : 'visual'}
          style={{ '--reward-delay': `${Math.min(index, 12) * 38}ms` }}
        >
          {index === 0 && (
            <span className={`snake-face face-${facingDirection}`} aria-hidden="true">
              <i className="snake-eye eye-big" />
              <i className="snake-eye eye-small" />
              <i className="snake-nostril nostril-left" />
              <i className="snake-nostril nostril-right" />
              <span className="snake-mouth">
                <i className="mouth-tooth tooth-top-left" />
                <i className="mouth-tooth tooth-top-right" />
                <i className="mouth-tooth tooth-bottom-left" />
                <i className="mouth-tooth tooth-bottom-right" />
              </span>
            </span>
          )}
        </div>
      </div>
    );
  });
}
