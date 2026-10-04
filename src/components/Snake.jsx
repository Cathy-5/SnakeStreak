import '../App.css'
import SnakeFace from './SnakeFace'
import { useEffect, useRef, useState } from 'react'
import { BOARD_SIZE } from '../game/gameUtils'

function getContinuousBodyPath(segments) {
  if (segments.length < 2) return '';

  const points = segments.map(([x, y]) => [x + 0.5, y + 0.5]);
  const cornerRadius = 0.22;
  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incomingLength = Math.abs(current[0] - previous[0]) + Math.abs(current[1] - previous[1]);
    const outgoingLength = Math.abs(next[0] - current[0]) + Math.abs(next[1] - current[1]);
    const radius = Math.min(cornerRadius, incomingLength / 2, outgoingLength / 2);

    if (previous[0] !== next[0] && previous[1] !== next[1]) {
      const beforeCorner = [
        current[0] + Math.sign(previous[0] - current[0]) * radius,
        current[1] + Math.sign(previous[1] - current[1]) * radius,
      ];
      const afterCorner = [
        current[0] + Math.sign(next[0] - current[0]) * radius,
        current[1] + Math.sign(next[1] - current[1]) * radius,
      ];
      path += ` L ${beforeCorner[0]} ${beforeCorner[1]} Q ${current[0]} ${current[1]} ${afterCorner[0]} ${afterCorner[1]}`;
    } else {
      path += ` L ${current[0]} ${current[1]}`;
    }
  }

  const tail = points.at(-1);
  return `${path} L ${tail[0]} ${tail[1]}`;
}

function getPointAtDistance(points, distance) {
  let remaining = distance;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (remaining <= length) {
      const progress = length === 0 ? 0 : remaining / length;
      return [
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
      ];
    }
    remaining -= length;
  }

  return points.at(-1);
}

function getPathSection(points, startDistance, endDistance) {
  const section = [getPointAtDistance(points, startDistance)];
  let distance = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    distance += Math.hypot(
      points[index][0] - points[index - 1][0],
      points[index][1] - points[index - 1][1],
    );
    if (distance > startDistance && distance < endDistance) section.push(points[index]);
  }

  section.push(getPointAtDistance(points, endDistance));
  return section;
}

function getDigestPosition(segments, position) {
  if (position == null || segments.length < 2) return null;
  const index = Math.min(Math.floor(position), segments.length - 1);
  const nextIndex = Math.min(index + 1, segments.length - 1);
  const amount = position - index;
  const first = segments[index];
  const second = segments[nextIndex];
  return [
    first[0] + (second[0] - first[0]) * amount + 0.5,
    first[1] + (second[1] - first[1]) * amount + 0.5,
  ];
}

export default function Snake({
  segments,
  direction,
  swallowEffect,
  confused,
  mouthOpen,
  crashEffect,
  purpleSnake,
  moveInterval,
}) {
  const [visualSegments, setVisualSegments] = useState(segments);
  const [visualPathPoints, setVisualPathPoints] = useState(segments);
  const logicalSegmentsRef = useRef(segments);
  const [digestFrame, setDigestFrame] = useState({ id: null, progress: 0 });
  const swallowEffectId = swallowEffect?.id;
  const facingDirection = direction.toLowerCase();
  const digestActive = Boolean(
    swallowEffect && digestFrame.id === swallowEffect.id && digestFrame.progress < 1,
  );
  const digestPosition = digestActive && segments.length > 1
    ? 1 + digestFrame.progress * (segments.length - 2)
    : null;
  const digestPoint = getDigestPosition(visualSegments, digestPosition);
  const digestStrength = digestActive ? Math.sin(Math.PI * digestFrame.progress) : 0;
  const digestIndex = digestPosition == null ? -1 : Math.floor(digestPosition);
  const digestStart = visualSegments[Math.max(0, digestIndex)];
  const digestEnd = visualSegments[Math.min(visualSegments.length - 1, digestIndex + 1)];
  const digestAngle = digestStart && digestEnd
    ? Math.atan2(digestEnd[1] - digestStart[1], digestEnd[0] - digestStart[0]) * 180 / Math.PI
    : 0;
  const bodyPath = getContinuousBodyPath(visualPathPoints);

  useEffect(() => {
    if (logicalSegmentsRef.current === segments) return undefined;

    const startSegments = logicalSegmentsRef.current;
    logicalSegmentsRef.current = segments;
    const isOneStep = startSegments.length > 0
      && segments.length > 0
      && segments.length <= startSegments.length + 1
      && Math.abs(segments[0][0] - startSegments[0][0])
        + Math.abs(segments[0][1] - startSegments[0][1]) === 1
      && segments[1]?.[0] === startSegments[0][0]
      && segments[1]?.[1] === startSegments[0][1];

    if (!isOneStep) {
      setVisualSegments(segments);
      setVisualPathPoints(segments);
      return undefined;
    }

    const route = [segments[0], ...startSegments];
    const duration = Math.max(50, moveInterval);
    let frameId;
    let startedAt;

    const animate = (timestamp) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const headDistance = 1 - progress;
      const nextVisualSegments = segments.map((_, index) => (
        getPointAtDistance(route, headDistance + index)
      ));
      const bodyPoints = getPathSection(
        route,
        headDistance,
        headDistance + Math.max(0, segments.length - 1),
      );

      setVisualSegments(nextVisualSegments);
      setVisualPathPoints(bodyPoints);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        setVisualSegments(segments);
        setVisualPathPoints(segments);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [segments, moveInterval]);

  useEffect(() => {
    if (swallowEffectId == null) return undefined;

    let frameId;
    let startedAt;
    const animate = (timestamp) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / 650, 1);
      setDigestFrame({ id: swallowEffectId, progress });
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [swallowEffectId]);

  const renderHead = (layer = 'fill') => {
    const [x, y] = visualSegments[0];

    const outlineOnly = layer === 'outline';
    const isCrashingHead = Boolean(crashEffect);

    return (
      <div
        className="snake-cell snake-cell-head"
        key={`head-${layer}`}
        style={{
          transform: `translate3d(${x * 100}%, ${y * 100}%, 0)`,
        }}
      >
        <div
          className={`snake snake-head ${purpleSnake ? 'snake-confused' : ''} ${confused && !purpleSnake ? 'snake-confused-glow' : ''} ${confused ? 'snake-confused-head' : ''} ${mouthOpen ? 'snake-mouth-open' : ''} ${isCrashingHead ? `snake-crash crash-${crashEffect.direction.toLowerCase()}` : ''}`}
        >
          <span className={`snake-face face-${facingDirection}`} aria-hidden="true">
            <SnakeFace silhouetteOnly={outlineOnly} />
          </span>
        </div>
      </div>
    );
  };

  const bodyArt = (layer) => (
    <svg
      className={`snake-body-art snake-body-art-${layer}`}
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bodyPath && <path className="snake-body-path" d={bodyPath} />}
      {digestPoint && layer !== 'highlight' && digestStrength > 0 && (
        <ellipse
          className="snake-digest-bump"
          cx={digestPoint[0]}
          cy={digestPoint[1]}
          rx={(layer === 'outline' ? 0.62 : 0.54) + digestStrength * 0.16}
          ry={(layer === 'outline' ? 0.56 : 0.46) + digestStrength * 0.07}
          transform={`rotate(${digestAngle} ${digestPoint[0]} ${digestPoint[1]})`}
        />
      )}
    </svg>
  );

  return (
    <>
      <div className="snake-outline-layer" aria-hidden="true">
        {bodyArt('outline')}
        {renderHead('outline')}
      </div>
      <div className={`snake-body-fill ${purpleSnake ? 'snake-confused' : ''} ${confused && !purpleSnake ? 'snake-confused-glow' : ''}`}>
        {bodyArt('fill')}
      </div>
      {renderHead()}
      <div className="snake-highlight-layer" aria-hidden="true">
        {bodyArt('highlight')}
      </div>
    </>
  );
}
