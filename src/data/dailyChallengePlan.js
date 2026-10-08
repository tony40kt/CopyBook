/**
 * 專案活動期間設定
 * 計畫區間：2026-10-01 ~ 2027-09-30（共 12 個月，總計 365 天）
 */
const START_DATE = "2026-10-01";
const END_DATE = "2027-09-30";

/**
 * 全局題目池變數
 * 用於快取從 CSV 檔案解析出來的每日挑戰資料物件陣列
 * @type {Array<{title: string, text: string, hint: string}>}
 */
let globalChallengePool = [];

/**
 * 安全防禦機制
 * 當 CSV 題目庫尚未加載完成、或活動天數超出題目庫長度時的「後備防錯題目」
 */
const DEFAULT_CHALLENGE = {
  title: "加載中或題目待定",
  text: "Pending",
  hint: "新題目正在路上，敬請期待！"
};

/**
 * 核心功能：初始化並透過 HTTP 網路請求加載 CSV 題目庫檔案
 * 💡 注意項目：
 * 1. 在前端瀏覽器中，fetch 無法直接讀取本地磁碟實體路徑（如 src/）。
 * 2. 請將你的 challenges.csv 複製一份放到專案的 public/ 資料夾中。
 * 3. 預設透過網址路徑 '/challenges.csv' 來進行異步加載。
 * 
 * @param {string} csvUrl - CSV 檔案的 HTTP 讀取路徑
 * @returns {Promise<void>} 異步操作的 Promise 物件
 */
export async function initChallengePool(csvUrl = "/challenges.csv") {
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`無法讀取 CSV 檔案，伺服器回應狀態碼: ${response.status}`);
    
    const csvText = await response.text();
    
    // 依行拆分字串，相容 Windows (\(\r\\)n) 與 Linux/Mac (\n) 的換行符號，並過濾掉空白行
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
    
    // 解析每行資料並轉換為結構化物件陣列
    globalChallengePool = lines.map(line => {
      // 簡易 CSV 逗號分割（若欄位內容包含中文逗號，此處安全；若包含英文逗號，建議改用正規表示式）
      const [title, text, hint] = line.split(",");
      return {
        title: title?.trim() || "無標題",
        text: text?.trim() || "",
        hint: hint?.trim() || "請跟著提示完成挑戰。"
      };
    });
    
    console.log(`[CopyBook] 成功載入題目庫！共計 ${globalChallengePool.length} 筆每日題目。`);
  } catch (error) {
    console.error("[CopyBook] 初始化題目庫失敗，系統將自動啟用預設題目後備機制:", error);
    globalChallengePool = []; // 發生錯誤時確保清空，改走防錯後備機制
  }
}

/**
 * 工具函式：將標準 JavaScript Date 物件格式化為 YYYY-MM-DD 字串
 * @param {Date} date - 欲格式化的日期物件
 * @returns {string} 格式化後的日期字串（例如: "2026-10-01"）
 */
function formatDate(date) {
  const y = date.getFullYear();
  // 月份從 0 開始，需加 1；使用 padStart 確保未滿雙位數時自動補 0
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 產生器函式 (Generator)：在指定的日期範圍內逐日遞增產生 Date 物件
 * @param {string} start - 開始日期 (格式: YYYY-MM-DD)
 * @param {string} end - 結束日期 (格式: YYYY-MM-DD)
 * @returns {Generator<Date>} 每日日期物件的迭代器
 */
function* dateRange(start, end) {
  // 加上 T00:00:00 確保瀏覽器以本地時區（而非 UTC）正確解析日期
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  while (current <= endDate) {
    yield new Date(current);
    current.setDate(current.getDate() + 1); // 逐日遞增
  }
}

/**
 * 計算目標日期距離活動開始日期的天數（即陣列的索引值位置）
 * @param {string} targetDate - 目標日期 (格式: YYYY-MM-DD)
 * @returns {number} 相差天數 (計畫第一天 2026-10-01 回傳值為 0，第二天為 1，依此類推)
 */
function dayIndexFromStart(targetDate) {
  const start = new Date(`${START_DATE}T00:00:00`);
  const target = new Date(`${targetDate}T00:00:00`);
  const diffMs = target.getTime() - start.getTime();
  return Math.floor(diffMs / 86400000); // 一天的毫秒數：1000 * 60 * 60 * 24 = 86,400,000
}

/**
 * 特殊日期手動覆寫設定集
 * 保留此空物件，供未來特定節日（如元旦、春節、聖誕節）或臨時活動進行題目強制作業
 */
const OVERRIDES = {
  // 範例設定："2026-12-25": { title: "聖誕快樂", text: "Xmas", hint: "祝你聖誕平安！" },
};

/**
 * 核心功能：獲取指定日期的挑戰題目完整資料
 * @param {string} dateStr - 目標日期字串 (格式: YYYY-MM-DD)
 * @returns {Object} 包含日期、標題、文本、語系與提示的挑戰題目物件
 */
export function getChallengeForDate(dateStr) {
  // 1. 優先判定：檢查該日期是否存在於手動覆寫設定集中
  if (OVERRIDES[dateStr]) {
    return {
      date: dateStr,
      title: OVERRIDES[dateStr].title,
      text: OVERRIDES[dateStr].text,
      language: "chinese",
      unit: "word",
      hint: OVERRIDES[dateStr].hint || "請跟著提示完成挑戰。",
    };
  }

  // 2. 計算目標日期是整個活動計畫的第幾天 (從 0 開始算起)
  const idx = dayIndexFromStart(dateStr);

  // 3. 安全讀取：從快取的全局題目池中拿取題目，若資料未載入完成或索引越界，則自動套用 DEFAULT_CHALLENGE
  const challengeData = globalChallengePool[idx] || DEFAULT_CHALLENGE;

  return {
    date: dateStr,
    title: `Day ${idx + 1}: ${challengeData.title}`,
    text: challengeData.text,
    language: "chinese",
    unit: "word",
    hint: challengeData.hint,
  };
}

/**
 * 核心功能：獲取指定月份內的所有挑戰題目清單（會自動過濾掉非活動範圍內的日期）
 * @param {number} year - 年份 (例如: 2026)
 * @param {number} month - 月份 (1 ~ 12)
 * @returns {Object[]} 該月份有效的挑戰題目資料物件陣列
 */
export function getMonthlyChallenges(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const list = [];
  
  // 遍歷該月份的每一天
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDate(d);
    // 嚴格邊界判定：若日期早於計畫開始日或晚於結束日，則跳過不計入
    if (dateStr < START_DATE || dateStr > END_DATE) continue;
    list.push(getChallengeForDate(dateStr));
  }
  return list;
}

/**
 * 獲取整個活動計畫的總體開始與結束日期範圍
 * @returns {{startDate: string, endDate: string}}
 */
export function getPlanBounds() {
  return { startDate: START_DATE, endDate: END_DATE };
}

/**
 * 獲取活動計畫期間內所有規劃好的日期字串陣列
 * @returns {string[]} 由 YYYY-MM-DD 格式組成的日期字串陣列
 */
export function getAllPlannedDates() {
  const dates = [];
  // 活用現有的 Generator 進行安全的日期區間生成
  for (const d of dateRange(START_DATE, END_DATE)) {
    dates.push(formatDate(d));
  }
  return dates;
}
