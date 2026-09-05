import React from "react";

export default function Controls({
  onPrev,
  onNext,
  onClear,
  onEncourage,
  onBackToGroups,
}) {
  return (
    <aside className="controls-left">
      <button
        className="ctrl-btn"
        onClick={() => {
          console.log("[DEBUG] Controls: Prev clicked");
          onPrev && onPrev();
        }}
      >
        ⬆️ 上一個
      </button>

      <button
        className="ctrl-btn"
        onClick={() => {
          console.log("[DEBUG] Controls: Next clicked");
          onNext && onNext();
        }}
      >
        ⬇️ 下一個
      </button>

      <button
        className="ctrl-btn"
        onClick={() => {
          console.log("[DEBUG] Controls: Clear clicked");
          onClear && onClear();
        }}
      >
        🧽 清除
      </button>

      <button
        className="ctrl-btn accent"
        onClick={() => {
          console.log("[DEBUG] Controls: Encourage clicked");
          onEncourage && onEncourage();
        }}
      >
        ✅ 我寫好了
      </button>

      <button
        className="ctrl-btn"
        onClick={() => {
          console.log("[DEBUG] Controls: Back to map clicked");
          onBackToGroups && onBackToGroups();
        }}
      >
        📚 關卡地圖
      </button>
    </aside>
  );
}