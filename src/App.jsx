import { useMemo, useState } from "react";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [brushSize, setBrushSize] = useState(8);
  const [clearSignal, setClearSignal] = useState(0);
  const [message, setMessage] = useState("準備好了就開始寫字吧！");

  const current = letters[currentIndex];

  const randomPraise = useMemo(
    () => praises[Math.floor(Math.random() * praises.length)],
    [currentIndex]
  );

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
    setMessage(randomPraise);
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>🧒 兒童練字小教室</h1>
        <p>看著淡灰色字形，在下方描寫練習！</p>
      </header>

      <LetterCard
        char={current.char}
        hint={current.hint}
        index={currentIndex}
        total={letters.length}
      />

      <WritingCanvas
        guideChar={current.char}
        brushSize={brushSize}
        clearSignal={clearSignal}
      />

      <Controls
        brushSize={brushSize}
        setBrushSize={setBrushSize}
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