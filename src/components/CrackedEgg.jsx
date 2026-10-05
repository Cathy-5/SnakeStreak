import '../App.css'

export default function CrackedEgg({ position, phase, targetPosition }) {
  const [x, y] = position;
  const targetStyle = targetPosition && {
    gridColumn: targetPosition[0] + 1,
    gridRow: targetPosition[1] + 1,
  };

  return (
    <>
      <div
        className={`cracked-egg cracked-egg-${phase}`}
        style={{ gridColumn: x + 1, gridRow: y + 1 }}
        role="img"
        aria-label={phase === 'warning' ? 'A cracked egg is hatching' : 'A cracked egg is chasing the snake'}
      >
        <svg viewBox="0 0 64 68" aria-hidden="true">
          <path
            className="cracked-egg-shell cracked-egg-shell-upper"
            d="M8 35L21 29L18 39L31 32L30 42L43 34L42 44L55 30C59 18 49 5 33 5C18 5 8 17 8 35Z"
          />
          <path
            className="cracked-egg-shell cracked-egg-shell-lower"
            d="M8 40L22 34L19 44L32 37L31 47L44 39L43 49L56 35C60 49 50 63 33 63C17 63 7 52 8 40Z"
          />
        </svg>
      </div>
      {targetStyle && (
        <span className="cracked-egg-target" style={targetStyle} aria-hidden="true" />
      )}
    </>
  );
}
