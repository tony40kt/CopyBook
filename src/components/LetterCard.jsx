const UNIT_LABELS = {
  char: "字元",
  word: "詞語",
};

const LANGUAGE_LABELS = {
  english: "English",
  chinese: "中文",
};

export default function LetterCard({
  text,
  hint,
  index,
  total,
  title,
  unit,
  language,
  practiceMode,
  toleranceLabel,
}) {
  return (
    <section className="letter-card">
      <div className="letter-meta">
        <span>{title}</span>
        <span>第 {index + 1} / {total} 關</span>
      </div>

      <div className="letter-tags">
        <span className="fixed-tag">{LANGUAGE_LABELS[language] || language}</span>
        <span className="fixed-tag">{UNIT_LABELS[unit] || unit}</span>
        <span className="fixed-tag">{practiceMode === "doodle" ? "塗鴉模式" : "寫字模式"}</span>
        <span className="fixed-tag">寬容度：{toleranceLabel}</span>
      </div>

      <div className="letter-preview" aria-label={`練習內容 ${text}`}>
        {text}
      </div>

      <p className="letter-hint">✍️ 提示：{hint}</p>
    </section>
  );
}