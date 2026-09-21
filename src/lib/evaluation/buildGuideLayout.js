const DEFAULT_INNER_PADDING = 24;

function getLetterSpacingPx(letterSpacing, fontSize) {
  if (!letterSpacing) return 0;
  return Math.max(0, fontSize * letterSpacing);
}

function measureTextWidth(ctx, text, letterSpacingPx) {
  if (!text) return 0;
  const baseWidth = ctx.measureText(text).width;
  const spacingWidth = Math.max(0, text.length - 1) * letterSpacingPx;
  return baseWidth + spacingWidth;
}

export function buildGuideLayout({
  ctx,
  text,
  guide = {},
  mode = "writing",
  width,
  height,
}) {
  const innerPadding = guide.innerPadding || DEFAULT_INNER_PADDING;
  const maxWidth = Math.max(40, width - innerPadding * 2);
  const maxHeight = Math.max(40, height - innerPadding * 2);
  const isWord = (text?.length || 0) > 1;
  const widthRatio = mode === "doodle" ? 0.48 : isWord ? 0.8 : 0.6;
  const heightRatio = mode === "doodle" ? 0.18 : isWord ? 0.32 : 0.58;
  const rawFontSize = Math.min(
    maxHeight * heightRatio,
    maxWidth * widthRatio / Math.max(text.length * 0.62, 1)
  );
  const fontSize = Math.max(
    22,
    Math.floor(rawFontSize * (guide.maxScale ?? 1))
  );
  const letterSpacingPx = getLetterSpacingPx(guide.letterSpacing, fontSize);
  const fontFamily = guide.fontFamily || '"KaiTi", "Noto Sans TC", sans-serif';
  const fontWeight = guide.fontWeight || 700;

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  return {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    letterSpacingPx,
    textWidth: measureTextWidth(ctx, text, letterSpacingPx),
    x: width / 2,
    y: mode === "doodle" ? innerPadding + fontSize * 0.75 : height / 2 + 2,
    width,
    height,
    mode,
  };
}

export function drawGuideText(ctx, layout, { fillStyle = "#000000", alpha = 1 } = {}) {
  if (!ctx || !layout?.text) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillStyle;
  ctx.font = `${layout.fontWeight} ${layout.fontSize}px ${layout.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const { text, x, y, letterSpacingPx } = layout;
  if (!letterSpacingPx || text.length <= 1) {
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  const chars = Array.from(text);
  const totalWidth =
    chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
    (chars.length - 1) * letterSpacingPx;
  let cursorX = x - totalWidth / 2;

  chars.forEach((char) => {
    const charWidth = ctx.measureText(char).width;
    ctx.fillText(char, cursorX + charWidth / 2, y);
    cursorX += charWidth + letterSpacingPx;
  });

  ctx.restore();
}
