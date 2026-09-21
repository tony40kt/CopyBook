import { useEffect, useRef, useState } from "react";
import { curriculum } from "./data/curriculum";
import LanguageSelector from "./components/LanguageSelector";
import GroupSelector from "./components/GroupSelector";
import LevelMap from "./components/LevelMap";
import LetterCard from "./components/LetterCard";
import WritingCanvas from "./components/WritingCanvas";
import Controls from "./components/Controls";
import SettingsPanel from "./components/SettingsPanel";
import StarsModal from "./components/StarsModal";
import { scoreToStars } from "./lib/evaluation/profiles";
import "./styles.css";

const STORAGE_KEY = "copybook_v43_progress";
const LEGACY_STORAGE_KEY = "copybook_v42_progress";
const SETTINGS_VERSION = 2;
const BRUSH_SIZE = 15;

function loadSavedProgress() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("讀取本機進度失敗：", error);
    return {};
  }
}

function normalizeStoredStars(storedStars = {}) {
  return Object.fromEntries(
    Object.entries(storedStars).map(([key, value]) => [
      key.includes("::") ? key : `${key}::writing`,
      value,
    ])
  );
}

export default function App() {
  const canvasApiRef = useRef(null);
  const savedProgress = loadSavedProgress();

  const [view, setView] = useState("language");
  const [prevView, setPrevView] = useState("language");

  const [languageKey, setLanguageKey] = useState(null);
  const [groupId, setGroupId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [brushColor, setBrushColor] = useState(savedProgress.brushColor || "#111111");
  const [gridType, setGridType] = useState(savedProgress.gridType || "tian");
  const [defaultPracticeMode, setDefaultPracticeMode] = useState(
    savedProgress.defaultPracticeMode || "writing"
  );
  const [toleranceLevel, setToleranceLevel] = useState(
    savedProgress.toleranceLevel || "standard"
  );
  const [clearSignal, setClearSignal] = useState(0);

  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [modalStars, setModalStars] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  const [message, setMessage] = useState("準備好了就開始練習吧！");
  const [completedCount, setCompletedCount] = useState(savedProgress.completedCount || 0);
  const [lastStars, setLastStars] = useState(0);
  const [starsByLevel, setStarsByLevel] = useState(
    normalizeStoredStars(savedProgress.starsByLevel || {})
  );

  const lang = languageKey ? curriculum[languageKey] : null;
  const groups = lang?.groups || [];
  const currentGroup = groups.find((group) => group.id === groupId) || null;
  const items = currentGroup?.items || [];
  const current = items[currentIndex] || null;

  const getLevelMode = (level) =>
    !level || level.supportedModes?.includes(defaultPracticeMode)
      ? defaultPracticeMode
      : level.mode;

  const getLevelProgressKey = (level, mode = getLevelMode(level)) =>
    level ? `${level.id}::${mode}` : "";

  const currentMode = getLevelMode(current);
  const groupTitle = currentGroup?.title || "";

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        settingsVersion: SETTINGS_VERSION,
        starsByLevel,
        completedCount,
        brushColor,
        gridType,
        defaultPracticeMode,
        toleranceLevel,
        savedAt: new Date().toISOString(),
      })
    );
  }, [starsByLevel, completedCount, brushColor, gridType, defaultPracticeMode, toleranceLevel]);

  const getGroupById = (gid) => groups.find((group) => group.id === gid);

  const getGroupProgress = (group) => {
    const total = group?.items?.length ?? 0;
    if (!total) return { done: 0, total: 0, percent: 0 };

    const done = group.items.filter(
      (level) => (starsByLevel[getLevelProgressKey(level)] ?? 0) >= 1
    ).length;
    return {
      done,
      total,
      percent: Math.round((done / total) * 100),
    };
  };

  const getUnlockRequirementsProgress = (group) => {
    if (!group?.unlock || group.unlock.type !== "requireGroupsAllOneStar") {
      return [];
    }

    return (group.unlock.groups || [])
      .map((gid) => {
        const requiredGroup = getGroupById(gid);
        if (!requiredGroup) return null;
        return {
          id: requiredGroup.id,
          title: requiredGroup.title,
          ...getGroupProgress(requiredGroup),
        };
      })
      .filter(Boolean);
  };

  const isGroupUnlocked = (group) => {
    if (!group?.unlock || group.unlock.type === "none") return true;

    if (group.unlock.type === "requireGroupsAllOneStar") {
      return (group.unlock.groups || []).every((gid) => {
        const requiredGroup = getGroupById(gid);
        return requiredGroup
          ? requiredGroup.items.every(
              (level) => (starsByLevel[getLevelProgressKey(level)] ?? 0) >= 1
            )
          : false;
      });
    }

    return true;
  };

  const getGroupLockReason = (group) => group?.unlock?.description || "";

  const openSettings = () => {
    setPrevView(view);
    setView("settings");
  };

  const closeSettings = () => {
    setView(prevView || "language");
  };

  const toLanguage = (key) => {
    setLanguageKey(key);
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage("請選擇一個課程開始練習。");
    setView("groups");
  };

  const toGroup = (id) => {
    const group = groups.find((item) => item.id === id);
    if (!group || !isGroupUnlocked(group)) return;

    setGroupId(id);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage(`已進入「${group.title}」關卡地圖。`);
    setView("map");
  };

  const backToHome = () => {
    setView("language");
    setLanguageKey(null);
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage("準備好了就開始練習吧！");
  };

  const backToGroups = () => {
    setView("groups");
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
  };

  const goToMap = () => {
    setView("map");
  };

  const pickLevelFromMap = (index) => {
    setCurrentIndex(index);
    setLastStars(starsByLevel[getLevelProgressKey(items[index])] ?? 0);
    setView("practice");
    setMessage("沿著提示開始練習，完成後按下「我完成了」。");
    setClearSignal((signal) => signal + 1);
  };

  const isLevelUnlocked = (index) => {
    if (index === 0) return true;
    const previousLevel = items[index - 1];
    return (starsByLevel[getLevelProgressKey(previousLevel)] ?? 0) >= 1;
  };

  const goPrev = () => {
    if (!items.length) return;
    const nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (!isLevelUnlocked(nextIndex)) {
      setMessage("上一關尚未解鎖。");
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(starsByLevel[getLevelProgressKey(items[nextIndex])] ?? 0);
    setClearSignal((signal) => signal + 1);
  };

  const goNext = () => {
    if (!items.length) return;
    const nextIndex = (currentIndex + 1) % items.length;
    if (!isLevelUnlocked(nextIndex)) {
      setMessage("下一關需要先在目前關卡取得至少 1 顆星。");
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(starsByLevel[getLevelProgressKey(items[nextIndex])] ?? 0);
    setClearSignal((signal) => signal + 1);
  };

  const clearCanvas = () => {
    setClearSignal((signal) => signal + 1);
    setMessage("已清除，請重新練習！");
  };

  const encourage = () => {
    try {
      const result = canvasApiRef.current?.evaluateTracing?.();

      if (!result || typeof result.score !== "number") {
        setLastStars(0);
        setModalStars(0);
        setMessage("目前無法取得評測結果，請清除後再試一次。");
        setLastResult(null);
        setScoreModalOpen(true);
        return;
      }

      const stars = scoreToStars(result.score, result.starThresholds);
      const progressKey = getLevelProgressKey(current, currentMode);
      const previousBestStars = starsByLevel[progressKey] ?? 0;

      setLastStars(stars);
      setModalStars(stars);
      setLastResult({
        ...result,
        stars,
        text: current.text,
        unit: current.unit,
        language: current.language,
      });
      setScoreModalOpen(true);

      setStarsByLevel((previous) => ({
        ...previous,
        [progressKey]: Math.max(previous[progressKey] ?? 0, stars),
      }));

      if (stars >= 1 && previousBestStars < 1) {
        setCompletedCount((count) => count + 1);
      }

      if (stars >= 1) {
        setMessage(
          currentMode === "doodle"
            ? `完成主題塗鴉！本次 ${result.score} 分，獲得 ${stars} 顆星。`
            : `太棒了！本次分數 ${result.score} 分，獲得 ${stars} 顆星。`
        );
      } else {
        setMessage(
          currentMode === "doodle"
            ? `本次塗鴉分數 ${result.score} 分，再畫滿一些試試看！`
            : `本次分數 ${result.score} 分，再沿著提示描寫一次試試看！`
        );
      }
    } catch (error) {
      console.error("[ERROR] encourage failed:", error);
      setLastStars(0);
      setModalStars(0);
      setLastResult(null);
      setMessage("評測時發生問題，請再試一次。");
      setScoreModalOpen(true);
    }
  };

  const resetProgress = () => {
    if (!window.confirm("確定要清除所有星星與解鎖進度嗎？")) return;

    setStarsByLevel({});
    setCompletedCount(0);
    setLastStars(0);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  };

  const unlockAllLevels = () => {
    if (!window.confirm("確定要解鎖所有關卡嗎？")) return;

    const allLevelIds = Object.values(curriculum)
      .flatMap((language) => language.groups)
      .flatMap((group) => group.items)
      .map((level) => level.id);

    setStarsByLevel((previous) => {
      const next = { ...previous };
      allLevelIds.forEach((id) => {
        next[`${id}::writing`] = Math.max(next[`${id}::writing`] ?? 0, 1);
        next[`${id}::doodle`] = Math.max(next[`${id}::doodle`] ?? 0, 1);
      });
      return next;
    });
  };

  if (view === "settings") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>⚙️ 設定</h1>
          <p>調整筆色、格線、評分寬容度與預設練習模式</p>
        </header>

        <SettingsPanel
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          gridType={gridType}
          setGridType={setGridType}
          defaultPracticeMode={defaultPracticeMode}
          setDefaultPracticeMode={setDefaultPracticeMode}
          toleranceLevel={toleranceLevel}
          setToleranceLevel={setToleranceLevel}
          onResetProgress={resetProgress}
          onUnlockAll={unlockAllLevels}
          onClose={closeSettings}
        />
      </main>
    );
  }

  if (view === "language") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>🧒 CopyBook 練字樂園</h1>
          <p>先選語言，再開始闖關練字或主題塗鴉！</p>
        </header>

        <LanguageSelector onSelect={toLanguage} />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === "groups") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>🧒 CopyBook 練字樂園</h1>
          <p>請選擇課程分類</p>
        </header>

        <GroupSelector
          languageLabel={lang?.label || ""}
          groups={groups}
          isGroupUnlocked={isGroupUnlocked}
          getGroupLockReason={getGroupLockReason}
          getUnlockRequirementsProgress={getUnlockRequirementsProgress}
          onBack={backToHome}
          onPickGroup={toGroup}
        />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (view === "map") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>🗺️ 關卡地圖</h1>
          <p>完成前一關至少 1⭐ 才能解鎖下一關</p>
        </header>

        <section className="stats-card">
          <strong>解鎖進度：</strong>
          <span>{items.filter((_, index) => isLevelUnlocked(index)).length}</span>
          {" / "}
          {items.length}
          {" ｜ "}
          <strong>已完成：</strong>
          {completedCount}
        </section>

        <LevelMap
          groupTitle={groupTitle}
          items={items}
          currentIndex={currentIndex}
          starsByLevel={starsByLevel}
          defaultPracticeMode={defaultPracticeMode}
          onSelectLevel={pickLevelFromMap}
          onBackToGroups={backToGroups}
        />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!current) return null;

  return (
    <main className="app">
      <section className="stats-card">
        <strong>關卡：</strong>
        {currentIndex + 1}/{items.length}
        {" ｜ "}
        本次：<strong>{lastStars ? "⭐".repeat(lastStars) + "☆".repeat(3 - lastStars) : "☆☆☆"}</strong>
        {" ｜ "}
        模式：<strong>{currentMode === "doodle" ? "塗鴉" : "寫字"}</strong>
        {" ｜ "}
        寬容度：<strong>{toleranceLevel}</strong>
      </section>

      <div className="message-box">{message}</div>

      <div className="practice-container">
        <Controls
          practiceMode={currentMode}
          onPrev={goPrev}
          onNext={goNext}
          onClear={clearCanvas}
          onEncourage={encourage}
          onBackToGroups={goToMap}
        />

        <div className="practice-main">
          <LetterCard
            title={groupTitle}
            text={current.text}
            hint={current.hint}
            index={currentIndex}
            total={items.length}
            unit={current.unit}
            language={current.language}
            practiceMode={currentMode}
            toleranceLevel={toleranceLevel}
          />

          <div className="writing-canvas-wrapper">
            <WritingCanvas
              ref={canvasApiRef}
              item={current}
              practiceMode={currentMode}
              brushSize={BRUSH_SIZE}
              brushColor={brushColor}
              gridType={gridType}
              toleranceLevel={toleranceLevel}
              clearSignal={clearSignal}
            />
          </div>
        </div>
      </div>

      <section className="controls" style={{ marginTop: 10 }}>
        <div className="controls-row">
          <button className="secondary" onClick={openSettings}>
            ⚙️ 設定
          </button>
        </div>
      </section>

      <StarsModal
        open={scoreModalOpen}
        stars={modalStars}
        result={lastResult}
        onRetry={() => {
          setScoreModalOpen(false);
          clearCanvas();
        }}
        onNext={() => {
          setScoreModalOpen(false);
          goNext();
        }}
        onClose={() => setScoreModalOpen(false)}
      />
    </main>
  );
}
