import { useEffect, useMemo, useRef, useState } from "react";
import { curriculum } from "./data/curriculum";
import LanguageSelector from "./components/LanguageSelector";
import GroupSelector from "./components/GroupSelector";
import LevelMap from "./components/LevelMap";
import LetterCard from "./components/LetterCard";
import WritingCanvas from "./components/WritingCanvas";
import Controls from "./components/Controls";
import SettingsPanel from "./components/SettingsPanel";
import StarsModal from "./components/StarsModal";
import "./styles.css";

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
  const currentGroup = groups.find((group) => group.id === groupId) || null;
  const items = currentGroup?.items || [];
  const current = items[currentIndex] || null;

  const groupTitle = useMemo(() => currentGroup?.title || "", [currentGroup]);

  useEffect(() => {
    console.log("[DEBUG] scoreModalOpen =", scoreModalOpen, "modalStars =", modalStars);
  }, [scoreModalOpen, modalStars]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw);

      if (saved?.starsByLevel && typeof saved.starsByLevel === "object") {
        setStarsByLevel(saved.starsByLevel);
      }

      if (typeof saved?.completedCount === "number") {
        setCompletedCount(saved.completedCount);
      }

      if (typeof saved?.brushColor === "string") {
        setBrushColor(saved.brushColor);
      }

      if (typeof saved?.gridType === "string") {
        setGridType(saved.gridType);
      }
    } catch (error) {
      console.warn("讀取本機進度失敗：", error);
    }
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

  const getGroupById = (gid) => groups.find((group) => group.id === gid);

  const getGroupProgress = (group) => {
    const total = group?.items?.length ?? 0;

    if (!total) {
      return { done: 0, total: 0, percent: 0 };
    }

    const done = group.items.filter(
      (level) => (starsByLevel[level.id] ?? 0) >= 1
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
    if (!group?.unlock || group.unlock.type === "none") {
      return true;
    }

    if (group.unlock.type === "requireGroupsAllOneStar") {
      return (group.unlock.groups || []).every((gid) => {
        const requiredGroup = getGroupById(gid);

        return requiredGroup
          ? requiredGroup.items.every(
              (level) => (starsByLevel[level.id] ?? 0) >= 1
            )
          : false;
      });
    }

    return true;
  };

  const getGroupLockReason = (group) => {
    if (!group?.unlock || group.unlock.type === "none") {
      return "";
    }

    return "需先完成 Uppercase + Lowercase 全部關卡（每關至少 1⭐）";
  };

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
    setView("groups");
  };

  const toGroup = (id) => {
    const group = groups.find((item) => item.id === id);

    if (!group || !isGroupUnlocked(group)) {
      return;
    }

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

  const goToMap = () => {
    setView("map");
  };

  const pickLevelFromMap = (index) => {
    setCurrentIndex(index);
    setLastStars(starsByLevel[items[index].id] ?? 0);
    setView("practice");
    setClearSignal((signal) => signal + 1);
  };

  const isLevelUnlocked = (index) => {
    if (index === 0) {
      return true;
    }

    const previousLevel = items[index - 1];

    return (starsByLevel[previousLevel.id] ?? 0) >= 1;
  };

  const goPrev = () => {
    if (!items.length) return;

    const nextIndex = (currentIndex - 1 + items.length) % items.length;

    if (!isLevelUnlocked(nextIndex)) {
      setMessage("上一關尚未解鎖。");
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(starsByLevel[items[nextIndex].id] ?? 0);
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
    setLastStars(starsByLevel[items[nextIndex].id] ?? 0);
    setClearSignal((signal) => signal + 1);
  };

  const clearCanvas = () => {
    setClearSignal((signal) => signal + 1);
    setMessage("已清除，請重新描寫！");
  };

  const scoreToStars = (score) => {
    if (score >= 60) return 3;
    if (score >= 46) return 2;
    if (score >= 41) return 1;
    return 0;
  };

  const starText = (stars) => {
    return "⭐".repeat(stars) + "☆".repeat(3 - stars);
  };

  const encourage = () => {
    try {
      console.log("[DEBUG] encourage() called", {
        char: current?.char,
        levelId: current?.id,
        currentIndex,
      });

      const result = canvasApiRef.current?.evaluateTracing?.();

      console.log("[DEBUG] evaluateTracing result =", result);

      /*
       * 即使評測失敗，也要顯示 0 星視窗。
       * 這樣使用者按下「我寫好了」後必定能看到回應。
       */
      if (!result || typeof result.score !== "number") {
        setLastStars(0);
        setModalStars(0);
        setMessage("目前無法取得評測結果，請清除後再寫一次。");
        setScoreModalOpen(true);
        return;
      }

      const stars = scoreToStars(result.score);
      const previousBestStars = starsByLevel[current.id] ?? 0;

      setLastStars(stars);
      setModalStars(stars);
      setScoreModalOpen(true);

      setStarsByLevel((previous) => ({
        ...previous,
        [current.id]: Math.max(previous[current.id] ?? 0, stars),
      }));

      /*
       * 只有第一次讓該關卡從未通關變成通關時，才增加完成次數，
       * 避免重複按評測導致統計數字一直加。
       */
      if (stars >= 1 && previousBestStars < 1) {
        setCompletedCount((count) => count + 1);
      }

      if (stars >= 1) {
        setMessage(
          `太棒了！本次分數 ${result.score} 分，獲得 ${stars} 顆星！`
        );
      } else {
        setMessage(
          `本次分數 ${result.score} 分，再沿著灰字描寫一次試試看！`
        );
      }
    } catch (error) {
      console.error("[ERROR] encourage failed:", error);

      setLastStars(0);
      setModalStars(0);
      setMessage("評測時發生問題，請再寫一次。");
      setScoreModalOpen(true);
    }
  };

  const resetProgress = () => {
    if (!window.confirm("確定要清除所有星星與解鎖進度嗎？")) {
      return;
    }

    setStarsByLevel({});
    setCompletedCount(0);
    setLastStars(0);
    localStorage.removeItem(STORAGE_KEY);
  };

  const unlockAllLevels = () => {
    if (!window.confirm("確定要解鎖所有關卡嗎？")) {
      return;
    }

    const allLevelIds = Object.values(curriculum)
      .flatMap((language) => language.groups)
      .flatMap((group) => group.items)
      .map((level) => level.id);

    setStarsByLevel((previous) => {
      const next = { ...previous };

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
            <button className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!current) {
    return null;
  }

  return (
    <main className="app">
      <section className="stats-card">
        <strong>關卡：</strong>
        {currentIndex + 1}/{items.length}
        {" ｜ "}
        本次：<strong>{starText(lastStars)}</strong>
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
          <LetterCard
            title={groupTitle}
            char={current.char}
            hint={current.hint}
            index={currentIndex}
            total={items.length}
          />

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
          <button className="secondary" onClick={openSettings}>
            ⚙️ 設定
          </button>
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