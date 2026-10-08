import React from "react";
// 引入活動期間邊界，以及獲取每日 CSV 題目的核心函式
import { getPlanBounds, getChallengeForDate } from "../data/dailyChallengePlan";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 將日期格式化為 YYYY-MM-DD，供活動期間比對及每日狀態查詢使用。
 * @param {number} year - 西元年。
 * @param {number} month - 月份，範圍為 1 至 12。
 * @param {number} day - 該月份中的日期。
 * @returns {string} 格式化後的日期字串。
 */
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 取得裝置當地日期字串，避免以 UTC 日期判算「今天」造成日期偏移。
 * @returns {string} YYYY-MM-DD 格式的當地日期。
 */
function getTodayDate() {
  const today = new Date();
  return formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
}

/**
 * 依日期及每日挑戰紀錄決定月曆格的狀態樣式。
 * @param {string} dateStr - YYYY-MM-DD 格式的日期。
 * @param {string} todayStr - YYYY-MM-DD 格式的當地今日日期。
 * @param {{done?: boolean, adUnlocked?: boolean}} dayState - 該日的完成及廣告解鎖紀錄。
 * @returns {"future"|"today"|"past_done"|"past_unlocked"|"past_locked"} 月曆狀態。
 */
function getDateStatus(dateStr, todayStr, dayState) {
  if (dateStr > todayStr) return "future";
  if (dateStr === todayStr) return "today";
  if (dayState?.done) return "past_done";
  if (dayState?.adUnlocked) return "past_unlocked";
  return "past_locked";
}

/**
 * 顯示每日挑戰月份月曆，並整合 CSV 題目庫內容呈現於關卡地圖中。
 * 
 * @param {Object} props - 元件屬性
 * @param {number} props.year - 要顯示的西元年。
 * @param {number} props.month - 要顯示的月份（1 至 12）。
 * @param {() => void} props.onPrevMonth - 切換至上個月的回呼。
 * @param {() => void} props.onNextMonth - 切換至下個月的回呼。
 * @param {(dateStr: string) => {done?: boolean, adUnlocked?: boolean}} props.getDayState - 查詢指定日期的完成狀態。
 * @param {(dateStr: string) => void} props.onPickDate - 使用者選取日期時呼叫。
 * @returns {JSX.Element}
 */
export default function DailyChallengeMap({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  getDayState,
  onPickDate,
}) {
  const { startDate, endDate } = getPlanBounds();
  const todayStr = getTodayDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendarCells = [];

  // 1. 月初前的空格：讓日期排列與星期標題對齊。
  for (let index = 0; index < firstWeekday; index += 1) {
    calendarCells.push(null);
  }

  // 2. 建立當月日期：活動計畫以外的日子會以空格呈現。
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = formatDate(year, month, day);
    const inPlan = dateStr >= startDate && dateStr <= endDate;
    calendarCells.push(inPlan ? dateStr : null);
  }

  // 3. 補齊最後一週的空格，讓月曆保持完整的七欄排列。
  while (calendarCells.length % WEEKDAYS.length !== 0) {
    calendarCells.push(null);
  }

  return (
    <section className="selector-card">
      <h2>🎯 每日挑戰地圖</h2>
      <p className="map-subtitle">
        {year} 年 {month} 月
      </p>

      <div className="selector-actions controls-row">
        <button type="button" className="secondary" onClick={onPrevMonth}>
          ← 上個月
        </button>
        <button type="button" className="secondary" onClick={onNextMonth}>
          下個月 →
        </button>
      </div>

      <div
        className="level-map-grid"
        style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginTop: "24px" }}
        aria-label={`${year} 年 ${month} 月每日挑戰日期`}
      >
        {/* 星期標題行 */}
        {/* 🎯 【優化成功】字體放大至 1.1rem 並強制水平與垂直置中 */}
        {WEEKDAYS.map((weekday, index) => (
          <span 
            className="node-mode" 
            key={`weekday-${index}`}
            style={{ 
              fontSize: "1.1rem",       // 放大星期標題字體（原本通常是 0.85rem 左右）
              fontWeight: "bold",       // 讓星期標題加粗，視覺更清晰
              textAlign: "center",      // 文字水平置中
              display: "block",         // 確保撐開寬度以利置中
              padding: "4px 0"          // 上下微調一點留白間距
            }}
          >
            {weekday}
          </span>
        ))}

        {/* 月曆日期格子 */}
        {calendarCells.map((dateStr, index) => {
          // 非活動期間的日期僅作為排版空格，不建立可互動的關卡。
          if (!dateStr) {
            return <span aria-hidden="true" key={`empty-${index}`} />;
          }

          // 核心修正：動態讀取該日期在 CSV 題目庫中對應的題目資料
          const challenge = getChallengeForDate(dateStr);
          const dayState = getDayState(dateStr);
          const status = getDateStatus(dateStr, todayStr, dayState);
          const dayNum = Number(dateStr.slice(-2));

          return (
            <button
              aria-label={`${dateStr}，挑戰題目：${challenge.text}，狀態：${
                status === "today"
                  ? "今天"
                  : status === "future"
                    ? "尚未開放"
                    : status === "past_done"
                      ? "已完成"
                      : status === "past_unlocked"
                        ? "已解鎖"
                        : "尚未解鎖"
              }`}
              className={`level-node ${status}`}
              key={dateStr}
              onClick={() => onPickDate(dateStr)}
              style={{ minHeight: 72, padding: "6px 2px", borderRadius: 10, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" }}
              title={
                status === "past_locked"
                  ? `觀看廣告解鎖今日題目：${challenge.title}`
                  : `${dateStr} ${challenge.title}`
              }
              type="button"
            >
              {/* 顯示日期數字 (例如: 1) */}
              <span className="node-index" style={{ fontWeight: "bold", fontSize: "2.0rem" }}>{dayNum}</span>
              
              

              {/* 顯示當前關卡的狀態標籤 */}
              <span className="node-char" style={{ fontSize: "0.75rem" }}>
                {status === "today"
                  ? "今天"
                  : status === "future"
                    ? "未開放"
                    : status === "past_done"
                      ? "✅"   // 清理了原本錯誤的星星邏輯，改用直覺的完成勾勾
                      : status === "past_unlocked"
                        ? ""
                        : "🔒"}
              </span>
            </button>
          );
        })}
      </div>

      <p className="map-legend">
        今天可直接挑戰；過期且未解鎖的題目可觀看完整獎勵廣告解鎖。
      </p>
    </section>
  );
}
