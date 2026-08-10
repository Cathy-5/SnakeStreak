import '../App.css'

export default function Food({ food }) {
  const [x, y] = food.position;

  return (
    <div
      className={`food food-${food.color}`}
      style={{ gridColumn: x + 1, gridRow: y + 1 }}
      aria-label={`${food.color} egg`}
    />
  );
}
