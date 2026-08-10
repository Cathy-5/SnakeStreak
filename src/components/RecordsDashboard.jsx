const ORDERED_DIFFICULTIES = ['easy', 'normal', 'difficult'];

export default function RecordsDashboard({ records, labels, onClose, onClear, clearArmed }) {
  return (
    <aside className="records-dashboard" aria-label="Personal records">
      <div className="records-heading">
        <div>
          <small>Local history</small>
          <h2>Personal records</h2>
        </div>
        <button type="button" className="records-close" onClick={onClose} aria-label="Close records">
          ×
        </button>
      </div>

      <div className="records-columns" aria-hidden="true">
        <span>Mode</span><span>Eggs</span><span>Streaks</span><span>Wins</span><span>Runs</span>
      </div>
      <div className="records-list">
        {ORDERED_DIFFICULTIES.map((difficulty) => (
          <div className="records-row" key={difficulty}>
            <strong>{labels[difficulty]}</strong>
            <span>{records[difficulty].bestEggs}</span>
            <span>{records[difficulty].bestStreaks}</span>
            <span>{records[difficulty].boardsCleared}</span>
            <span>{records[difficulty].gamesPlayed}</span>
          </div>
        ))}
      </div>

      <button type="button" className="records-clear" onClick={onClear}>
        {clearArmed ? 'Tap again to confirm' : 'Clear records'}
      </button>
    </aside>
  );
}
