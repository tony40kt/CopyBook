import { useEffect, useMemo, useRef, useState } from "react";
import { curriculum } from "./data/curriculum";
import LanguageSelector from "./components/LanguageSelector";
import GroupSelector from "./components/GroupSelector";
import LevelMap from "./components/LevelMap";
import LetterCard from "./components/LetterCard";
import WritingCanvas from "./components/WritingCanvas";
import Controls from "./components/Controls";
import SettingsPanel from "./components/SettingsPanel";
import "./styles.css";
import StarsModal from "./components/StarsModal";

const STORAGE_KEY = "copybook_v42_progress";

export default function App() {
  const canvasApiRef = useRef(null);

  const [view, setView] = useState("language");
  const [prevView, setPrevView] = useState("language");

  const [languageKey, setLanguageKey] = useState(null);
  const [groupId, setGroupId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const brushSize = 15;
  const [brushColor, setBrushColor] = useState("#111111");
  const [gridType, setGridType] = useState("tian");
  const [clearSignal, setClearSignal] = useState(0);

const [scoreModalOpen, setScoreModalOpen] = useState(false);
const [modalStars, setModalStars] = useState(0);

  const [message, setMessage] = useState("準備好了就開始寫字吧！");
  const [completedCount, setCompletedCount] = useState(0);
  const [lastStars, setLastStars] = useState(0);
  const [starsByLevel, setStarsByLevel] = useState({});

  const lang = languageKey ? curriculum[languageKey] : null;
  const groups = lang?.groups || [];
  const currentGroup = groups.find((g) => g.id === groupId) || null;
  const items = currentGroup?.items || [];
  const current = items[currentIndex] || null;
  const groupTitle = useMemo(() => currentGroup?.title || "", [currentGroup]);

  useEffect(() => {
  console.log("[DEBUG] scoreModalOpen ->", scoreModalOpen, "modalStars=", modalStars);
}, [scoreModalOpen, modalStars]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.starsByLevel && typeof saved.starsByLevel === "object") setStarsByLevel(saved.starsByLevel);
      if (typeof saved?.completedCount === "number") setCompletedCount(saved.completedCount);
      if (typeof saved?.brushColor === "string") setBrushColor(saved.brushColor);
      if (typeof saved?.gridType === "string") setGridType(saved.gridType);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        starsByLevel,
        completedCount,
        brushColor,
        gridType,
        savedAt: new Date().toISOString(),
      })
    );
  }, [starsByLevel, completedCount, brushColor, gridType]);

  const getGroupById = (gid) => groups.find((g) => g.id === gid);

  const getGroupProgress = (group) => {
    const total = group?.items?.length ?? 0;
    if (!total) return { done: 0, total: 0, percent: 0 };
    const done = group.items.filter((lv) => (starsByLevel[lv.id] ?? 0) >= 1).length;
    return { done, total, percent: Math.round((done / total) * 100) };
  };

  const getUnlockRequirementsProgress = (group) => {
    if (!group?.unlock || group.unlock.type !== "requireGroupsAllOneStar") return [];
    return (group.unlock.groups || [])
      .map((gid) => {
        const g = getGroupById(gid);
        if (!g) return null;
        return { id: g.id, title: g.title, ...getGroupProgress(g) };
      })
      .filter(Boolean);
  };

  const isGroupUnlocked = (group) => {
    if (!group?.unlock || group.unlock.type === "none") return true;
    if (group.unlock.type === "requireGroupsAllOneStar") {
      return (group.unlock.groups || []).every((gid) => {
        const g = getGroupById(gid);
        return g ? g.items.every((lv) => (starsByLevel[lv.id] ?? 0) >= 1) : false;
      });
    }
    return true;
  };

  const getGroupLockReason = (group) => {
    if (!group?.unlock || group.unlock.type === "none") return "";
    return "需先完成 Uppercase + Lowercase 全部關卡（每關至少 1⭐）";
  };

  const openSettings = () => {
    setPrevView(view);
    setView("settings");
  };
  const closeSettings = () => setView(prevView || "language");

  const toLanguage = (key) => {
    setLanguageKey(key);
    setGroupId(null);
    setCurrentIndex(0);
    setView("groups");
  };

  const toGroup = (id) => {
    const g = groups.find((x) => x.id === id);
    if (!g || !isGroupUnlocked(g)) return;
    setGroupId(id);
    setCurrentIndex(0);
    setLastStars(0);
    setView("map");
  };

  const backToHome = () => {
    setView("language");
    setLanguageKey(null);
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
  };

  const backToGroups = () => {
    setView("groups");
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
  };

  const goToMap = () => setView("map");

  const pickLevelFromMap = (idx) => {
    setCurrentIndex(idx);
    setLastStars(starsByLevel[items[idx].id] ?? 0);
    setView("practice");
    setClearSignal((s) => s + 1);
  };

  const isLevelUnlocked = (idx) => {
    if (idx === 0) return true;
    const prev = items[idx - 1];
    return (starsByLevel[prev.id] ?? 0) >= 1;
  };

  const goPrev = () => {
    const next = (currentIndex - 1 + items.length) % items.length;
    if (!isLevelUnlocked(next)) return;
    setCurrentIndex(next);
    setLastStars(starsByLevel[items[next].id] ?? 0);
    setClearSignal((s) => s + 1);
  };

  const goNext = () => {
    const next = (currentIndex + 1) % items.length;
    if (!isLevelUnlocked(next)) return;
    setCurrentIndex(next);
    setLastStars(starsByLevel[items[next].id] ?? 0);
    setClearSignal((s) => s + 1);
  };

  const clearCanvas = () => setClearSignal((s) => s + 1);

  const scoreToStars = (score) => (score >= 60 ? 3 : score >= 46 ? 2 : score >= 41 ? 1 : 0);
  const starText = (stars) => "⭐".repeat(stars) + "☆".repeat(3 - stars);

  const encourage = () => {
  try {
    const encourage = () => {
  console.log("[DEBUG] encourage() called, current=", current?.char, "index=", currentIndex);
  try {
    // ... 你原本的程式邏輯
  } catch (err) {
    console.error("Error in encourage:", err);
    setModalStars(0);
    setScoreModalOpen(true);
  }
};
    // 先嘗試從 canvas API 取得評測結果
    const result = canvasApiRef.current?.evaluateTracing?.();
    console.log("Encourage called. guideChar=", current?.char, "evaluateTracing result=", result);

    // 如果沒有取得 result，嘗試叫 canvas 回傳 last stroke 或 debug
    if (!result) {
      console.warn("evaluateTracing returned falsy. Attempting fallback.");
      // 嘗試呼叫其他 debug helper（若有）
      const fallback = canvasApiRef.current?.getLastTrace?.() || null;
      console.log("fallback trace:", fallback);
      // 邏輯上先把 stars 設為 0 (若後端/演算法未回傳)
      setModalStars(0);
      setScoreModalOpen(true);
      return;
    }

    const stars = scoreToStars(result.score);
    setLastStars(stars);
    setModalStars(stars);
    setStarsByLevel((prev) => ({ ...prev, [current.id]: Math.max(prev[current.id] ?? 0, stars) }));
    if (stars >= 1) setCompletedCount((c) => c + 1);

    // 打開 modal 顯示結果
    setScoreModalOpen(true);
  } catch (err) {
    console.error("Error in encourage:", err);
    setModalStars(0);
    setScoreModalOpen(true);
  }
};

  const resetProgress = () => {
    if (!window.confirm("確定要清除所有星星與解鎖進度嗎？")) return;
    setStarsByLevel({});
    setCompletedCount(0);
    setLastStars(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const unlockAllLevels = () => {
    if (!window.confirm("確定要解鎖所有關卡嗎？")) return;
    const allLevelIds = Object.values(curriculum)
      .flatMap((langObj) => langObj.groups)
      .flatMap((g) => g.items)
      .map((lv) => lv.id);

    setStarsByLevel((prev) => {
      const next = { ...prev };
      allLevelIds.forEach((id) => {
        next[id] = Math.max(next[id] ?? 0, 1);
      });
      return next;
    });
  };

  if (view === "settings") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>⚙️ 設定</h1>
          <p>可調整筆色、格線與進度管理</p>
        </header>
        <SettingsPanel
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          gridType={gridType}
          setGridType={setGridType}
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
          <p>先選語言，再開始闖關練字！</p>
        </header>
        <LanguageSelector onSelect={toLanguage} />
        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button className="secondary" onClick={openSettings}>⚙️ 設定</button>
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
            <button className="secondary" onClick={openSettings}>⚙️ 設定</button>
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
          <span>{items.filter((_, idx) => isLevelUnlocked(idx)).length}</span> / {items.length}
        </section>
        <LevelMap
          groupTitle={groupTitle}
          items={items}
          currentIndex={currentIndex}
          starsByLevel={starsByLevel}
          onSelectLevel={pickLevelFromMap}
          onBackToGroups={backToGroups}
        />
        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button className="secondary" onClick={openSettings}>⚙️ 設定</button>
          </div>
        </section>
      </main>
    );
  }

  if (!current) return null;

return (
  <main className="app">
    <section className="stats-card">
      <strong>關卡：</strong> {currentIndex + 1}/{items.length} ｜ 本次：<strong>{starText(lastStars)}</strong>
    </section>

    <div className="practice-container">
      <Controls
        onPrev={goPrev}
        onNext={goNext}
        onClear={clearCanvas}
        onEncourage={encourage}
        onBackToGroups={goToMap}
      />

      <div className="practice-main">
        <LetterCard title={groupTitle} char={current.char} hint={current.hint} index={currentIndex} total={items.length} />

        <div className="writing-canvas-wrapper">
          <WritingCanvas
            ref={canvasApiRef}
            guideChar={current.char}
            brushSize={brushSize}
            brushColor={brushColor}
            gridType={gridType}
            clearSignal={clearSignal}
          />
        </div>
      </div>
    </div>

    <section className="controls" style={{ marginTop: 10 }}>
      <div className="controls-row">
        <button className="secondary" onClick={openSettings}>⚙️ 設定</button>
      </div>
    </section>

    <StarsModal
      open={scoreModalOpen}
      stars={modalStars}
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