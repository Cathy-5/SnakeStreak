import '../App.css'

const CONTROLS = [
  { direction: 'UP', label: 'Up', symbol: '↑' },
  { direction: 'LEFT', label: 'Left', symbol: '←' },
  { direction: 'DOWN', label: 'Down', symbol: '↓' },
  { direction: 'RIGHT', label: 'Right', symbol: '→' },
];

export default function MobileControls({ onDirectionChange }) {
  return (
    <nav className="mobile-controls" aria-label="Snake direction controls">
      <small>Swipe the board or tap</small>
      <div className="direction-pad">
        {CONTROLS.map(({ direction, label, symbol }) => (
          <button
            type="button"
            className={`control-${direction.toLowerCase()}`}
            aria-label={`Move ${label.toLowerCase()}`}
            key={direction}
            onClick={() => onDirectionChange(direction)}
          >
            <span aria-hidden="true">{symbol}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
