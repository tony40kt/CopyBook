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
  if (FREE_COLORS.includes(color)) return true;

  try {
    const raw = localStorage.getItem("copybook_entitlements_v1");
    if (!raw) return false;
    const state = JSON.parse(raw);

    return (
      state?.allColors === true ||
      (Array.isArray(state?.unlockedColors) && state.unlockedColors.includes(color))
    );
  } catch {
    return false;
  }
}

export default function SettingsPanel({
  brushColor,
  setBrushColor,
  onRequestUnlockColor,
  onPurchaseAllColors,
  onRestorePurchases,
  onRedeemCode,
  gridType,
  setGridType,
  toleranceLevel,
  setToleranceLevel,
  onResetProgress,
  onClose,
  bgmEnabled,
  setBgmEnabled,
  bgmVolume,
  setBgmVolume,
  ttsRate,
  setTtsRate,
  ttsVolume,
  setTtsVolume,
  zhVoice,
  setZhVoice,
}) {
  const chooseColor = (color) => {
    const unlocked = isColorAvailable(color);
    if (unlocked) {
      setBrushColor?.(color);
      return;
    }
    onRequestUnlockColor?.(color);
  };

  const askRedeem = () => {
    const code = window.prompt("請輸入解鎖碼");
    if (!code) return;
    onRedeemCode?.(code);
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
                className={`color-dot ${brushColor === color ? "active" : ""} ${
                  !unlocked ? "locked" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => chooseColor(color)}
                title={unlocked ? `選擇${COLOR_NAMES[color]}` : `觀看廣告解鎖${COLOR_NAMES[color]}`}
              >
                {!unlocked && <span className="color-lock">🔒</span>}
              </button>
            );
          })}
        </div>

        <div className="controls-row" style={{ marginTop: 10 }}>
          <button type="button" className="accent" onClick={onPurchaseAllColors}>
            💳 永久解鎖全部顏色
          </button>
          <button type="button" className="secondary" onClick={onRestorePurchases}>
            ♻️ 恢復購買
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h3>優惠碼</h3>
        <div className="controls-row">
          <button type="button" className="accent" onClick={askRedeem}>
            🎟️ 輸入優惠碼
          </button>
        </div>
      </div>

      <div className="settings-block">
        <h3>背景音樂</h3>
        <div className="controls-row">
          <label style={{ minWidth: 88 }}>音樂開關：</label>
          <button
            type="button"
            className={bgmEnabled ? "accent" : "secondary"}
            onClick={() => setBgmEnabled?.(!bgmEnabled)}
          >
            {bgmEnabled ? "開啟中" : "已關閉"}
          </button>
        </div>

        <div className="controls-row" style={{ marginTop: 8 }}>
          <label htmlFor="bgmVolumeRange" style={{ minWidth: 88 }}>
            音量：
          </label>
          <input
            id="bgmVolumeRange"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={bgmVolume ?? 0.3}
            onChange={(e) => setBgmVolume?.(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: 44, textAlign: "right" }}>
            {Math.round((bgmVolume ?? 0.3) * 100)}%
          </span>
        </div>
      </div>

      <div className="settings-block">
        <h3>TTS 發音</h3>

        <div className="controls-row">
          <label htmlFor="ttsRateRange" style={{ minWidth: 88 }}>
            語速：
          </label>
          <input
            id="ttsRateRange"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value={ttsRate ?? 0.8}
            onChange={(e) => setTtsRate?.(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: 44, textAlign: "right" }}>
            {(ttsRate ?? 0.8).toFixed(2)}x
          </span>
        </div>

        <div className="controls-row" style={{ marginTop: 8 }}>
          <label htmlFor="ttsVolumeRange" style={{ minWidth: 88 }}>
            音量：
          </label>
          <input
            id="ttsVolumeRange"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={ttsVolume ?? 0.3}
            onChange={(e) => setTtsVolume?.(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: 44, textAlign: "right" }}>
            {Math.round((ttsVolume ?? 0.3) * 100)}%
          </span>
        </div>

        <div className="controls-row" style={{ marginTop: 8 }}>
          <label htmlFor="zhVoiceSelect">中文發音：</label>
          <select
            id="zhVoiceSelect"
            value={zhVoice || "cantonese"}
            onChange={(e) => setZhVoice?.(e.target.value)}
          >
            <option value="cantonese">粵語（yue-HK）</option>
            <option value="mandarin">普通話（zh-CN）</option>
          </select>
        </div>
      </div>

      <div className="settings-block">
        <h3>格線</h3>
        <div className="controls-row">
          <label htmlFor="gridTypeSelect">格線類型：</label>
          <select
            id="gridTypeSelect"
            value={gridType}
            onChange={(event) => setGridType?.(event.target.value)}
          >
            <option value="none">空白</option>
            <option value="tian">田字格</option>
            <option value="mi">米字格</option>
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
            onChange={(event) => setToleranceLevel?.(event.target.value)}
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
          <button type="button" className="secondary" onClick={onResetProgress}>
            🗑️ 清除所有進度
          </button>
        </div>
      </div>

      <div className="selector-actions">
        <button type="button" className="secondary" onClick={onClose}>
          ⬅️ 返回
        </button>
      </div>
    </section>
  );
}