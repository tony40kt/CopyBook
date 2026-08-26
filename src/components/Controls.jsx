export default function Controls({
  brushSize,
  setBrushSize,
  onPrev,
  onNext,
  onClear,
  onEncourage,
}) {
  return (
    <section className="controls">
      <div className="controls-row">
        <button onClick={onPrev}>⬅️ 上一個</button>
        <button onClick={onNext}>下一個 ➡️</button>
      </div>

      <div className="controls-row">
        <button className="secondary" onClick={onClear}>🧽 清除重寫</button>
        <button className="accent" onClick={onEncourage}>✅ 我寫好了</button>
      </div>

      <div className="controls-row slider-row">
        <label htmlFor="brushSize">筆粗：{brushSize}px</label>
        <input
          id="brushSize"
          type="range"
          min="2"
          max="24"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
      </div>
    </section>
  );
}