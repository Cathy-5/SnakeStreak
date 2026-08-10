const WOW_SNAKES = [
  {
    letter: 'w',
    segments: [
      [0, 0], [1, 1], [2, 2], [3, 4], [4, 2], [5, 1], [6, 0],
      [7, 1], [8, 2], [9, 4], [10, 2], [11, 1], [12, 0],
    ],
  },
  {
    letter: 'o',
    segments: [
      [1, 0], [2, 0], [3, 0], [4, 1], [4, 2], [4, 3],
      [3, 4], [2, 4], [1, 4], [0, 3], [0, 2], [0, 1],
    ],
  },
  {
    letter: 'w',
    segments: [
      [0, 0], [1, 1], [2, 2], [3, 4], [4, 2], [5, 1], [6, 0],
      [7, 1], [8, 2], [9, 4], [10, 2], [11, 1], [12, 0],
    ],
  },
];

function getConnectorStyle(current, next) {
  if (!next) return undefined;

  const deltaX = next[0] - current[0];
  const deltaY = next[1] - current[1];
  return {
    '--wow-angle': `${Math.atan2(deltaY, deltaX) * (180 / Math.PI)}deg`,
    '--wow-length': `${Math.hypot(deltaX, deltaY) * 100}%`,
  };
}

export default function WowSnake() {
  return (
    <div className="wow-snakes" aria-label="WOW">
      {WOW_SNAKES.map(({ letter, segments }, snakeIndex) => (
        <div className={`wow-letter wow-letter-${letter}`} key={`${letter}-${snakeIndex}`}>
          {segments.map((position, index) => {
            const nextPosition = segments[index + 1]
              ?? (letter === 'o' ? segments[0] : null);
            const isHead = index === 0;

            return (
              <i
                className={`wow-segment ${isHead ? 'wow-head' : ''}`}
                key={`${position[0]}-${position[1]}`}
                style={{
                  '--wow-x': position[0] + 1,
                  '--wow-y': position[1] + 1,
                  '--wow-delay': `${(snakeIndex * 7 + index) * 18}ms`,
                }}
              >
                {nextPosition && (
                  <span
                    className="wow-connector"
                    style={getConnectorStyle(position, nextPosition)}
                  />
                )}
                {isHead && <><b /><b /></>}
              </i>
            );
          })}
        </div>
      ))}
    </div>
  );
}
