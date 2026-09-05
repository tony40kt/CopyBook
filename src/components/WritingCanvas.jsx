import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const WritingCanvas = forwardRef(function WritingCanvas(
  { guideChar, brushSize, brushColor, gridType, clearSignal },
  ref
) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCtx = () => canvasRef.current?.getContext("2d") || null;

  const setupCanvas = (canvas, cssW, cssH, dpr) => {
    if (!canvas) return;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${Math.floor(cssW)}px`;
    canvas.style.height = `${Math.floor(cssH)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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

    ctx.fillStyle = "rgba(120,120,120,0.18)";
    ctx.font = `bold ${Math.floor(h * 0.55)}px "KaiTi", "Noto Sans TC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(guideChar, w / 2, h / 2 + 2);

    ctx.restore();
  };

  const clearCanvas = () => {
    drawBackground();
  };

  const resizeCanvas = () => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    const cssW = Math.max(320, rect.width);
    const cssH = Math.floor(cssW * 0.62);

    const old = canvas.toDataURL();

    setupCanvas(canvas, cssW, cssH, dpr);
    drawBackground();

    const ctx = getCtx();
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, cssW, cssH);
    };
    img.src = old;
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

  const evaluateTracing = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return { passed: false, score: 0, tracedRatio: 0, guideRatio: 0 };

    const realW = canvas.width;
    const realH = canvas.height;
    if (!realW || !realH) return { passed: false, score: 0, tracedRatio: 0, guideRatio: 0 };

    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    const mask = document.createElement("canvas");
    mask.width = realW;
    mask.height = realH;
    const mctx = mask.getContext("2d");
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, cssW, cssH);
    mctx.fillStyle = "#000";
    mctx.font = `bold ${Math.floor(cssH * 0.6)}px "KaiTi", "Noto Sans TC", sans-serif`;
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.fillText(guideChar, cssW / 2, cssH / 2 + 2);

    const guideData = mctx.getImageData(0, 0, realW, realH).data;
    const userData = ctx.getImageData(0, 0, realW, realH).data;

    let guidePixels = 0;
    let tracedOnGuide = 0;
    let userInkPixels = 0;

    for (let i = 0; i < guideData.length; i += 4) {
      const gA = guideData[i + 3];

      const r = userData[i];
      const g = userData[i + 1];
      const b = userData[i + 2];
      const a = userData[i + 3];

      const isWhiteBg = r > 245 && g > 245 && b > 245;
      const isLightBlueGrid = r > 190 && g > 210 && b > 235;
      const isGrayGuide = Math.abs(r - g) < 18 && Math.abs(g - b) < 18 && r > 95 && r < 170;

      const isUserInk = a > 20 && !isWhiteBg && !isLightBlueGrid && !isGrayGuide;

      if (gA > 8) {
        guidePixels++;
        if (isUserInk) tracedOnGuide++;
      }
      if (isUserInk) userInkPixels++;
    }

    const tracedRatio = guidePixels > 0 ? tracedOnGuide / guidePixels : 0;
    const guideRatio = userInkPixels > 0 ? tracedOnGuide / userInkPixels : 0;
    const score = Math.round((tracedRatio * 0.6 + guideRatio * 0.4) * 100);
    const passed = score >= 41;

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
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [guideChar, gridType]);

  useEffect(() => {
    clearCanvas();
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