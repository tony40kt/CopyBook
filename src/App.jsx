import { useRef, useState } from "react";
import { letters } from "./data/letters";
import LetterCard from "./components/LetterCard";
import WritingCanvas from "./components/WritingCanvas";
import Controls from "./components/Controls";
import "./styles.css";

const praises = [
  "太棒了！你很認真！🌟",
  "寫得很好，再試一個！👏",
  "超厲害！繼續加油！💪",
  "哇！進步很多喔！🎉",
  "你是小小書法家！🖍️",
];

export default function App() {
  const canvasApiRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const brushSize = 15; // 固定筆粗
  const [brushColor, setBrushColor] = useState("#1f4fff");
  const [gridType, setGridType] = useState("tian");
  const [clearSignal, setClearSignal] = useState(0);
  const [message, setMessage] = useState("準備好了就開始寫字吧！");
  const [completedCount, setCompletedCount] = useState(0);

  const current = letters[currentIndex];

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + letters.length) % letters.length);
    setMessage("很棒！試試上一個字吧！");
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % letters.length);
    setMessage("太好了！繼續下一個字！");
  };

  const clearCanvas = () => {
    setClearSignal((s) => s + 1);
    setMessage("已清除，重新練習一次！");
  };

  const encourage = () => {
    const result = canvasApiRef.current?.evaluateTracing?.();

    if (!result) {
      setMessage("目前無法評估，請再試一次。");
      return;
    }

    if (result.passed) {
      const praise = praises[Math.floor(Math.random() * praises.length)];
      setMessage(`${praise}（描紅分數：${result.score}）`);
      setCompletedCount((c) => c + 1);
    } else {
      setMessage(`很接近囉～目前分數 ${result.score}，再沿著灰字描一點點就會過關！`);
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>🧒 兒童練字小教室（描紅模式）</h1>
        <p>看著淡灰色字形，在下方描寫練習！</p>
      </header>

      <section className="stats-card">
        <strong>家長小統計：</strong> 今天完成 <span>{completedCount}</span> 次練習
      </section>

      <LetterCard
        char={current.char}
        hint={current.hint}
        index={currentIndex}
        total={letters.length}
      />

      <WritingCanvas
        ref={canvasApiRef}
        guideChar={current.char}
        brushSize={brushSize}
        brushColor={brushColor}
        gridType={gridType}
        clearSignal={clearSignal}
      />

      <Controls
        brushSize={brushSize}
        color={brushColor}
        setColor={setBrushColor}
        gridType={gridType}
        setGridType={setGridType}
        onPrev={goPrev}
        onNext={goNext}
        onClear={clearCanvas}
        onEncourage={encourage}
      />

      <footer className="message-box" role="status" aria-live="polite">
        {message}
      </footer>
    </main>
  );
}