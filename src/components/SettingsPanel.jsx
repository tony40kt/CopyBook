const COLOR_OPTIONS = [
  "#111111", // black
  "#e53935", // red
  "#fb8c00", // orange
  "#fdd835", // yellow
  "#43a047", // green
  "#1e88e5", // blue
  "#8e24aa", // purple
  "#ec407a", // pink
];

export default function SettingsPanel({
  brushColor,
  setBrushColor,
  gridType,
  setGridType,
  defaultPracticeMode,
  setDefaultPracticeMode,
  toleranceLevel,
  setToleranceLevel,
  onResetProgress,
  onUnlockAll,
  onClose,
}) {
  return (
    <section className="selector-card">
      <h2>⚙️ 設定</h2>

      <div className="settings-block">
        <h3>筆色</h3>
        <div className="color-grid">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              className={`color-dot ${brushColor === c ? "active" : ""}`}
              style={{ backgroundColor: c }}
              onClick={() => setBrushColor(c)}
              aria-label={`選擇顏色 ${c}`}
              title={c === "#111111" ? "黑色" : c}
            />
          ))}
        </div>
      </div>

      <div className="settings-block">
        <h3>格線</h3>
        <div className="controls-row">
          <label htmlFor="gridTypeSelect">格線類型：</label>
          <select
            id="gridTypeSelect"
            value={gridType}
            onChange={(e) => setGridType(e.target.value)}
          >
            <option value="none">空白</option>
            <option value="tian">田字格</option>
            <option value="mi">米字格</option>
          </select>
        </div>
      </div>

      <div className="settings-block">
        <h3>練習模式</h3>
        <div className="controls-row">
          <label htmlFor="practiceModeSelect">預設模式：</label>
          <select
            id="practiceModeSelect"
            value={defaultPracticeMode}
            onChange={(e) => setDefaultPracticeMode(e.target.value)}
          >
            <option value="writing">寫字</option>
            <option value="doodle">塗鴉</option>
          </select>
        </div>
      </div>

      <div className="settings-block">
        <h3>評分寬容度</h3>
        <div className="controls-row">
          <label htmlFor="toleranceSelect">寬容度：</label>
          <select
            id="toleranceSelect"
            value={toleranceLevel}
            onChange={(e) => setToleranceLevel(e.target.value)}
          >
            <option value="strict">嚴格</option>
            <option value="standard">標準</option>
            <option value="relaxed">寬鬆</option>
          </select>
        </div>
      </div>

      <div className="settings-block danger-zone">
        <h3>進階操作</h3>
        <div className="controls-row">
          <button className="secondary" onClick={onResetProgress}>
            🗑️ 清除所有進度
          </button>
          <button className="accent" onClick={onUnlockAll}>
            🔓 解鎖所有關卡
          </button>
        </div>
      </div>

      <div className="selector-actions">
        <button className="secondary" onClick={onClose}>⬅️ 返回</button>
      </div>
    </section>
  );
}