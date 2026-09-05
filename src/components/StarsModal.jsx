import React, { useEffect } from "react";

export default function StarsModal({ open, stars, onRetry, onNext, onClose }) {
  useEffect(() => {
    if (open) console.log("[DEBUG] StarsModal opened with stars=", stars);
  }, [open, stars]);

  if (!open) return null;
  return (
    <div className="stars-modal-backdrop" onClick={onClose}>
      <div className="stars-modal" onClick={(e) => e.stopPropagation()}>
        <h2>本次評分</h2>
        <div className="stars-display">{ "⭐".repeat(stars) + "☆".repeat(3 - stars) }</div>
        <div className="modal-actions">
          <button className="secondary" onClick={onRetry}>再寫一次</button>
          <button className="accent" onClick={onNext}>下一個字</button>
        </div>
      </div>
    </div>
  );
}