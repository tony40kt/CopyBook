function starsText(n = 0) {
  return "⭐".repeat(n) + "☆".repeat(3 - n);
}

export default function LevelMap({
  groupTitle,
  items,
  currentIndex,
  starsByLevel,
  onSelectLevel,
  onBackToGroups,
}) {
  // 解鎖規則：
  // 第1關永遠解鎖
  // 第N關需前一關 >=1星
  const isUnlocked = (idx) => {
    if (idx === 0) return true;
    const prev = items[idx - 1];
    const prevStars = starsByLevel?.[prev.id] ?? 0;
    return prevStars >= 1;
  };

  return (
    <section className="selector-card">
      <h2>🗺️ 關卡地圖</h2>
      <p className="map-subtitle">{groupTitle}</p>

      <div className="level-map-grid">
        {items.map((lv, idx) => {
          const unlocked = isUnlocked(idx);
          const stars = starsByLevel?.[lv.id] ?? 0;
          const active = idx === currentIndex;

          return (
            <button
              key={lv.id}
              className={`level-node ${active ? "active" : ""} ${!unlocked ? "locked" : ""}`}
              onClick={() => unlocked && onSelectLevel(idx)}
              disabled={!unlocked}
              title={unlocked ? `${lv.char} - ${starsText(stars)}` : "先完成前一關拿至少1星"}
            >
              <span className="node-index">{idx + 1}</span>
              <span className="node-char">{lv.char}</span>
              <span className="node-stars">{starsText(stars)}</span>
              {!unlocked && <span className="node-lock">🔒</span>}
            </button>
          );
        })}
      </div>

      <div className="map-legend">
        <span>解鎖條件：前一關至少 1⭐</span>
      </div>

      <div className="selector-actions">
        <button className="secondary" onClick={onBackToGroups}>
          ⬅️ 返回課程分類
        </button>
      </div>
    </section>
  );
}