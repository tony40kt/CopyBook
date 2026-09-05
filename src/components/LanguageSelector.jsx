export default function LanguageSelector({ onSelect }) {
  return (
    <section className="selector-card">
      <h2>請先選擇學習語言 / Choose a Language</h2>
      <div className="selector-grid">
        <button className="selector-btn" onClick={() => onSelect("english")}>
          🇬🇧 English
        </button>
        <button className="selector-btn" onClick={() => onSelect("chinese")}>
          🇹🇼 中文
        </button>
      </div>
    </section>
  );
}