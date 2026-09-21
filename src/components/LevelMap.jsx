function starsText(n = 0) {
  return "⭐".repeat(n) + "☆".repeat(3 - n);
}

function truncateText(text = "") {
  return text.length > 6 ? `${text.slice(0, 6)}…` : text;
}

export default function LevelMap({
  groupTitle,
  items,
  currentIndex,
  starsByLevel,
  defaultPracticeMode,
  onSelectLevel,
  onBackToGroups,
}) {
  // 解鎖規則：
  // 第1關永遠解鎖
  // 第N關需前一關 >=1星
  const isUnlocked = (idx) => {
    if (idx === 0) return true;
    const prev = items[idx - 1];
    const prevMode = prev.supportedModes?.includes(defaultPracticeMode)
      ? defaultPracticeMode
      : prev.mode;
    const prevStars = starsByLevel?.[`${prev.id}::${prevMode}`] ?? 0;
    return prevStars >= 1;
  };

  return (
    <section className="selector-card">
      <h2>🗺️ 關卡地圖</h2>
      <p className="map-subtitle">{groupTitle}</p>

      <div className="level-map-grid">
        {items.map((lv, idx) => {
          const unlocked = isUnlocked(idx);
          const effectiveMode = lv.supportedModes?.includes(defaultPracticeMode)
            ? defaultPracticeMode
            : lv.mode;
          const stars = starsByLevel?.[`${lv.id}::${effectiveMode}`] ?? 0;
          const active = idx === currentIndex;

          return (
            <button
              key={lv.id}
              className={`level-node ${active ? "active" : ""} ${!unlocked ? "locked" : ""}`}
              onClick={() => unlocked && onSelectLevel(idx)}
              disabled={!unlocked}
              title={unlocked ? `${lv.text} - ${starsText(stars)}` : "先完成前一關拿至少1星"}
            >
              <span className="node-index">{idx + 1}</span>
              <span className="node-char">{truncateText(lv.text)}</span>
              <span className="node-mode">{effectiveMode === "doodle" ? "塗鴉" : "寫字"}</span>
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
          ⬅️ 返回
        </button>
      </div>
    </section>
  );
}