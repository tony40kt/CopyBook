import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildGuideLayout, drawGuideText } from "../lib/evaluation/buildGuideLayout";
import { evaluateWriting } from "../lib/evaluation/evaluateWriting";
import { evaluateDoodle } from "../lib/evaluation/evaluateDoodle";
import { getProfileId } from "../lib/evaluation/profiles";

const DEFAULT_CANVAS = {
  cssWidth: 320,
  cssHeight: 200,
  dpr: 1,
};

function createStroke(point, brushSize, brushColor, mode, pointerType) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode,
    color: brushColor,
    brushSize,
    pointerType,
    points: [point],
  };
}

function drawStroke(ctx, stroke) {
  const points = stroke?.points || [];
  if (!ctx || !points.length) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.brushSize;

  if (points.length === 1) {
    const point = points[0];
    ctx.beginPath();
    ctx.arc(point.x, point.y, stroke.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    ctx.lineTo(point.x, point.y);
  }

  ctx.stroke();
  ctx.restore();
}

const WritingCanvas = forwardRef(function WritingCanvas(
  { item, practiceMode, brushSize, brushColor, gridType, toleranceLevel, clearSignal },
  ref
) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const activeStrokeRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS);
  const [, setStrokeVersion] = useState(0);

  const effectiveItem = useMemo(() => {
    if (!item) return null;

    return {
      ...item,
      mode: practiceMode,
      evaluation: {
        ...item.evaluation,
        profileId: getProfileId({
          mode: practiceMode,
          unit: item.unit,
        }),
      },
    };
  }, [item, practiceMode]);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d") || null, []);

  const getPoint = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      t: Date.now(),
      pressure: event.pressure || 0.5,
      pointerType: event.pointerType || "mouse",
    };
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const { cssWidth, cssHeight, dpr } = canvasSize;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    ctx.save();
    ctx.strokeStyle = "#d9e2ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, cssWidth - 20, cssHeight - 20);

    if (gridType === "tian" || gridType === "mi") {
      ctx.beginPath();
      ctx.moveTo(cssWidth / 2, 10);
      ctx.lineTo(cssWidth / 2, cssHeight - 10);
      ctx.moveTo(10, cssHeight / 2);
      ctx.lineTo(cssWidth - 10, cssHeight / 2);
      ctx.stroke();
    }

    if (gridType === "mi") {
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(cssWidth - 10, cssHeight - 10);
      ctx.moveTo(cssWidth - 10, 10);
      ctx.lineTo(10, cssHeight - 10);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    if (effectiveItem?.text) {
      const layout = buildGuideLayout({
        ctx,
        text: effectiveItem.text,
        guide: effectiveItem.guide,
        mode: practiceMode,
        width: cssWidth,
        height: cssHeight,
      });

      drawGuideText(ctx, layout, {
        fillStyle: practiceMode === "doodle" ? "#7f8ccf" : "#7a7a7a",
        alpha: practiceMode === "doodle" ? 0.24 : 0.18,
      });

      if (practiceMode === "doodle") {
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = "rgba(127, 140, 207, 0.35)";
        ctx.lineWidth = 2;
        ctx.strokeRect(24, layout.y + 20, cssWidth - 48, cssHeight - layout.y - 34);
        ctx.restore();
      }
    }

    strokesRef.current.forEach((stroke) => drawStroke(ctx, stroke));
  }, [canvasSize, effectiveItem, getCtx, gridType, practiceMode]);

  const clearCanvas = useCallback(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    redraw();
    setStrokeVersion((value) => value + 1);
  }, [redraw]);

  const resizeCanvas = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    const cssWidth = Math.max(320, rect.width);
    const cssHeight = Math.floor(cssWidth * 0.62);

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${Math.floor(cssWidth)}px`;
    canvas.style.height = `${Math.floor(cssHeight)}px`;

    setCanvasSize({
      cssWidth,
      cssHeight,
      dpr,
    });
  }, []);

  const evaluateTracing = useCallback(() => {
    if (!effectiveItem) {
      return {
        mode: practiceMode,
        passed: false,
        score: 0,
        starThresholds: [41, 46, 60],
        toleranceLabel: "",
      };
    }

    const evaluationInput = {
      item: effectiveItem,
      strokes: strokesRef.current,
      toleranceLevel,
      canvasSize: {
        width: canvasSize.cssWidth,
        height: canvasSize.cssHeight,
        dpr: canvasSize.dpr,
      },
    };

    const result =
      practiceMode === "doodle"
        ? evaluateDoodle(evaluationInput)
        : evaluateWriting(evaluationInput);

    return {
      ...result,
      strokeCount: strokesRef.current.length,
      pointCount: strokesRef.current.reduce(
        (total, stroke) => total + (stroke.points?.length || 0),
        0
      ),
    };
  }, [canvasSize, effectiveItem, practiceMode, toleranceLevel]);

  const getStrokeData = useCallback(() => {
    return {
      canvasSize: {
        width: canvasSize.cssWidth,
        height: canvasSize.cssHeight,
        dpr: canvasSize.dpr,
      },
      strokes: strokesRef.current,
    };
  }, [canvasSize]);

  const startDrawing = useCallback(
    (event) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      const ctx = getCtx();
      const point = getPoint(event);
      if (!canvas || !ctx || !point) return;

      canvas.setPointerCapture?.(event.pointerId);
      const stroke = createStroke(point, brushSize, brushColor, practiceMode, event.pointerType);
      strokesRef.current = [...strokesRef.current, stroke];
      activeStrokeRef.current = stroke;
      redraw();
    },
    [brushColor, brushSize, getCtx, getPoint, practiceMode, redraw]
  );

  const moveDrawing = useCallback(
    (event) => {
      if (!activeStrokeRef.current) return;
      event.preventDefault();
      const point = getPoint(event);
      if (!point) return;

      activeStrokeRef.current.points.push(point);
      redraw();
    },
    [getPoint, redraw]
  );

  const stopDrawing = useCallback(
    (event) => {
      event?.preventDefault?.();
      const canvas = canvasRef.current;
      if (canvas && event?.pointerId != null) {
        canvas.releasePointerCapture?.(event.pointerId);
      }

      activeStrokeRef.current = null;
      setStrokeVersion((value) => value + 1);
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      clearCanvas,
      evaluateTracing,
      getStrokeData,
    }),
    [clearCanvas, evaluateTracing, getStrokeData]
  );

  useEffect(() => {
    resizeCanvas();
    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvas]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    redraw();
    setStrokeVersion((value) => value + 1);
  }, [clearSignal, effectiveItem?.id, practiceMode, redraw]);

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <canvas
        ref={canvasRef}
        className="writing-canvas"
        onPointerDown={startDrawing}
        onPointerMove={moveDrawing}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    </div>
  );
});

export default WritingCanvas;
