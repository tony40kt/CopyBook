function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeStrokeData(strokes = [], canvasSize) {
  const { width = 1, height = 1 } = canvasSize || {};
  const flatPoints = strokes.flatMap((stroke) => stroke.points || []);

  if (!flatPoints.length) {
    return {
      pointCount: 0,
      strokeCount: 0,
      totalLength: 0,
      totalLengthRatio: 0,
      bounds: null,
      areaRatio: 0,
      occupiedCellRatio: 0,
      centerDistanceRatio: 1,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let totalLength = 0;
  const occupiedCells = new Set();
  const columns = 4;
  const rows = 4;

  strokes.forEach((stroke) => {
    const points = stroke.points || [];
    points.forEach((point, index) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);

      const column = clamp(Math.floor((point.x / width) * columns), 0, columns - 1);
      const row = clamp(Math.floor((point.y / height) * rows), 0, rows - 1);
      occupiedCells.add(`${column}:${row}`);

      if (index > 0) {
        const prev = points[index - 1];
        totalLength += Math.hypot(point.x - prev.x, point.y - prev.y);
      }
    });
  });

  const bounds = {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };

  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  const canvasCenterX = width / 2;
  const canvasCenterY = height / 2;
  const maxDistance = Math.hypot(width / 2, height / 2) || 1;

  return {
    pointCount: flatPoints.length,
    strokeCount: strokes.length,
    totalLength,
    totalLengthRatio: totalLength / Math.max(width + height, 1),
    bounds,
    areaRatio: (bounds.width * bounds.height) / Math.max(width * height, 1),
    occupiedCellRatio: occupiedCells.size / (columns * rows),
    centerDistanceRatio:
      Math.hypot(centerX - canvasCenterX, centerY - canvasCenterY) / maxDistance,
  };
}
