export default function LetterCard({ char, hint, index, total }) {
  return (
    <section className="letter-card">
      <div className="letter-meta">
        <span>第 {index + 1} / {total} 個字</span>
      </div>

      <div className="letter-preview" aria-label={`練習字 ${char}`}>
        {char}
      </div>

      <p className="letter-hint">✍️ 提示：{hint}</p>
    </section>
  );
}