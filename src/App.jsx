import { useEffect, useRef, useState } from "react";
import { App as CapApp } from "@capacitor/app";

// 匯入核心課程、子元件與樣式表
import { curriculum } from "./data/curriculum";
import LanguageSelector from "./components/LanguageSelector";
import GroupSelector from "./components/GroupSelector";
import LevelMap from "./components/LevelMap";
import DailyChallengeMap from "./components/DailyChallengeMap";
import LetterCard from "./components/LetterCard";
import WritingCanvas from "./components/WritingCanvas";
import Controls from "./components/Controls";
import SettingsPanel from "./components/SettingsPanel";
import StarsModal from "./components/StarsModal";
import HomeBanner from "./components/HomeBanner";

// 匯入評估、權限與廣告服務邏輯
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
import { redeemCode } from "./services/redeemCode";

// 匯入文字轉語音（TTS）功能模組。
import {
  isTtsAvailable,
  speakText,
  getSavedTtsRate,
  setSavedTtsRate,
  getSavedTtsVolume,
  setSavedTtsVolume,
  getSavedZhVoice,
  setSavedZhVoice,
} from "./services/tts";

// 匯入音效與背景音樂管理模組
import {
  getSavedBgmEnabled,
  setSavedBgmEnabled,
  getSavedVolume,
  setSavedVolume,
  playBgm,
  pauseBgm,
  getCurrentBgmVolume,
  setBgmVolumeImmediate,
} from "./services/audioManager";
import { openTtsSettings } from "./services/systemSettings";

// 核心整合：匯入每日挑戰題目與計畫日期資料。
import { getChallengeForDate, getPlanBounds, initChallengePool } from "./data/dailyChallengePlan";
import { getDailyState, setDailyAdUnlocked, markDailyDone } from "./services/dailyChallengeState";

import "./styles.css";

// 常數設定：儲存進度金鑰與預設參數
const STORAGE_KEY = "copybook_v43_progress";
const LEGACY_STORAGE_KEY = "copybook_v42_progress";
const SETTINGS_VERSION = 2;
const BRUSH_SIZE = 15;

/**
 * 安全載入本機已儲存的學習進度
 * @returns {Object} 解析後的進度紀錄物件
 */
function loadSavedProgress() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn("[CopyBook] 讀取本機進度失敗：", error);
    return {};
  }
}

/**
 * 標準化舊版關卡星星資料格式
 * @param {Object} storedStars - 本機讀出的舊版星星資料
 * @returns {Object} 標準化後的關卡索引物件
 */
function normalizeStoredStars(storedStars = {}) {
  return Object.fromEntries(
    Object.entries(storedStars).map(([key, value]) => [
      key.includes("::") ? key : `${key}::writing`,
      value,
    ])
  );
}

/**
 * 首頁橫幅廣告外殼元件
 * @param {{children: import("react").ReactNode}} props 外殼元件屬性與內嵌主內容。
 */
function HomePageWithBanner({ children }) {
  return (
    <div className="home-page-shell">
      <main className="app">{children}</main>
      <HomeBanner />
    </div>
  );
}

/**
 * 取得裝置所在地的今日日期，格式為 YYYY-MM-DD，供每日挑戰比較使用。
 * @returns {string} 以當地年月日組成的日期字串。
 */
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * CopyBook 主應用程式：管理課程、每日挑戰、練習、進度與設定畫面。
 * 學習進度只在首次掛載時載入，避免每次狀態更新都重複讀取及解析 localStorage。
 * @returns {JSX.Element|null} 目前應顯示的應用程式畫面。
 */
export default function App() {
  const canvasApiRef = useRef(null);
  const [savedProgress] = useState(loadSavedProgress);

  // 首次掛載時載入每日挑戰題庫；初始化函式會自行處理失敗並提供後備題目。
  useEffect(() => {
    initChallengePool("/challenges.csv");
  }, []);

  // 背景音樂與文字轉語音設定。
  const [bgmEnabled, setBgmEnabled] = useState(getSavedBgmEnabled());
  const [bgmVolume, setBgmVolume] = useState(getSavedVolume());

  const [ttsRate, setTtsRate] = useState(getSavedTtsRate());
  const [ttsVolume, setTtsVolume] = useState(getSavedTtsVolume());
  const [zhVoice, setZhVoice] = useState(getSavedZhVoice());
  const [showTtsFixButton, setShowTtsFixButton] = useState(false);

  // 畫面導覽狀態。
  const [view, setView] = useState("language");
  const [prevView, setPrevView] = useState("language");

  // 課程、分類與目前關卡狀態。
  const [languageKey, setLanguageKey] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 練習外觀與評分設定。
  const [brushColor, setBrushColor] = useState(savedProgress.brushColor || "#111111");
  const [gridType, setGridType] = useState(savedProgress.gridType || "tian");
  // 目前產品僅支援寫字模式；保留此欄位供既有進度格式及地圖元件使用。
  const defaultPracticeMode = "writing";
  const [toleranceLevel, setToleranceLevel] = useState(
    savedProgress.toleranceLevel || "standard"
  );

  // 每日挑戰地圖與目前挑戰日期。
  const [dailyYear, setDailyYear] = useState(2026);
  const [dailyMonth, setDailyMonth] = useState(10);
  const [activeDailyDate, setActiveDailyDate] = useState(null);

  // 練習執行期間的畫布、結果視窗及顯示訊息狀態。
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

  // 權限由外部服務更新時遞增版本，以觸發畫面重新讀取權限。
  const [, setEntitlementsVersion] = useState(0);

  const lang = languageKey ? curriculum[languageKey] : null;
  const groups = lang?.groups || [];
  const currentGroup = groups.find((group) => group.id === groupId) || null;
  const items = currentGroup?.items || [];
  const current = items[currentIndex] || null;

  const currentDailyChallenge = activeDailyDate
    ? getChallengeForDate(activeDailyDate)
    : null;

  /**
   * 建立關卡與練習模式組合成的進度索引鍵。
   * @param {Object|null} level 關卡資料；缺少關卡時回傳空字串。
   * @param {string} mode 練習模式，預設為目前唯一支援的寫字模式。
   * @returns {string} 星星進度索引鍵。
   */
  const getLevelProgressKey = (level, mode = "writing") =>
    level ? `${level.id}::${mode}` : "";

  /**
   * 取得指定關卡各支援模式中的最高星等。
   * @param {Object|null} level 要查詢的關卡。
   * @returns {number} 該關卡目前的最高星等；沒有紀錄時為 0。
   */
  const getLevelBestStars = (level) =>
    Math.max(
      ...((level?.supportedModes || [level?.mode || "writing"]).map(
        (mode) => starsByLevel[getLevelProgressKey(level, mode)] ?? 0
      ))
    );

  const currentMode = "writing";
  const groupTitle = currentGroup?.title || "";
  const toleranceLabel = getToleranceOption(toleranceLevel).label;

  // 每日挑戰日期與地圖輔助邏輯。
  const todayStr = getTodayStr();

  /**
   * 判斷每日挑戰日期格的狀態，優先處理未來與今日，再讀取過往解鎖紀錄。
   * @param {string} dateStr YYYY-MM-DD 格式的日期。
   * @returns {"future"|"today"|"past_done"|"past_unlocked"|"past_locked"} 日期狀態。
   */
  const getDailyCellStatus = (dateStr) => {
    // 日期採固定 YYYY-MM-DD 格式，因此可直接以字串比較年月日先後。
    if (dateStr > todayStr) return "future";
    if (dateStr === todayStr) return "today";

    // 僅過去日期需要讀取本機完成及廣告解鎖紀錄。
    const s = getDailyState(dateStr);
    if (s.done) return "past_done";
    if (s.adUnlocked) return "past_unlocked";
    return "past_locked";
  };

  /**
   * 開啟每日挑戰地圖，並將顯示月份限制在計畫涵蓋期間內。
   */
  const openDailyMap = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    if (y < 2026 || (y === 2026 && m < 10)) {
      setDailyYear(2026);
      setDailyMonth(10);
    } else if (y > 2027 || (y === 2027 && m > 9)) {
      setDailyYear(2027);
      setDailyMonth(9);
    } else {
      setDailyYear(y);
      setDailyMonth(m);
    }

    setView("daily-map");
  };

  /**
   * 依指定月數切換每日挑戰地圖月份，超出計畫範圍時不更新畫面。
   * @param {number} delta 要移動的月份數，通常為 -1 或 1。
   */
  const shiftMonth = (delta) => {
    let y = dailyYear;
    let m = dailyMonth + delta;

    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }

    const { startDate, endDate } = getPlanBounds();
    const nextYm = `${y}-${String(m).padStart(2, "0")}`;
    const minYm = startDate.slice(0, 7);
    const maxYm = endDate.slice(0, 7);
    // 每日挑戰僅在計畫起訖月份內提供題目。
    if (nextYm < minYm || nextYm > maxYm) return;

    setDailyYear(y);
    setDailyMonth(m);
  };

  /**
   * 進入指定日期的每日練習；過期且未解鎖的題目需先完整觀看獎勵廣告。
   * @param {string} dateStr 欲挑戰的 YYYY-MM-DD 日期。
   */
  const enterDailyByDate = async (dateStr) => {
    const status = getDailyCellStatus(dateStr);

    // 未來題目不可進入，過期未解鎖題目則須完成獎勵廣告流程。
    if (status === "future") {
      setMessage("未來題目不可提前解鎖。");
      return;
    }

    if (status === "past_locked") {
      const ok = window.confirm(
        "這天已過期且你未挑戰過。\n觀看一次完整獎勵廣告可解鎖該日題目。\n\n要繼續嗎？"
      );
      if (!ok) return;

      try {
        setMessage("正在載入廣告，請稍候……");
        const ad = await showRewardedAd();

        if (!ad?.rewarded) {
          setMessage("需要完整觀看廣告才能解鎖。");
          return;
        }

        setDailyAdUnlocked(dateStr, true);
        setMessage(`${dateStr} 已補解鎖，開始挑戰！`);
      } catch (e) {
        console.error("每日挑戰解鎖失敗：", e);
        setMessage("廣告載入失敗，請稍後再試。");
        return;
      }
    }

    setActiveDailyDate(dateStr);
    setCurrentIndex(0);
    setLastStars(0);
    setView("daily-practice");
    setClearSignal((s) => s + 1);
  };

  // Android 返回鍵依畫面層級逐步返回；位於首頁時結束原生應用程式。
  useEffect(() => {
    const handler = CapApp.addListener("backButton", () => {
      if (view === "settings") {
        setView(prevView || "language");
        return;
      }
      if (view === "daily-practice") {
        setView("daily-map");
        return;
      }
      if (view === "daily-map") {
        setView("language");
        return;
      }
      if (view === "practice") {
        setView("map");
        return;
      }
      if (view === "map") {
        setView("groups");
        return;
      }
      if (view === "groups") {
        setView("language");
        return;
      }
      CapApp.exitApp();
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, [view, prevView]);

  // 將可持續的練習進度及設定同步寫入本機儲存空間。
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
    toleranceLevel,
  ]);

  useEffect(() => {
  const all = Object.values(curriculum)
    .flatMap((l) => l.groups || [])
    .map((g) => g.id);
  console.log("[DEBUG] all group ids =", all);
}, []);

  useEffect(() => {
    setSavedTtsRate(ttsRate);
  }, [ttsRate]);

  useEffect(() => {
    setSavedTtsVolume(ttsVolume);
  }, [ttsVolume]);

  useEffect(() => {
    setSavedZhVoice(zhVoice);
  }, [zhVoice]);

  useEffect(() => {
    const refreshEntitlements = () => setEntitlementsVersion((v) => v + 1);
    window.addEventListener("copybook-entitlements-changed", refreshEntitlements);
    return () =>
      window.removeEventListener("copybook-entitlements-changed", refreshEntitlements);
  }, []);

  useEffect(() => {
    setSavedBgmEnabled(bgmEnabled);
    if (bgmEnabled) playBgm();
    else pauseBgm();
  }, [bgmEnabled]);

  useEffect(() => {
    setSavedVolume(bgmVolume);
  }, [bgmVolume]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pauseBgm();
      else if (bgmEnabled) playBgm();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [bgmEnabled]);

  // 課程與關卡解鎖條件及進度計算。
  /** 依 ID 從目前語言的課程清單尋找分類，找不到時回傳 undefined。 */
  const getGroupById = (gid) => groups.find((group) => group.id === gid);

  /**
   * 計算課程分類中已取得至少一顆星的關卡數與完成百分比。
   * @param {Object} group 課程分類資料。
   * @returns {{done:number,total:number,percent:number}} 完成數、總數及整數百分比。
   */
  const getGroupProgress = (group) => {
    const total = group?.items?.length ?? 0;
    if (!total) return { done: 0, total: 0, percent: 0 };
    const done = group.items.filter((level) => getLevelBestStars(level) >= 1).length;
    return { done, total, percent: Math.round((done / total) * 100) };
  };

  /**
   * 彙整解鎖指定分類所需前置分類的完成進度。
   * @param {Object} group 欲檢查解鎖條件的分類。
   * @returns {Array<Object>} 每個前置分類的標題及完成狀態。
   */
  const getUnlockRequirementsProgress = (group) => {
    if (!group?.unlock || group.unlock.type !== "requireGroupsAllOneStar") return [];
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

  /**
   * 判斷課程分類是否已因購買、無鎖定條件或完成前置任務而解鎖。
   * @param {Object|null} group 欲檢查的課程分類。
   * @returns {boolean} 分類是否可進入。
   */
  const isGroupUnlocked = (group) => {
    if (!group) return false;
    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) return true;
    if (hasPurchasedProduct(`copybook_course_${group.id}`)) return true;
    if (!group.unlock || group.unlock.type === "none") return true;

    // 此類條件要求列出的每個前置分類中，所有關卡都至少取得一顆星。
    if (group.unlock.type === "requireGroupsAllOneStar") {
      return (group.unlock.groups || []).every((gid) => {
        const requiredGroup = getGroupById(gid);
        return requiredGroup
          ? requiredGroup.items.every((level) => getLevelBestStars(level) >= 1)
          : false;
      });
    }

    // 注音分層條件分別統計 b、i 層已完成的關卡，兩層都須達到 20 關。
    if (group.unlock.type === "requireZhLayersTwentyStars") {
      const safeStars = starsByLevel || {};
      const bCount = Object.keys(safeStars).filter(
        (k) => k.startsWith("zh-b") && safeStars[k] >= 1
      ).length;
      const iCount = Object.keys(safeStars).filter(
        (k) => k.startsWith("zh-i") && safeStars[k] >= 1
      ).length;
      return bCount >= 20 && iCount >= 20;
    }

    return true;
  };

  /** 取得分類鎖定提示；已解鎖時回傳空字串。 */
  const getGroupLockReason = (group) => {
    if (!group) return "";
    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) return "";
    if (hasPurchasedProduct(`copybook_course_${group.id}`)) return "";
    return group.unlock?.description || "";
  };

  /**
   * 判斷目前分類中的指定索引關卡是否可進入。
   * @param {number} index 關卡在目前分類中的索引。
   * @returns {boolean} 關卡是否已解鎖。
   */
  const isLevelUnlocked = (index) => {
    const level = items[index];
    if (!level) return false;

    if (hasPurchasedProduct(PRODUCT_IDS.PREMIUM_ALL)) return true;
    if (currentGroup && hasPurchasedProduct(`copybook_course_${currentGroup.id}`)) {
      return true;
    }
    if (isLevelAdUnlocked(level.id)) return true;
    // 每個分類的第一關預設開放，其後關卡需完成前一關或個別解鎖。
    if (index === 0) return true;

    const previousLevel = items[index - 1];
    return getLevelBestStars(previousLevel) >= 1;
  };

  // 語言、分類、地圖及設定畫面之間的導覽操作。
  /** 記錄目前畫面後開啟設定，供返回操作恢復原畫面。 */
  const openSettings = () => {
    setPrevView(view);
    setView("settings");
  };

  /** 關閉設定並返回先前畫面；缺少紀錄時回到語言選擇頁。 */
  const closeSettings = () => {
    setView(prevView || "language");
  };

  /**
   * 選擇語言並重設課程導覽狀態。
   * @param {string} key curriculum 中的語言索引鍵。
   */
  const toLanguage = (key) => {
    setLanguageKey(key);
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage("請選擇一個課程開始練習。");
    setView("groups");
  };

  /**
   * 進入已解鎖的課程分類地圖；無效或未解鎖的分類不改變畫面。
   * @param {string} id 課程分類 ID。
   */
  const toGroup = (id) => {
    const group = groups.find((item) => item.id === id);
    if (!group || !isGroupUnlocked(group)) return;

    setGroupId(id);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage(`已進入「${group.title}」關卡地圖。`);
    setView("map");
  };

  /** 返回語言首頁並清除目前選取的語言、分類及關卡狀態。 */
  const backToHome = () => {
    setView("language");
    setLanguageKey(null);
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
    setMessage("準備好了就開始練習吧！");
  };

  /** 從地圖返回分類清單，並清除分類內的關卡索引。 */
  const backToGroups = () => {
    setView("groups");
    setGroupId(null);
    setCurrentIndex(0);
    setLastStars(0);
  };

  /** 從練習畫面返回目前分類的關卡地圖。 */
  const goToMap = () => {
    setView("map");
  };

  // 獎勵廣告、商店購買與解鎖碼操作。
  /**
   * 以獎勵廣告解鎖筆色；已解鎖的顏色直接套用，不重複播放廣告。
   * @param {string} color 欲使用或解鎖的 CSS 顏色值。
   */
  const requestUnlockColor = async (color) => {
    if (isColorUnlocked(color)) {
      setBrushColor(color);
      return;
    }

    const confirmed = window.confirm(
      "觀看一次完整獎勵廣告後，可以永久解鎖此顏色。\n\n要繼續嗎？"
    );
    if (!confirmed) return;

    try {
      setMessage("正在載入廣告，請稍候……");
      const result = await showRewardedAd();

      if (!result?.rewarded) {
        setMessage("需要完整觀看廣告才能解鎖顏色。");
        return;
      }

      unlockColor(color);
      setBrushColor(color);
      setEntitlementsVersion((v) => v + 1);
      setMessage("顏色已永久解鎖！");
    } catch (error) {
      console.error("解鎖顏色失敗：", error);
      setMessage("廣告目前無法載入，請稍後再試。");
    }
  };

  /**
   * 啟動指定商品的原生購買流程並更新使用者可用權限。
   * @param {string} productId 商店商品 ID。
   */
  const requestPurchase = async (productId) => {
    try {
      setMessage("正在開啟 Google Play 購買視窗……");
      const result = await purchaseProduct(productId);

      window.alert(
        `購買成功\nrequested=${productId}\ngranted=${(result?.productIds || []).join(",")}`
      );

      setEntitlementsVersion((v) => v + 1);

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

  /** 向商店還原既有購買項目，成功後刷新權限畫面。 */
  const handleRestorePurchases = async () => {
    try {
      setMessage("正在恢復購買……");
      const result = await restorePurchases();
      window.alert(`恢復完成\nrestored=${(result?.restored || []).join(",")}`);
      setEntitlementsVersion((v) => v + 1);
      setMessage("已完成恢復購買。");
    } catch (error) {
      console.error("恢復購買失敗：", error);
      setMessage("恢復購買失敗，請稍後再試。");
    }
  };

  /**
   * 驗證並兌換解鎖碼，依兌換結果顯示訊息並刷新權限。
   * @param {string} code 使用者輸入的解鎖碼。
   */
  const handleRedeemCode = (code) => {
    const result = redeemCode(code);

    if (!result.ok) {
      window.alert("解鎖碼無效");
      return;
    }

    if (result.type === "colors") {
      setMessage("已解鎖全部顏色！");
      window.alert("解鎖成功：全部顏色");
    } else if (result.type === "all") {
      setMessage("已解鎖全部課程與關卡！");
      window.alert("解鎖成功：全部課程與關卡");
    }

    setEntitlementsVersion((v) => v + 1);
  };

  // 關卡選取、筆跡操作、發音與評分流程。
  /**
   * 從地圖選取關卡；鎖定關卡須先看完獎勵廣告，通過後進入練習。
   * @param {number} index 目標關卡在目前分類中的索引。
   */
  const pickLevelFromMap = async (index) => {
    const selectedLevel = items[index];
    if (!selectedLevel) return;

    // 未解鎖的關卡只有在使用者確認並完整觀看獎勵廣告後才能進入。
    if (!isLevelUnlocked(index)) {
      const confirmed = window.confirm(
        "這一關尚未解鎖。\n\n觀看一次完整獎勵廣告即可永久解鎖此關。\n\n要繼續嗎？"
      );
      if (!confirmed) return;

      try {
        setMessage("正在載入廣告，請稍候……");
        const result = await showRewardedAd();

        if (!result?.rewarded) {
          setMessage("需要完整觀看廣告才能解鎖此關。");
          return;
        }

        unlockLevelByAd(selectedLevel.id);
        setEntitlementsVersion((v) => v + 1);
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
    setClearSignal((s) => s + 1);
  };

  /** 循環切換至前一關；目標仍須符合目前的解鎖規則。 */
  const goPrev = () => {
    if (!items.length) return;
    const nextIndex = (currentIndex - 1 + items.length) % items.length;

    if (!isLevelUnlocked(nextIndex)) {
      setMessage("上一關尚未解鎖。");
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(getLevelBestStars(items[nextIndex]));
    setClearSignal((s) => s + 1);
  };

  /** 循環切換至下一關；鎖定時保留目前關卡並提示解鎖方式。 */
  const goNext = () => {
    if (!items.length) return;
    const nextIndex = (currentIndex + 1) % items.length;

    if (!isLevelUnlocked(nextIndex)) {
      setMessage(
        "下一關尚未解鎖。請先完成目前關卡取得至少 1 顆星，或回到地圖觀看廣告解鎖。"
      );
      return;
    }

    setCurrentIndex(nextIndex);
    setLastStars(getLevelBestStars(items[nextIndex]));
    setClearSignal((s) => s + 1);
  };

  /** 清空畫布並遞增訊號，通知畫布元件重設筆跡。 */
  const clearCanvas = () => {
    setClearSignal((s) => s + 1);
    setMessage("已清除，請重新練習！");
  };

  /** 嘗試開啟系統文字轉語音設定；無法導向時提示手動操作方式。 */
  const handleOpenTtsSettings = async () => {
    const ok = await openTtsSettings();
    if (!ok) {
      window.alert("無法自動開啟設定頁，請手動到系統設定 > 文字轉語音輸出。");
    }
  };

  /**
   * 播放目前關卡或每日挑戰的文字，並在語音期間降低背景音量。
   * 沒有可用語音或文字時顯示狀態訊息，必要時提供系統設定入口。
   */
  const pronounceCurrentText = async () => {
    try {
      setShowTtsFixButton(false);

      const supported = await isTtsAvailable();
      // 不支援系統 TTS 時停止後續播放，並開啟修復設定按鈕。
      if (!supported) {
        setMessage("發音失敗，請確認系統語音服務可用。");
        setShowTtsFixButton(true);
        return;
      }

      const targetText = current?.text || currentDailyChallenge?.text || "";
      if (!targetText) {
        setMessage("目前沒有可發音的文字。");
        return;
      }

      const beforeBgmVol = getCurrentBgmVolume();

      if (bgmEnabled) {
        setBgmVolumeImmediate(0.05);
      }

      try {
        const lang =
          (current?.language || currentDailyChallenge?.language) === "english"
            ? "en-US"
            : undefined;

        await speakText(targetText, {
          lang,
          rate: ttsRate,
          volume: ttsVolume,
          zhVoice,
        });

        setMessage(`已播放「${targetText}」發音`);
        setShowTtsFixButton(false);
      } finally {
        if (bgmEnabled) {
          setBgmVolumeImmediate(beforeBgmVol || bgmVolume || 0.3);
        }
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setMessage("發音失敗，請確認系統語音服務可用。");
      setShowTtsFixButton(true);
    }
  };

  /** 評測一般關卡的筆跡、更新最高星等與首次通關總數，並顯示結果。 */
  const encourage = () => {
    try {
      const result = canvasApiRef.current?.evaluateTracing?.();

      // 評測元件尚未提供有效分數時，不更新進度，只顯示可重試的結果視窗。
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
      const previousBestStars = getLevelBestStars(current);

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

      // 完成數只在關卡首次取得至少一顆星時增加，重複練習不重複計數。
      if (stars >= 1 && previousBestStars < 1) {
        setCompletedCount((count) => count + 1);
      }

      if (result.passed) {
        setMessage(`太棒了！本次分數 ${result.score} 分，獲得 ${stars} 顆星。`);
      } else {
        setMessage(`本次分數 ${result.score} 分，再沿著提示描寫一次試試看！`);
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

  /** 經使用者確認後清除練習星星與完成數，但保留購買及廣告解鎖權限。 */
  const resetProgress = () => {
    const confirmed = window.confirm(
      "確定要清除所有星星與練習進度嗎？\n\n注意：這不會移除已看廣告解鎖或已購買的內容。"
    );
    if (!confirmed) return;

    setStarsByLevel({});
    setCompletedCount(0);
    setLastStars(0);
    setLastResult(null);
    setScoreModalOpen(false);

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    setMessage("練習進度已清除。");
  };

  // --------------------------
  // Views
  // --------------------------
  // 設定頁獨立渲染，避免其他導覽頁的元件同時出現在畫面上。
  if (view === "settings") {
    return (
      <main className="app">
        <header className="app-header">
          <h1>⚙️ 設定</h1>
          <p>調整筆色、格線與評分寬容度</p>
        </header>

        <SettingsPanel
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          onRequestUnlockColor={requestUnlockColor}
          onPurchaseAllColors={() => requestPurchase(PRODUCT_IDS.ALL_COLORS)}
          onRestorePurchases={handleRestorePurchases}
          onRedeemCode={handleRedeemCode}
          gridType={gridType}
          setGridType={setGridType}
          toleranceLevel={toleranceLevel}
          setToleranceLevel={setToleranceLevel}
          onResetProgress={resetProgress}
          onClose={closeSettings}
          bgmEnabled={bgmEnabled}
          setBgmEnabled={setBgmEnabled}
          bgmVolume={bgmVolume}
          setBgmVolume={setBgmVolume}
          ttsRate={ttsRate}
          setTtsRate={setTtsRate}
          ttsVolume={ttsVolume}
          setTtsVolume={setTtsVolume}
          zhVoice={zhVoice}
          setZhVoice={setZhVoice}
        />
      </main>
    );
  }

  // 語言首頁提供課程入口、每日挑戰入口及共用設定入口。
  if (view === "language") {
    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🖍️ CopyLand 練字樂園</h1>
          <p>先選語言，再開始闖關練字或每日挑戰！</p>
        </header>

        <LanguageSelector onSelect={toLanguage} onOpenDailyMap={openDailyMap} />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button type="button" className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  // 分類清單依照購買狀態及前置進度呈現可進入的課程。
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
          getUnlockRequirementsProgress={getUnlockRequirementsProgress}
          onBack={backToHome}
          onPickGroup={toGroup}
          onRequestPurchase={requestPurchase}
        />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button type="button" className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  // 關卡地圖顯示目前分類的進度，並提供課程購買入口。
  if (view === "map") {
    const unlockedCount = items.filter((_, index) => isLevelUnlocked(index)).length;

    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🗺️ 關卡地圖</h1>
          <p>完成前一關至少 1⭐ 才能解鎖下一關</p>
        </header>

        <section className="stats-card">
          <strong>解鎖進度：</strong>
          <span>{unlockedCount}</span> / {items.length} ｜ <strong>已完成：</strong>
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

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button type="button" className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>

            <button
              type="button"
              className="accent"
              onClick={() => requestPurchase(`copybook_course_${groupId}`)}
            >
              💳 解鎖本課程
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  // 每日挑戰地圖只顯示計畫期間內的日期與當日解鎖狀態。
  if (view === "daily-map") {
    return (
      <HomePageWithBanner>
        <header className="app-header">
          <h1>🎯 每日挑戰</h1>
          <p>2026/10 ～ 2027/09（英文字母題）</p>
        </header>

        <DailyChallengeMap
          year={dailyYear}
          month={dailyMonth}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          getDayState={getDailyState}
          onPickDate={enterDailyByDate}
        />

        <section className="controls" style={{ marginTop: 12 }}>
          <div className="controls-row">
            <button type="button" className="secondary" onClick={backToHome}>
              ⬅️ 返回首頁
            </button>
            <button type="button" className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
          </div>
        </section>
      </HomePageWithBanner>
    );
  }

  // 每日挑戰使用獨立的完成流程，不會改動一般課程的通關計數。
  if (view === "daily-practice") {
    const daily = currentDailyChallenge;
    if (!daily) return null;

    /** 評測每日題目並在取得至少一顆星時寫入該日期的完成紀錄。 */
    const completeDaily = () => {
      try {
        const result = canvasApiRef.current?.evaluateTracing?.();

        if (!result || typeof result.score !== "number") {
          setMessage("目前無法取得評測結果，請清除後再試一次。");
          setModalStars(0);
          setLastResult(null);
          setScoreModalOpen(true);
          return;
        }

        const stars = scoreToStars(result.score, result.starThresholds);

        setModalStars(stars);
        setLastStars(stars);
        setLastResult({
          ...result,
          stars,
          text: daily.text,
          unit: daily.unit,
          language: daily.language,
        });
        setScoreModalOpen(true);

        // 每日挑戰需達一顆星才標記完成；未達門檻仍可留在畫面重新練習。
        if (stars >= 1 && activeDailyDate) {
          markDailyDone(activeDailyDate, stars);
          setMessage(`挑戰完成！本次 ${stars}⭐，可重覆挑戰。`);
        } else {
          setMessage("本次未達 1⭐，不算完成挑戰，請再試一次！");
        }
      } catch (error) {
        console.error("daily encourage failed:", error);
        setMessage("評測發生問題，請再試一次。");
      }
    };

    return (
      <main className="app">
        <section className="stats-card">
          <strong>每日挑戰：</strong>
          {activeDailyDate} ｜ <strong>題目：</strong>
          {daily.title}
        </section>

        <div className="message-box">{message}</div>

        <div className="practice-container">
          <Controls
            practiceMode="writing"
            onPrev={() => {}}
            onNext={() => {}}
            onPronounce={pronounceCurrentText}
            onClear={clearCanvas}
            onEncourage={completeDaily}
            onBackToGroups={() => setView("daily-map")}
          />

          <div className="practice-main">
            <LetterCard
              title="Daily Challenge"
              text={daily.text}
              index={1}
              total={1}
              unit={daily.unit}
              language={daily.language}
              toleranceLabel={toleranceLabel}
            />

            <div className="writing-canvas-wrapper">
              <WritingCanvas
                ref={canvasApiRef}
                item={daily}
                practiceMode="writing"
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
            <button type="button" className="secondary" onClick={() => setView("daily-map")}>
              ⬅️ 返回每日地圖
            </button>
            <button type="button" className="secondary" onClick={openSettings}>
              ⚙️ 設定
            </button>
            {showTtsFixButton && (
              <button type="button" className="accent" onClick={handleOpenTtsSettings}>
                🛠️ 前往系統語音設定
              </button>
            )}
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
            clearCanvas();
          }}
          onClose={() => setScoreModalOpen(false)}
        />
      </main>
    );
  }

  // 若課程或關卡資料尚未就緒，不渲染依賴關卡內容的練習畫面。
  if (!current) return null;

  return (
    <main className="app">
      <section className="stats-card">
        <strong>關卡：</strong>
        {currentIndex + 1}/{items.length} ｜ 本次：
        <strong>{lastStars ? "⭐".repeat(lastStars) + "☆".repeat(3 - lastStars) : "☆☆☆"}</strong>
        {" ｜ "}
        模式：<strong>寫字</strong>
        {" ｜ "}
        寬容度：<strong>{toleranceLabel}</strong>
      </section>

      <div className="message-box">{message}</div>

      <div className="practice-container">
        <Controls
          practiceMode="writing"
          onPrev={goPrev}
          onNext={goNext}
          onPronounce={pronounceCurrentText}
          onClear={clearCanvas}
          onEncourage={encourage}
          onBackToGroups={goToMap}
        />

        <div className="practice-main">
          <LetterCard
            title={groupTitle}
            text={current.text}
            index={currentIndex}
            total={items.length}
            unit={current.unit}
            language={current.language}
            toleranceLabel={toleranceLabel}
          />

          <div className="writing-canvas-wrapper">
            <WritingCanvas
              ref={canvasApiRef}
              item={current}
              practiceMode="writing"
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
          <button type="button" className="secondary" onClick={openSettings}>
            ⚙️ 設定
          </button>
          {showTtsFixButton && (
            <button type="button" className="accent" onClick={handleOpenTtsSettings}>
              🛠️ 前往系統語音設定
            </button>
          )}
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
