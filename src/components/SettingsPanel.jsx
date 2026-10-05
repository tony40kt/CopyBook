const COLOR_OPTIONS = [
  "#111111",
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#1e88e5",
  "#8e24aa",
  "#ec407a",
];

const FREE_COLORS = ["#111111", "#e53935"];

const COLOR_NAMES = {
  "#111111": "黑色",
  "#e53935": "紅色",
  "#fb8c00": "橙色",
  "#fdd835": "黃色",
  "#43a047": "綠色",
  "#1e88e5": "藍色",
  "#8e24aa": "紫色",
  "#ec407a": "粉紅色",
};

function isColorAvailable(color) {
  if (FREE_COLORS.includes(color)) {
    return true;
  }

  try {
    const raw = localStorage.getItem("copybook_entitlements_v1");

    if (!raw) {
      return false;
    }

    const state = JSON.parse(raw);

    return (
      state?.allColors === true ||
      Array.isArray(state?.unlockedColors) &&
        state.unlockedColors.includes(color)
    );
  } catch (error) {
    console.warn("讀取筆色解鎖資料失敗：", error);
    return false;
  }
}

export default function SettingsPanel({
  brushColor,
  setBrushColor,
  onRequestUnlockColor,
  onPurchaseAllColors,
  onRestorePurchases,
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
  const chooseColor = (color) => {
    const unlocked = isColorAvailable(color);

    if (unlocked) {
      setBrushColor?.(color);
      return;
    }

    if (typeof onRequestUnlockColor === "function") {
      onRequestUnlockColor(color);
      return;
    }

    window.alert("此顏色尚未解鎖。請先完成廣告功能設定。");
  };

  return (
    <section className="selector-card">
      <h2>⚙️ 設定</h2>

      <div className="settings-block">
        <h3>筆色</h3>

        <div className="color-grid">
          {COLOR_OPTIONS.map((color) => {
            const unlocked = isColorAvailable(color);

            return (
              <button
                key={color}
                type="button"
                className={`color-dot ${
                  brushColor === color ? "active" : ""
                } ${!unlocked ? "locked" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => chooseColor(color)}
                aria-label={
                  unlocked
                    ? `選擇${COLOR_NAMES[color]}`
                    : `觀看廣告解鎖${COLOR_NAMES[color]}`
                }
                title={
                  unlocked
                    ? `選擇${COLOR_NAMES[color]}`
                    : `觀看一次廣告解鎖${COLOR_NAMES[color]}`
                }
              >
                {!unlocked && (
                  <span className="color-lock">🔒</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="settings-note">
          黑色和紅色免費；其他顏色可觀看一次廣告永久解鎖，
          或購買全部顏色。
        </p>

        <div className="controls-row">
          <button
            type="button"
            className="accent"
            onClick={() => {
              if (typeof onPurchaseAllColors === "function") {
                onPurchaseAllColors();
              } else {
                window.alert("購買功能尚未設定完成。");
              }
            }}
          >
            💳 永久解鎖全部顏色
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (typeof onRestorePurchases === "function") {
                onRestorePurchases();
              } else {
                window.alert("恢復購買功能尚未設定完成。");
              }
            }}
          >
            ♻️ 恢復購買
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h3>格線</h3>

        <div className="controls-row">
          <label htmlFor="gridTypeSelect">格線類型：</label>

          <select
            id="gridTypeSelect"
            value={gridType}
            onChange={(event) =>
              setGridType?.(event.target.value)
            }
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
            onChange={(event) =>
              setDefaultPracticeMode?.(event.target.value)
            }
          >
            <option value="writing">寫字</option>
            <option value="doodle">塗鴉</option>
          </select>
        </div>

        <p className="settings-note">
          部分關卡只支援固定模式，進入後會自動切換。
        </p>
      </div>

      <div className="settings-block">
        <h3>評分寬容度</h3>

        <div className="controls-row">
          <label htmlFor="toleranceSelect">寬容度：</label>

          <select
            id="toleranceSelect"
            value={toleranceLevel}
            onChange={(event) =>
              setToleranceLevel?.(event.target.value)
            }
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
          <button
            type="button"
            className="secondary"
            onClick={onResetProgress}
          >
            🗑️ 清除所有進度
          </button>

          
        </div>
      </div>

      <div className="selector-actions">
        <button
          type="button"
          className="secondary"
          onClick={onClose}
        >
          ⬅️ 返回
        </button>
      </div>
    </section>
  );
}