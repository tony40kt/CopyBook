import { buildGuideLayout, drawGuideText } from "./buildGuideLayout";
import { resolveEvaluationProfile } from "./profiles";

function createCanvas(realWidth, realHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = realWidth;
  canvas.height = realHeight;
  return canvas;
}

function renderStrokes(ctx, strokes, { lineWidthOffset = 0, scale = 1 } = {}) {
  strokes.forEach((stroke) => {
    const points = stroke.points || [];
    if (!points.length) return;

    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1, ((stroke.brushSize || 1) + lineWidthOffset) * scale);

    if (points.length === 1) {
      const point = points[0];
      ctx.beginPath();
      ctx.arc(point.x * scale, point.y * scale, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x * scale, points[0].y * scale);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x * scale, points[index].y * scale);
    }
    ctx.stroke();
    ctx.restore();
  });
}

function dilateCanvas(sourceCanvas, radius) {
  if (radius <= 0) return sourceCanvas;

  const dilatedCanvas = createCanvas(sourceCanvas.width, sourceCanvas.height);
  const ctx = dilatedCanvas.getContext("2d");
  if (!ctx) return sourceCanvas;

  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      if (dx * dx + dy * dy > radius * radius) continue;
      ctx.drawImage(sourceCanvas, dx, dy);
    }
  }

  return dilatedCanvas;
}

export function evaluateWriting({
  item,
  strokes = [],
  canvasSize,
  toleranceLevel = "standard",
}) {
  const { width = 0, height = 0, dpr = 1 } = canvasSize || {};
  if (!width || !height || !strokes.length) {
    const emptyProfile = resolveEvaluationProfile(
      item?.evaluation?.profileId || "writing-char",
      toleranceLevel
    );

    return {
      mode: "writing",
      passed: false,
      score: 0,
      coverage: 0,
      precision: 0,
      containment: 0,
      overflowRatio: 1,
      passThreshold: emptyProfile.passThreshold,
      starThresholds: emptyProfile.starThresholds,
      toleranceLabel: emptyProfile.toleranceLabel,
      profileId: emptyProfile.id,
    };
  }

  const profile = resolveEvaluationProfile(
    item?.evaluation?.profileId || "writing-char",
    toleranceLevel
  );
  const realWidth = Math.max(1, Math.floor(width * dpr));
  const realHeight = Math.max(1, Math.floor(height * dpr));

  const guideCanvas = createCanvas(realWidth, realHeight);
  const guideCtx = guideCanvas.getContext("2d");
  const userCanvas = createCanvas(realWidth, realHeight);
  const userCtx = userCanvas.getContext("2d");
  const userExpandedCanvas = createCanvas(realWidth, realHeight);
  const userExpandedCtx = userExpandedCanvas.getContext("2d");

  if (!guideCtx || !userCtx || !userExpandedCtx) {
    return {
      mode: "writing",
      passed: false,
      score: 0,
      coverage: 0,
      precision: 0,
      containment: 0,
      overflowRatio: 1,
      passThreshold: profile.passThreshold,
      starThresholds: profile.starThresholds,
      toleranceLabel: profile.toleranceLabel,
      profileId: profile.id,
    };
  }

  [guideCtx, userCtx].forEach((ctx) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
  });
  userExpandedCtx.setTransform(1, 0, 0, 1, 0, 0);
  userExpandedCtx.clearRect(0, 0, realWidth, realHeight);

  const layout = buildGuideLayout({
    ctx: guideCtx,
    text: item?.text || "",
    guide: item?.guide,
    mode: "writing",
    width,
    height,
  });

  drawGuideText(guideCtx, layout, { fillStyle: "#000000", alpha: 1 });
  renderStrokes(userCtx, strokes);
  renderStrokes(userExpandedCtx, strokes, {
    lineWidthOffset: profile.toleranceRadius * 2,
    scale: dpr,
  });

  const expandedGuideCanvas = dilateCanvas(guideCanvas, Math.round(profile.toleranceRadius * dpr));

  const guideData = guideCtx.getImageData(0, 0, realWidth, realHeight).data;
  const expandedGuideData = expandedGuideCanvas
    .getContext("2d")
    ?.getImageData(0, 0, realWidth, realHeight).data;
  const userData = userCtx.getImageData(0, 0, realWidth, realHeight).data;
  const userExpandedData = userExpandedCtx.getImageData(0, 0, realWidth, realHeight).data;

  let guidePixels = 0;
  let matchedGuidePixels = 0;
  let userPixels = 0;
  let preciseUserPixels = 0;
  let overflowPixels = 0;

  for (let index = 0; index < guideData.length; index += 4) {
    const guideAlpha = guideData[index + 3];
    const userAlpha = userData[index + 3];
    const userExpandedAlpha = userExpandedData[index + 3];
    const expandedGuideAlpha = expandedGuideData?.[index + 3] || 0;

    if (guideAlpha > 8) {
      guidePixels += 1;
      if (userExpandedAlpha > 8) {
        matchedGuidePixels += 1;
      }
    }

    if (userAlpha > 8) {
      userPixels += 1;
      if (expandedGuideAlpha > 8) {
        preciseUserPixels += 1;
      } else {
        overflowPixels += 1;
      }
    }
  }

  const coverage = guidePixels > 0 ? matchedGuidePixels / guidePixels : 0;
  const precision = userPixels > 0 ? preciseUserPixels / userPixels : 0;
  const overflowRatio = userPixels > 0 ? overflowPixels / userPixels : 1;
  const containment = userPixels > 0 ? 1 - overflowRatio : 0;

  const weightedScore =
    coverage * profile.scoringWeights.coverage +
    precision * profile.scoringWeights.precision +
    containment * profile.scoringWeights.containment;

  const score = Math.max(0, Math.min(100, Math.round(weightedScore * 100)));
  const passed =
    score >= profile.passThreshold &&
    coverage >= profile.minCoverage &&
    precision >= profile.minPrecision &&
    overflowRatio <= profile.maxOverflowRatio;

  return {
    mode: "writing",
    passed,
    score,
    coverage,
    precision,
    containment,
    overflowRatio,
    passThreshold: profile.passThreshold,
    starThresholds: profile.starThresholds,
    toleranceLabel: profile.toleranceLabel,
    profileId: profile.id,
  };
}
