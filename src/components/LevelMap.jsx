import { isLevelAdUnlocked } from "../services/entitlements";

function starsText(n = 0) {
  return "⭐".repeat(n) + "☆".repeat(3 - n);
}

function truncateText(text = "") {
  return text.length > 6 ? `${text.slice(0, 6)}…` : text;
}

export default function LevelMap({
  groupId,
  groupTitle,
  items,
  currentIndex,
  starsByLevel,
  defaultPracticeMode,
  onSelectLevel,
  onBackToGroups,
}) {
  const isNormallyUnlocked = (idx) => {
    if (idx === 0) return true;

    const previous = items[idx - 1];
    const previousModes =
      previous.supportedModes || [previous.mode];

    const previousStars = Math.max(
      ...previousModes.map(
        (mode) =>
          starsByLevel?.[`${previous.id}::${mode}`] ?? 0
      )
    );

    return previousStars >= 1;
  };

  return (
    <section className="selector-card">
      <h2>🗺️ 關卡地圖</h2>
      <p className="map-subtitle">{groupTitle}</p>

      <div className="level-map-grid">
        {items.map((level, index) => {
          const normalUnlocked = isNormallyUnlocked(index);
          const adUnlocked = isLevelAdUnlocked(level.id);
          const unlocked = normalUnlocked || adUnlocked;

          const effectiveMode =
            level.supportedModes?.includes(defaultPracticeMode)
              ? defaultPracticeMode
              : level.mode;

          const stars = Math.max(
            ...(
              level.supportedModes || [effectiveMode]
            ).map(
              (mode) =>
                starsByLevel?.[`${level.id}::${mode}`] ?? 0
            )
          );

          const active = index === currentIndex;

          return (
            <button
              key={level.id}
              type="button"
              className={[
                "level-node",
                active ? "active" : "",
                !unlocked ? "locked" : "",
              ].join(" ")}
              onClick={() => onSelectLevel(index)}
              title={
                unlocked
                  ? `${level.text} - ${starsText(stars)}`
                  : "觀看一次廣告解鎖此關"
              }
            >
              <span className="node-index">
                {index + 1}
              </span>

              <span className="node-char">
                {truncateText(level.text)}
              </span>

              <span className="node-mode">
                {effectiveMode === "doodle" ? "塗鴉" : "寫字"}
              </span>

              <span className="node-stars">
                {starsText(stars)}
              </span>

              {!unlocked && (
                <span className="node-lock">🔒</span>
              )}

              {adUnlocked && !normalUnlocked && (
                <span className="node-ad-unlocked">
                  廣告解鎖
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="map-legend">
        <span>
          未解鎖關卡可以觀看一次獎勵廣告解鎖。
        </span>
      </div>

      <div className="selector-actions">
        <button
          type="button"
          className="secondary"
          onClick={onBackToGroups}
        >
          ⬅️ 返回
        </button>
      </div>
    </section>
  );
}