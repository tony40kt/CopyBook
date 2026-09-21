import { normalizeStrokeData } from "./normalizeStrokeData";
import { resolveEvaluationProfile } from "./profiles";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function evaluateDoodle({
  item,
  strokes = [],
  canvasSize,
  toleranceLevel = "standard",
}) {
  const profile = resolveEvaluationProfile(
    item?.evaluation?.profileId || "doodle-word",
    toleranceLevel
  );
  const summary = normalizeStrokeData(strokes, canvasSize);

  if (!summary.pointCount) {
    return {
      mode: "doodle",
      passed: false,
      score: 0,
      activity: 0,
      spread: 0,
      control: 0,
      passThreshold: profile.passThreshold,
      starThresholds: profile.starThresholds,
      toleranceLabel: profile.toleranceLabel,
      profileId: profile.id,
    };
  }

  const activity = clamp(summary.totalLengthRatio / profile.minLengthRatio, 0, 1);
  const spread = clamp(
    (summary.occupiedCellRatio / profile.minCellCoverage +
      summary.areaRatio / profile.minAreaRatio) /
      2,
    0,
    1
  );
  const centered = clamp(1 - summary.centerDistanceRatio, 0, 1);
  const multiStrokeBonus = clamp(summary.strokeCount / 4, 0, 1);
  const control = clamp((centered * 0.65) + (multiStrokeBonus * 0.35), 0, 1);

  const weightedScore =
    activity * profile.scoringWeights.activity +
    spread * profile.scoringWeights.spread +
    control * profile.scoringWeights.control;

  const score = Math.max(0, Math.min(100, Math.round(weightedScore * 100)));
  const passed =
    score >= profile.passThreshold &&
    summary.totalLengthRatio >= profile.minLengthRatio * 0.45 &&
    summary.occupiedCellRatio >= profile.minCellCoverage * 0.55;

  return {
    mode: "doodle",
    passed,
    score,
    activity,
    spread,
    control,
    passThreshold: profile.passThreshold,
    starThresholds: profile.starThresholds,
    toleranceLabel: profile.toleranceLabel,
    profileId: profile.id,
  };
}
