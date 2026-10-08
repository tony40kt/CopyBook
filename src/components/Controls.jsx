export default function Controls({
  onPrev,
  onNext,
  onPronounce,
  onClear,
  onEncourage,
  onBackToGroups,
}) {
  return (
    <aside className="controls-left">
      <button type="button" className="ctrl-btn" onClick={() => onPrev?.()}>
        ⬆️ 上一個
      </button>

      <button type="button" className="ctrl-btn" onClick={() => onNext?.()}>
        ⬇️ 下一個
      </button>

      <button type="button" className="ctrl-btn accent" onClick={() => onPronounce?.()}>
        🔊 發音
      </button>

      <button type="button" className="ctrl-btn" onClick={() => onClear?.()}>
        🧽 清除
      </button>

      <button type="button" className="ctrl-btn accent" onClick={() => onEncourage?.()}>
        ✅ 我寫好了
      </button>

      <button type="button" className="ctrl-btn" onClick={() => onBackToGroups?.()}>
        📚 返回
      </button>
    </aside>
  );
}