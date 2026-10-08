export default function LanguageSelector({ onSelect, onOpenDailyMap }) {
  return (
    <section className="selector-card">
      <h2>請先選擇練習語言 / Choose a Language</h2>

      <div className="selector-grid selector-grid-vertical">
        <button className="selector-btn" onClick={() => onSelect("english")}>
          英文 English
        </button>

        <button className="selector-btn" onClick={() => onSelect("chinese")}>
          中文 Chinese
        </button>

        <button className="selector-btn" type="button" onClick={() => onOpenDailyMap?.()}>
          🎯 每日挑戰
        </button>
      </div>
    </section>
  );
}