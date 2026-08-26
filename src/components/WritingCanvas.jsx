import { useEffect, useRef, useState } from "react";

export default function WritingCanvas({ guideChar, brushSize, clearSignal }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ratio = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();

    const oldData = canvas.toDataURL();

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor((rect.width * 0.62) * ratio);
    canvas.style.width = `${Math.floor(rect.width)}px`;
    canvas.style.height = `${Math.floor(rect.width * 0.62)}px`;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // 重畫舊內容（若有）
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width / ratio, canvas.height / ratio);
      drawGuideChar();
    };
    img.src = oldData;

    // 首次時畫引導字
    if (!oldData) drawGuideChar();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawGuideChar();
  };

  const drawGrid = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.save();
    ctx.strokeStyle = "#d9e2ff";
    ctx.lineWidth = 1;

    // 外框
    ctx.strokeRect(10, 10, w - 20, h - 20);

    // 中線
    ctx.beginPath();
    ctx.moveTo(w / 2, 10);
    ctx.lineTo(w / 2, h - 10);
    ctx.moveTo(10, h / 2);
    ctx.lineTo(w - 10, h / 2);
    ctx.stroke();

    // 對角虛線
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(w - 10, h - 10);
    ctx.moveTo(w - 10, 10);
    ctx.lineTo(10, h - 10);
    ctx.stroke();

    ctx.restore();
  };

  const drawGuideChar = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    drawGrid();

    ctx.save();
    ctx.fillStyle = "rgba(120, 120, 120, 0.18)";
    ctx.font = `bold ${Math.floor(h * 0.55)}px "Arial", "Noto Sans TC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(guideChar, w / 2, h / 2 + 2);
    ctx.restore();
  };

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = getCtx();
    const p = getPoint(e);
    if (!ctx || !p) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const ctx = getCtx();
    const p = getPoint(e);
    if (!ctx || !p) return;

    ctx.strokeStyle = "#1f4fff";
    ctx.lineWidth = brushSize;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    e?.preventDefault?.();
    setIsDrawing(false);
  };

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideChar]);

  useEffect(() => {
    clearCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSignal]);

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        className="writing-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}