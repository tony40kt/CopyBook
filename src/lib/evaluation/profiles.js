export const TOLERANCE_OPTIONS = [
  { value: "strict", label: "嚴格", toleranceRadius: 4, scoreBias: -4 },
  { value: "standard", label: "標準", toleranceRadius: 9, scoreBias: 0 },
  { value: "relaxed", label: "寬鬆", toleranceRadius: 15, scoreBias: 6 },
];

const TOLERANCE_MAP = Object.fromEntries(
  TOLERANCE_OPTIONS.map((option) => [option.value, option])
);

const BASE_PROFILES = {
  "writing-char": {
    id: "writing-char",
    mode: "writing",
    unit: "char",
    passThreshold: 41,
    starThresholds: [41, 46, 60],
    minCoverage: 0.3,
    minPrecision: 0.3,
    maxOverflowRatio: 0.68,
    scoringWeights: {
      coverage: 0.48,
      precision: 0.32,
      containment: 0.2,
    },
  },
  "writing-word": {
    id: "writing-word",
    mode: "writing",
    unit: "word",
    passThreshold: 42,
    starThresholds: [42, 50, 64],
    minCoverage: 0.28,
    minPrecision: 0.28,
    maxOverflowRatio: 0.72,
    scoringWeights: {
      coverage: 0.46,
      precision: 0.29,
      containment: 0.25,
    },
  },
  "doodle-char": {
    id: "doodle-char",
    mode: "doodle",
    unit: "char",
    passThreshold: 35,
    starThresholds: [35, 48, 64],
    minLengthRatio: 0.75,
    minCellCoverage: 0.16,
    minAreaRatio: 0.05,
    scoringWeights: {
      activity: 0.4,
      spread: 0.32,
      control: 0.28,
    },
  },
  "doodle-word": {
    id: "doodle-word",
    mode: "doodle",
    unit: "word",
    passThreshold: 35,
    starThresholds: [35, 48, 64],
    minLengthRatio: 0.85,
    minCellCoverage: 0.18,
    minAreaRatio: 0.06,
    scoringWeights: {
      activity: 0.38,
      spread: 0.34,
      control: 0.28,
    },
  },
};

export function getToleranceOption(level = "standard") {
  return TOLERANCE_MAP[level] || TOLERANCE_MAP.standard;
}

export function getProfileId({ mode = "writing", unit = "char" } = {}) {
  return `${mode}-${unit}`;
}

export function resolveEvaluationProfile(profileId, toleranceLevel = "standard") {
  const baseProfile = BASE_PROFILES[profileId] || BASE_PROFILES["writing-char"];
  const tolerance = getToleranceOption(toleranceLevel);
  const scoreBias = tolerance.scoreBias || 0;

  return {
    ...baseProfile,
    toleranceLevel: tolerance.value,
    toleranceLabel: tolerance.label,
    toleranceRadius: tolerance.toleranceRadius,
    passThreshold: Math.max(20, baseProfile.passThreshold - scoreBias),
    starThresholds: baseProfile.starThresholds.map((threshold) =>
      Math.max(20, threshold - scoreBias)
    ),
  };
}

export function scoreToStars(score, thresholds = [41, 46, 60]) {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
