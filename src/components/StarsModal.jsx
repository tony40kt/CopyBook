import { useEffect } from "react";

function formatPercent(value) {
  if (typeof value !== "number") return null;
  return `${Math.round(value * 100)}%`;
}

export default function StarsModal({ open, stars, result, onRetry, onNext, onClose }) {
  useEffect(() => {
    if (open) console.log("[DEBUG] StarsModal opened with stars=", stars);
  }, [open, stars]);

  if (!open) return null;
  return (
    <div className="stars-modal-backdrop" onClick={onClose}>
      <div className="stars-modal" onClick={(e) => e.stopPropagation()}>
        <h2>本次評分</h2>
        <div className="stars-display">{ "⭐".repeat(stars) + "☆".repeat(3 - stars) }</div>
        {result && (
          <div className="score-breakdown">
            <p>
              <strong>{result.text}</strong> ｜ {result.mode === "doodle" ? "塗鴉" : "寫字"} ｜{" "}
              {result.score} 分
            </p>
            <p>寬容度：{result.toleranceLabel || "標準"}</p>
            {result.mode === "writing" ? (
              <>
                <p>覆蓋率：{formatPercent(result.coverage)}</p>
                <p>精準率：{formatPercent(result.precision)}</p>
                <p>控制度：{formatPercent(result.containment)}</p>
              </>
            ) : (
              <>
                <p>活躍度：{formatPercent(result.activity)}</p>
                <p>分佈度：{formatPercent(result.spread)}</p>
                <p>控制度：{formatPercent(result.control)}</p>
              </>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button className="secondary" onClick={onRetry}>再寫一次</button>
          <button className="accent" onClick={onNext}>下一個字</button>
        </div>
      </div>
    </div>
  );
}