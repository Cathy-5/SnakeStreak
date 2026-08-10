import '../App.css'

export default function TailDissolve({ effect }) {
  const [x, y] = effect.position;

  return (
    <div
      className={`tail-dissolve reward-${effect.color}`}
      style={{ gridColumn: x + 1, gridRow: y + 1 }}
      aria-hidden="true"
    >
      <span className="tail-ghost" />
      <span className="tail-particle particle-one" />
      <span className="tail-particle particle-two" />
      <span className="tail-particle particle-three" />
      <span className="tail-particle particle-four" />
      <span className="tail-minus">-1</span>
    </div>
  );
}
