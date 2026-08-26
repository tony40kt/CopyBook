import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const WritingCanvas = forwardRef(function WritingCanvas(
  { guideChar, brushSize, brushColor, gridType, clearSignal },
  ref
) {
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

    const oldImage = canvas.toDataURL();

    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor((rect.width * 0.62) * ratio);
    canvas.style.width = `${Math.floor(rect.width)}px`;
    canvas.style.height = `${Math.floor(rect.width * 0.62)}px`;

    const ctx = getCtx();
    if (!ctx) return;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    drawBackground();

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight);
    };
    img.src = oldImage;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
  };

  const drawBackground = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.strokeStyle = "#d9e2ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    if (gridType === "tian" || gridType === "mi") {
      ctx.beginPath();
      ctx.moveTo(w / 2, 10);
      ctx.lineTo(w / 2, h - 10);
      ctx.moveTo(10, h / 2);
      ctx.lineTo(w - 10, h / 2);
      ctx.stroke();
    }

    if (gridType === "mi") {
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(w - 10, h - 10);
      ctx.moveTo(w - 10, 10);
      ctx.lineTo(10, h - 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "rgba(120, 120, 120, 0.18)";
    ctx.font = `bold ${Math.floor(h * 0.55)}px "KaiTi", "Noto Sans TC", sans-serif`;
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

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    e?.preventDefault?.();
    setIsDrawing(false);
  };

  // 更寬鬆的描紅評估
  const evaluateTracing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { passed: false, score: 0, tracedRatio: 0, guideRatio: 0 };

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return { passed: false, score: 0, tracedRatio: 0, guideRatio: 0 };

    // 1) 引導字遮罩（稍微放大，讓判定更寬鬆）
    const guide = document.createElement("canvas");
    guide.width = w;
    guide.height = h;
    const gctx = guide.getContext("2d");

    gctx.clearRect(0, 0, w, h);
    gctx.fillStyle = "#000";
    gctx.font = `bold ${Math.floor(h * 0.60)}px "KaiTi", "Noto Sans TC", sans-serif`; // 放大
    gctx.textAlign = "center";
    gctx.textBaseline = "middle";
    gctx.fillText(guideChar, w / 2, h / 2 + 2);

    const guideData = gctx.getImageData(0, 0, w, h).data;

    // 2) 使用者畫布
    const ctx = getCtx();
    const userData = ctx.getImageData(0, 0, w, h).data;

    let guidePixels = 0;
    let tracedOnGuide = 0;
    let userInkPixels = 0;

    for (let i = 0; i < guideData.length; i += 4) {
      const gA = guideData[i + 3];
      const uA = userData[i + 3];
      const uR = userData[i];
      const uG = userData[i + 1];
      const uB = userData[i + 2];

      const isLikelyUserInk =
        uA > 18 &&
        !(
          Math.abs(uR - 120) < 28 &&
          Math.abs(uG - 120) < 28 &&
          Math.abs(uB - 120) < 28
        ) &&
        !(uR > 198 && uG > 218 && uB > 242);

      if (gA > 8) {
        guidePixels++;
        if (isLikelyUserInk) tracedOnGuide++;
      }

      if (isLikelyUserInk) userInkPixels++;
    }

    const tracedRatio = guidePixels > 0 ? tracedOnGuide / guidePixels : 0;
    const guideRatio = userInkPixels > 0 ? tracedOnGuide / userInkPixels : 0;

    // 權重改為 60/40，讓分數更容易上去
    const score = Math.round((tracedRatio * 0.6 + guideRatio * 0.4) * 100);

    // ✅ 更寬鬆門檻
    const passed = tracedRatio >= 0.12 && score >= 24;

    return { passed, score, tracedRatio, guideRatio };
  };

  useImperativeHandle(ref, () => ({
    clearCanvas,
    evaluateTracing,
  }));

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
  }, [guideChar, gridType]);

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
});

export default WritingCanvas;