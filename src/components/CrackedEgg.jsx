import '../App.css'

export default function CrackedEgg({ position, phase }) {
  const [x, y] = position;

  return (
    <div
      className={`cracked-egg cracked-egg-${phase}`}
      style={{ gridColumn: x + 1, gridRow: y + 1 }}
      role="img"
      aria-label={phase === 'warning' ? 'A cracked egg is hatching' : 'A cracked egg is chasing the snake'}
    >
      <svg viewBox="0 0 48 54" aria-hidden="true">
        <path
          className="cracked-egg-shell"
          d="M24 3C14 3 5 19 5 33c0 11 8 18 19 18s19-7 19-18C43 19 34 3 24 3Z"
        />
        <path className="cracked-egg-crack" d="m20 5 4 8-5 5 7 4-5 7" />
        <ellipse className="cracked-egg-eye" cx="17" cy="32" rx="2.2" ry="3" />
        <ellipse className="cracked-egg-eye" cx="30" cy="32" rx="2.2" ry="3" />
        <path className="cracked-egg-mouth" d="M19 41q5 4 10 0" />
      </svg>
    </div>
  );
}
