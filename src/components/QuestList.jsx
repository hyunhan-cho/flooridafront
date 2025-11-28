export default function QuestList({ progress = 0, done = 0, total = 0 }) {
  return (
    <section className="card card-quests">
      <h2 className="card-title">오늘의 진행도</h2>
      <div className="bar-row">
        <div className="bar">
          <div
            className="bar-fill"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <div className="bar-count">
          {done}/{total}
        </div>
      </div>
    </section>
  );
}
