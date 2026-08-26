export default function Controls({
  brushSize,
  color,
  setColor,
  gridType,
  setGridType,
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

      <div className="controls-row">
        <span className="fixed-brush">目前筆粗：{brushSize}px（固定）</span>

        <label htmlFor="colorSelect">筆色：</label>
        <select
          id="colorSelect"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        >
          <option value="#1f4fff">藍色</option>
          <option value="#111111">黑色</option>
          <option value="#e53935">紅色</option>
        </select>

        <label htmlFor="gridTypeSelect">格線：</label>
        <select
          id="gridTypeSelect"
          value={gridType}
          onChange={(e) => setGridType(e.target.value)}
        >
          <option value="none">空白</option>
          <option value="tian">田字格</option>
          <option value="mi">米字格</option>
        </select>
      </div>
    </section>
  );
}