import '../App.css'

export default function Food({ foods }) {
  return foods.map((food) => {
    const [x, y] = food.position;

    return (
      <div
        key={`${food.color}-${x}-${y}`}
        className={`food food-${food.color} ${food.isTarget ? 'food-target' : ''} ${food.isHazard ? 'food-hazard' : ''}`}
        style={{ gridColumn: x + 1, gridRow: y + 1 }}
        aria-label={
          food.isHazard ? 'purple confusion egg' :
          food.isGolden ? 'limited-time golden wildcard egg' :
          `${food.color} egg${food.isTarget ? ', streak target' : ''}`
        }
      >
        <span className="egg-shine" aria-hidden="true" />
        <span className="egg-spot spot-one" aria-hidden="true" />
        <span className="egg-spot spot-two" aria-hidden="true" />
        <span className="egg-spot spot-three" aria-hidden="true" />
      </div>
    );
  });
}
