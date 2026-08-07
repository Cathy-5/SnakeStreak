import '../App.css';

export function Snake() {

    const segments = [
        [5, 5],
        [4, 5],
        [3, 5],
    ];

    const snakeBody = segments.map(([x, y], index) => (
        <div
            className="snake"
            key={(`${x}-${y}-${index}`)}
            style={{
            gridColumn: x + 1,
            gridRow: y + 1,
        }}
        />

    ));

    return snakeBody;
}

export default Snake;