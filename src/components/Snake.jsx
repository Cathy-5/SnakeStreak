import '../App.css'
import SnakeFace from './SnakeFace'

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

function getDirection(from, to) {
  const [x, y] = from;
  const [nextX, nextY] = to;
  if (nextX > x) return 'right';
  if (nextX < x) return 'left';
  if (nextY > y) return 'down';
  return 'up';
}

function getPort(direction) {
  return {
    right: [100, 50],
    left: [0, 50],
    down: [50, 100],
    up: [50, 0],
  }[direction];
}

function getBodyPath(segments, index, extendNeck = true) {
  const current = segments[index];
  const headwardDirection = getDirection(current, segments[index - 1]);
  const headwardEdge = getPort(headwardDirection);
  const headwardPort = index === 1 && extendNeck
    ? {
        right: [150, 50],
        left: [-50, 50],
        down: [50, 150],
        up: [50, -50],
      }[headwardDirection]
    : headwardEdge;
  const tailwardPort = getPort(getDirection(current, segments[index + 1]));
  const [startX, startY] = headwardPort;
  const [endX, endY] = tailwardPort;

  if (startX === endX || startY === endY) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const controlOneX = index === 1 && extendNeck
    ? startX + (headwardEdge[0] - startX) * 0.55
    : startX + (50 - startX) * 0.72;
  const controlOneY = index === 1 && extendNeck
    ? startY + (headwardEdge[1] - startY) * 0.55
    : startY + (50 - startY) * 0.72;
  const controlTwoX = endX + (50 - endX) * 0.72;
  const controlTwoY = endY + (50 - endY) * 0.72;

  return `M ${startX} ${startY} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${endX} ${endY}`;
}

function getTailPath(baseWidth) {
  const margin = (100 - baseWidth) / 2;
  return `M 100 ${margin} C 72 ${margin + 2}, 31 36, 8 43 Q 1 50 8 57 C 31 64, 72 ${100 - margin - 2}, 100 ${100 - margin} Z`;
}

export default function Snake({
  segments,
  rewardColor,
  swallowEffect,
  confused,
  mouthOpen,
  crashEffect,
  purpleSnake,
}) {
  const swallowIndex = Math.min(1, segments.length - 1);
  const facingDirection = getFacingDirection(segments);

  const renderSegments = (layer = 'fill') => segments.map(([x, y], index) => {
    const outlineOnly = layer === 'outline';
    const highlightOnly = layer === 'highlight';
    if (highlightOnly && index === 0) return null;
    const isSwallowSegment = Boolean(swallowEffect) && index === swallowIndex;
    const segmentType = index === 0
      ? 'snake-head'
      : index === segments.length - 1 ? 'snake-tail' : 'snake-body';
    const connectionClass = getConnectionClass(segments, index);
    const isCrashingHead = Boolean(crashEffect) && index === 0;
    const tailProgress = (index - 1) / Math.max(segments.length - 3, 1);
    const segmentWidth = 84 - Math.min(tailProgress, 1) * 30;
    const tailBaseWidth = segments.length > 3 ? 62 : 92;

    return (
      <div
        className={`snake-cell ${index === 0 ? 'snake-cell-head' : ''} ${isSwallowSegment ? 'snake-cell-swallow' : ''}`}
        key={`segment-${index}`}
        style={{
          transform: `translate3d(${x * 100}%, ${y * 100}%, 0)`,
          '--crash-delay': `${Math.min(index, 8) * 10}ms`,
        }}
        >
        <div
          className={`snake ${segmentType} ${connectionClass} ${rewardColor ? `snake-reward reward-${rewardColor}` : ''} ${isSwallowSegment ? `snake-swallow reward-${swallowEffect.color}` : ''} ${purpleSnake ? 'snake-confused' : ''} ${confused && !purpleSnake ? 'snake-confused-glow' : ''} ${confused && index === 0 ? 'snake-confused-head' : ''} ${mouthOpen && index === 0 ? 'snake-mouth-open' : ''} ${isCrashingHead ? `snake-crash crash-${crashEffect.direction.toLowerCase()}` : ''}`}
          key={isSwallowSegment ? `swallow-${swallowEffect.id}` : 'visual'}
          style={{
            '--reward-delay': `${Math.min(index, 12) * 38}ms`,
            '--segment-width': segmentWidth,
          }}
        >
          {index > 0 && index < segments.length - 1 && (
            <svg className="snake-segment-art" viewBox="0 0 100 100" aria-hidden="true">
              <path
                className={highlightOnly ? 'snake-body-highlight' : undefined}
                d={getBodyPath(segments, index, !highlightOnly)}
              />
            </svg>
          )}
          {index === 0 && (
            <span className={`snake-face face-${facingDirection}`} aria-hidden="true">
              <SnakeFace silhouetteOnly={outlineOnly} />
            </span>
          )}
          {index === segments.length - 1 && segments.length > 1 && (
            <svg
              className={`snake-segment-art snake-tail-art tail-${connectionClass}`}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <path
                className={highlightOnly ? 'snake-tail-highlight' : undefined}
                d={highlightOnly
                  ? `M 92 ${(100 - tailBaseWidth) / 2 + 13} Q 65 ${(100 - tailBaseWidth) / 2 + 14} 36 45`
                  : getTailPath(tailBaseWidth)}
              />
            </svg>
          )}
        </div>
      </div>
    );
  });

  // Paint every outline behind every fill so joined pieces have no dark seams.
  return (
    <>
      <div className="snake-outline-layer" aria-hidden="true">{renderSegments('outline')}</div>
      {renderSegments()}
      <div className="snake-highlight-layer" aria-hidden="true">{renderSegments('highlight')}</div>
    </>
  );
}
