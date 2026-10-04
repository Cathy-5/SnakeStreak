import '../App.css'

export default function Food({ foods, relocatingHazardPosition, hazardLifetime }) {
  const activeHazard = foods.find((food) => food.isHazard);

  return foods.map((food) => {
    const [x, y] = food.position;
    const isRelocating = Boolean(
      food.isHazard &&
      relocatingHazardPosition &&
      x === relocatingHazardPosition[0] &&
      y === relocatingHazardPosition[1],
    );
    const isHazardAnchor = Boolean(
      activeHazard?.anchorPosition &&
      x === activeHazard.anchorPosition[0] &&
      y === activeHazard.anchorPosition[1],
    );

    return (
      <div
        key={`${food.color}-${x}-${y}`}
        className={`food food-${food.color} ${food.isHazard ? 'food-hazard' : ''} ${isRelocating ? 'food-relocating' : ''} ${isHazardAnchor ? 'food-hazard-anchor' : ''}`}
        style={{
          gridColumn: x + 1,
          gridRow: y + 1,
          '--hazard-lifetime': `${hazardLifetime}ms`,
        }}
        aria-label={
          food.isHazard ? `purple confusion egg${isRelocating ? ', moving soon' : ''}` :
          `${food.color} egg`
        }
      />
    );
  });
}
