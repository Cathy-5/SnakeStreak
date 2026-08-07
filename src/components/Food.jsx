import "../App.css"

export default function Food({food}) {

    const egg = food.map(([x, y], index) => (
    <div
        className="food"
            key={(`${x}-${y}-${index}`)}
            style={{
            gridColumn: x + 1,
            gridRow: y + 1,
        }}
    />
    ));

    return egg;

}
