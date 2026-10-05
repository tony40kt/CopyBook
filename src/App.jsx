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
import HomeBanner from "./components/HomeBanner";
import { getToleranceOption, scoreToStars } from "./lib/evaluation/profiles";
import { showRewardedAd } from "./services/admob";
import {
  hasPurchasedProduct,
  isColorUnlocked,
  isLevelAdUnlocked,
  unlockColor,
  unlockLevelByAd,
} from "./services/entitlements";
import {
  PRODUCT_IDS,
  purchaseProduct,
  restorePurchases,
} from "./services/billing";
import "./styles.css";
import { getEntitlements } from "./services/entitlements";

const STORAGE_KEY = "copybook_v43_progress";
const LEGACY_STORAGE_KEY = "copybook_v42_progress";
const SETTINGS_VERSION = 2;
const BRUSH_SIZE = 15;

function loadSavedProgress() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);

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

/*
 * 僅用於首頁、課程頁、關卡地圖頁。
 * 不會在練字／塗鴉畫布頁顯示 Banner，
 * 避免廣告遮住畫布或干擾書寫。
 */
function HomePageWithBanner({ children }) {
  return (
    <div className="home-page-shell">
      <main className="app">{children}</main>
      <HomeBanner />
    </div>
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

  const [brushColor, setBrushColor] = useState(
    savedProgress.brushColor || "#111111"
  );

  const [gridType, setGridType] = useState(
    savedProgress.gridType || "tian"
  );

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

  const [message, setMessage] = useState(
    "準備好了就開始練習吧！"
  );

  const [completedCount, setCompletedCount] = useState(
    savedProgress.completedCount || 0
  );

  const [lastStars, setLastStars] = useState(0);

  const [starsByLevel, setStarsByLevel] = useState(
    normalizeStoredStars(savedProgress.starsByLevel || {})
  );

  /*
   * 此 state 不需要讀取值；其目的只是當廣告解鎖、
   * 購買成功或恢復購買後，強制 React 重新渲染 UI。
   */
  const [, setEntitlementsVersion] = useState(0);

  const lang = languageKey ? curriculum[languageKey] : null;
  const groups = lang?.groups || [];

  const currentGroup =
    groups.find((group) => group.id === groupId) || null;

  const items = currentGroup?.items || [];
  const current = items[currentIndex] || null;

  const getLevelMode = (level) =>
    !level || level.supportedModes?.includes(defaultPracticeMode)
      ? defaultPracticeMode
      : level.mode;

  const getLevelProgressKey = (
    level,
    mode = getLevelMode(level)
  ) => (level ? `${level.id}::${mode}` : "");

  const getLevelBestStars = (level) =>
    Math.max(
      ...(
        level?.supportedModes || [
          level?.mode || "writing",
        ]
      ).map(
        (mode) =>
          starsByLevel[
            getLevelProgressKey(level, mode)
          ] ?? 0
      )
    );

  const currentMode = getLevelMode(current);
  const groupTitle = currentGroup?.title || "";
  const toleranceLabel =
    getToleranceOption(toleranceLevel).label;

  /*
   * 儲存原本的練習進度與設定。
   * 廣告／付費解鎖權益會由 entitlements.js 另外保存。
   */
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
  }, [
    starsByLevel,
    completedCount,
    brushColor,
    gridType,
    defaultPracticeMode,
    toleranceLevel,
  ]);

  /*
   * 當 entitlements.js 寫入新權益時，重新渲染畫面。
   */
  useEffect(() => {
    const refreshEntitlements = () => {
      setEntitlementsVersion((version) => version + 1);
    };

    window.addEventListener(
      "copybook-entitlements-changed",
      refreshEntitlements
    );

    return () => {
      window.removeEventListener(
        "copybook-entitlements-changed",
        refreshEntitlements
      );
    };
  }, []);

  const getGroupById = (gid) =>
    groups.find((group) => group.id === gid);

  const getGroupProgress = (group) => {
    const total = group?.items?.length ?? 0;

    if (!total) {
      return {
        done: 0,
        total: 0,
        percent: 0,
      };
    }

    const done = group.items.filter(
      (level) => getLevelBestStars(level) >= 1
    ).length;

    return {
      done,
      total,
      percent: Math.round((done / total) * 100),
    };
  };

  const getUnlockRequirementsProgress = (group) => {
    if (
      !group?.unlock ||
      group.unlock.type !== "requireGroupsAllOneStar"
    ) {
      return [];
    }

    return (group.unlock.groups || [])
      .map((gid) => {
        const requiredGroup = getGroupById(gid);

        if (!requiredGroup) {
          return null;
        }

        return {
          id: requiredGroup.id,
          title: requiredGroup.title,
          ...getGroupProgress(requiredGroup),
        };
      })
      .filter(Boolean);
  };

  /*
   * 原本課程解鎖規則：
   * - 沒有限制：直接解鎖
   * - requireGroupsAllOneStar：指定課程所有關卡至少一星
   *
   * 付費規則：
   * - copybook_premium_all：全部課程解鎖
   * - copybook_course_<group.id>：單一課程解鎖
   */
  const isGroupUnlocked = (group) => {
    if (!group) {
      return false;
    }

    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) {
      return true;
    }

    if (
      hasPurchasedProduct(`copybook_course_${group.id}`)
    ) {
      return true;
    }

    if (!group.unlock || group.unlock.type === "none") {
      return true;
    }

    if (group.unlock.type === "requireGroupsAllOneStar") {
      return (group.unlock.groups || []).every((gid) => {
        const requiredGroup = getGroupById(gid);

        return requiredGroup
          ? requiredGroup.items.every(
              (level) => getLevelBestStars(level) >= 1
            )
          : false;
      });
    }

    // 🌟【全新修正：中文各滿 20 關解鎖邏輯】
    if (group.unlock.type === "requireZhLayersTwentyStars") {
      // 安全防護罩：確保存檔必定存在，如果新開機沒有存檔，就當作空物件 {}
      const safeStars = starsByLevel || {};

      // 🔍 物理計數法：直接去硬碟存檔裡，數一數這三個中文基礎大關各自有幾關拿到了星星（>=1星）
      const bCount = Object.keys(safeStars).filter(k => k.startsWith("zh-b") && safeStars[k] >= 1).length;
      const iCount = Object.keys(safeStars).filter(k => k.startsWith("zh-i") && safeStars[k] >= 1).length;

      // 🔒 嚴格反向檢查：只要初級不滿 20 關、或中級不滿 20 關、或高級不滿 20 關
      // 任何一區沒有達標，立刻關閉大門（回傳 false 鎖定關卡）
      if (bCount < 20 || iCount < 20) {
        return false;
      }
      
      // 三區都順利各滿 20 關以上，放行解鎖！
      return true;
    }

    return true;
  };


  const getGroupLockReason = (group) => {
    if (!group) {
      return "";
    }

    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) {
      return "";
    }

    if (
      hasPurchasedProduct(`copybook_course_${group.id}`)
    ) {
      return "";
    }

    return group.unlock?.description || "";
  };

  /*
   * 原本關卡規則：
   * - 第一關免費
   * - 下一關需要前一關至少取得一顆星
   *
   * 額外解鎖規則：
   * - 全部內容付費解鎖
   * - 該課程付費解鎖
   * - 看廣告解鎖單一關卡
   */
  const isLevelUnlocked = (index) => {
    const level = items[index];

    if (!level) {
      return false;
    }

    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) {
      return true;
    }

    if (
      currentGroup &&
      hasPurchasedProduct(
        `copybook_course_${currentGroup.id}`
      )
    ) {
      return true;
    }

    if (isLevelAdUnlocked(level.id)) {
      return true;
    }

    if (index === 0) {
      return true;
    }

    const previousLevel = items[index - 1];

    return getLevelBestStars(previousLevel) >= 1;
  };

  const canAccessLevelAtIndex = (index) =>
    isLevelUnlocked(index);

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

    if (!group || !isGroupUnlocked(group)) {
      return;
    }

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

  /*
   * 看一次 Rewarded Ad 後永久解鎖特定顏色。
   */
  const requestUnlockColor = async (color) => {
    if (isColorUnlocked(color)) {
      setBrushColor(color);
      return;
    }

    const confirmed = window.confirm(
      "觀看一次完整獎勵廣告後，可以永久解鎖此顏色。\n\n要繼續嗎？"
    );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("正在載入廣告，請稍候……");

      const result = await showRewardedAd();

      if (!result?.rewarded) {
        setMessage("需要完整觀看廣告才能解鎖顏色。");
        return;
      }

      unlockColor(color);
      setBrushColor(color);
      setEntitlementsVersion((version) => version + 1);
      setMessage("顏色已永久解鎖！");
    } catch (error) {
      console.error("解鎖顏色失敗：", error);
      setMessage("廣告目前無法載入，請稍後再試。");
    }
  };

  /*
   * 選取關卡：
   * - 已依星星、廣告或付費方式解鎖：直接進入。
   * - 尚未解鎖：讓使用者主動選擇是否觀看 Rewarded Ad。
   */
  const pickLevelFromMap = async (index) => {
    const selectedLevel = items[index];

    if (!selectedLevel) {
      return;
    }

    if (!isLevelUnlocked(index)) {
      const confirmed = window.confirm(
        "這一關尚未解鎖。\n\n觀看一次完整獎勵廣告即可永久解鎖此關。\n\n要繼續嗎？"
      );

      if (!confirmed) {
        return;
      }

      try {
        setMessage("正在載入廣告，請稍候……");

        const result = await showRewardedAd();

        if (!result?.rewarded) {
          setMessage("需要完整觀看廣告才能解鎖此關。");
          return;
        }

        unlockLevelByAd(selectedLevel.id);
        setEntitlementsVersion((version) => version + 1);
        setMessage("關卡已永久解鎖！");
      } catch (error) {
        console.error("解鎖關卡失敗：", error);
        setMessage("廣告目前無法載入，請稍後再試。");
        return;
      }
    }

    setCurrentIndex(index);
    setLastStars(getLevelBestStars(selectedLevel));
    setView("practice");
    setMessage("沿著提示開始練習，完成後按下「我完成了」。");
    setClearSignal((signal) => signal + 1);
  };

  const goPrev = () => {
    if (!items.length) {
      return;
    }

    const nextIndex =
      (currentIndex - 1 + items.length) % items.length;

    if (!canAccessLevelAtIndex(nextIndex)) {
      setMessage("上一關尚未解鎖。");
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(getLevelBestStars(items[nextIndex]));
    setClearSignal((signal) => signal + 1);
  };

  const goNext = () => {
    if (!items.length) {
      return;
    }

    const nextIndex = (currentIndex + 1) % items.length;

    if (!canAccessLevelAtIndex(nextIndex)) {
      setMessage(
        "下一關尚未解鎖。請先完成目前關卡取得至少 1 顆星，或回到地圖觀看廣告解鎖。"
      );
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(getLevelBestStars(items[nextIndex]));
    setClearSignal((signal) => signal + 1);
  };

  const clearCanvas = () => {
    setClearSignal((signal) => signal + 1);
    setMessage("已清除，請重新練習！");
  };

  /*
   * 購買全顏色、單一課程或全部內容。
   */
  const requestPurchase = async (productId) => {
  try {
    setMessage("正在開啟 Google Play 購買視窗……");

    const result = await purchaseProduct(productId);

    console.log("[IAP] purchase success", {
      requested: productId,
      granted: result?.productIds,
      raw: result?.raw,
    });

    window.alert(
      `購買成功\nrequested=${productId}\ngranted=${(result?.productIds || []).join(",")}`
    );

    setEntitlementsVersion((version) => version + 1);

    if (productId === PRODUCT_IDS.ALL_COLORS) {
      setMessage("購買成功，全部筆色已永久解鎖！");
    } else if (productId === PRODUCT_IDS.PREMIUM_ALL) {
      setMessage("購買成功，全部課程與關卡已永久解鎖！");
    } else if (productId.startsWith("copybook_course_")) {
      setMessage("購買成功，本課程全部關卡已永久解鎖！");
    } else {
      setMessage("購買成功，內容已解鎖！");
    }
  } catch (error) {
    console.error("購買失敗：", error);

    const errorText = String(error?.message || error || "").toLowerCase();

    if (errorText.includes("cancel") || errorText.includes("取消")) {
      setMessage("你已取消購買。");
      return;
    }

    setMessage(error?.message || "購買失敗，請稍後再試。");
  }
};

  const handleRestorePurchases = async () => {
  try {
    setMessage("正在恢復購買……");

    const result = await restorePurchases();

    console.log("[IAP] restore success", result);
    window.alert(`恢復完成\nrestored=${(result?.restored || []).join(",")}`);

    setEntitlementsVersion((version) => version + 1);
    setMessage("已完成恢復購買。");
  } catch (error) {
    console.error("恢復購買失敗：", error);
    setMessage("恢復購買失敗，請稍後再試。");
  }
};

  const encourage = () => {
    try {
      const result =
        canvasApiRef.current?.evaluateTracing?.();

      if (!result || typeof result.score !== "number") {
        setLastStars(0);
        setModalStars(0);
        setMessage(
          "目前無法取得評測結果，請清除後再試一次。"
        );
        setLastResult(null);
        setScoreModalOpen(true);
        return;
      }

      const stars = scoreToStars(
        result.score,
        result.starThresholds
      );

      const progressKey = getLevelProgressKey(
        current,
        currentMode
      );

      const previousBestStars =
        getLevelBestStars(current);

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
        [progressKey]: Math.max(
          previous[progressKey] ?? 0,
          stars
        ),
      }));

      if (stars >= 1 && previousBestStars < 1) {
        setCompletedCount((count) => count + 1);
      }

      if (result.passed) {
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
    const confirmed = window.confirm(
      "確定要清除所有星星與練習進度嗎？\n\n注意：這不會移除已看廣告解鎖或已購買的內容。"
    );

    if (!confirmed) {
      return;
    }

    setStarsByLevel({});
    setCompletedCount(0);
    setLastStars(0);
    setLastResult(null);
    setScoreModalOpen(false);

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    setMessage("練習進度已清除。");
  };

  /*
   * 這是原本的開發／測試功能。
   * 正式上架前建議移除「解鎖所有關卡」按鈕，
   * 或僅在 development 環境顯示。
   */
  const unlockAllLevels = () => {
    const confirmed = window.confirm(
      "確定要解鎖所有關卡嗎？此功能建議僅用於測試。"
    );

    if (!confirmed) {
      return;
    }

    const allLevels = Object.values(curriculum)
      .flatMap((language) => language.groups)
      .flatMap((group) => group.items);

    setStarsByLevel((previous) => {
      const next = { ...previous };

      allLevels.forEach((level) => {
        (
          level.supportedModes || [
            level.mode || "writing",
          ]
        ).forEach((mode) => {
          next[`${level.id}::${mode}`] = Math.max(
            next[`${level.id}::${mode}`] ?? 0,
            1
          );
        });
      });

      return next;
    });

    setMessage("測試用：已解鎖所有關卡。");
  };

  /*
   * 設定頁
   */
  if (view === "settings") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>⚙️ 設定</h1>
          <p>
            調整筆色、格線、評分寬容度與預設練習模式
          </p>
        </header>

        <SettingsPanel
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onRequestUnlockColor={requestUnlockColor}
          onPurchaseAllColors={() =>
            requestPurchase(PRODUCT_IDS.ALL_COLORS)
          }
          onRestorePurchases={handleRestorePurchases}
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

  /*
   * 主頁：顯示 Banner。
   */
  if (view === "language") {
    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🖍️ CopyLand 練字樂園</h1>
          <p>
            先選語言，再開始闖關練字或主題塗鴉！
          </p>
        </header>

        <LanguageSelector onSelect={toLanguage} />

        <section
          className="controls"
          style={{ marginTop: 12 }}
        >
          <div className="controls-row">
            <button
              type="button"
              className="secondary"
              onClick={openSettings}
            >
              ⚙️ 設定
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  /*
   * 課程選擇頁：顯示 Banner。
   * 課程本身不提供看廣告解鎖，
   * 僅提供付費解鎖單一課程或全部內容。
   */
  if (view === "groups") {
    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🖍️ CopyLand 練字樂園</h1>
          <p>請選擇課程分類</p>
        </header>

        <GroupSelector
          languageLabel={lang?.label || ""}
          groups={groups}
          isGroupUnlocked={isGroupUnlocked}
          getGroupLockReason={getGroupLockReason}
          getUnlockRequirementsProgress={
            getUnlockRequirementsProgress
          }
          onBack={backToHome}
          onPickGroup={toGroup}
          onRequestPurchase={requestPurchase}
        />

        <section
          className="controls"
          style={{ marginTop: 12 }}
        >
          <div className="controls-row">
            <button
              type="button"
              className="secondary"
              onClick={openSettings}
            >
              ⚙️ 設定
            </button>

            <button
              type="button"
              className="accent"
              onClick={() =>
                requestPurchase(PRODUCT_IDS.PREMIUM_ALL)
              }
            >
              ⭐ 解鎖全部內容
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  /*
   * 關卡地圖：顯示 Banner。
   * 未解鎖關卡可由 LevelMap 點擊，再由 pickLevelFromMap
   * 主動播放 Rewarded Ad 解鎖。
   */
  if (view === "map") {
    const unlockedCount = items.filter((_, index) =>
      isLevelUnlocked(index)
    ).length;

    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🗺️ 關卡地圖</h1>
          <p>完成前一關至少 1⭐ 才能解鎖下一關</p>
        </header>

        <section className="stats-card">
          <strong>解鎖進度：</strong>
          <span>{unlockedCount}</span>
          {" / "}
          {items.length}
          {" ｜ "}
          <strong>已完成：</strong>
          {completedCount}
        </section>

        <LevelMap
          groupId={groupId}
          groupTitle={groupTitle}
          items={items}
          currentIndex={currentIndex}
          starsByLevel={starsByLevel}
          defaultPracticeMode={defaultPracticeMode}
          onSelectLevel={pickLevelFromMap}
          onBackToGroups={backToGroups}
        />

        <section
          className="controls"
          style={{ marginTop: 12 }}
        >
          <div className="controls-row">
            <button
              type="button"
              className="secondary"
              onClick={openSettings}
            >
              ⚙️ 設定
            </button>

            <button
              type="button"
              className="accent"
              onClick={() =>
                requestPurchase(
                  `copybook_course_${groupId}`
                )
              }
            >
              💳 解鎖本課程
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  /*
   * 練字／塗鴉頁面。
   * 此頁故意不顯示 Banner，避免影響畫布操作。
   */
  if (!current) {
    return null;
  }

  return (
    <main className="app">
      <section className="stats-card">
        <strong>關卡：</strong>
        {currentIndex + 1}/{items.length}
        {" ｜ "}
        本次：
        <strong>
          {lastStars
            ? "⭐".repeat(lastStars) +
              "☆".repeat(3 - lastStars)
            : "☆☆☆"}
        </strong>
        {" ｜ "}
        模式：
        <strong>
          {currentMode === "doodle" ? "塗鴉" : "寫字"}
        </strong>
        {" ｜ "}
        寬容度：
        <strong>{toleranceLabel}</strong>
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
            toleranceLabel={toleranceLabel}
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

      <section
        className="controls"
        style={{ marginTop: 10 }}
      >
        <div className="controls-row">
          <button
            type="button"
            className="secondary"
            onClick={openSettings}
          >
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

<details style={{ marginTop: 12 }}>
  <summary>🧪 Debug Entitlements</summary>
  <pre style={{ whiteSpace: "pre-wrap" }}>
    {JSON.stringify(getEntitlements(), null, 2)}
  </pre>
</details>