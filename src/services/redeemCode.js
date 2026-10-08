import { PRODUCT_IDS } from "./billing";
import { unlockColor } from "./entitlements";

const CODE_UNLOCK_COLORS = "COPY-COLOR-2026";
const CODE_UNLOCK_ALL = "COPY-ALL-2026";

const ALL_COLORS = [
  "#111111",
  "#e53935",
  "#fb8c00",
  "#fdd835",
  "#43a047",
  "#1e88e5",
  "#8e24aa",
  "#ec407a",
];

function readState() {
  try {
    const raw = localStorage.getItem("copybook_entitlements_v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(next) {
  localStorage.setItem("copybook_entitlements_v1", JSON.stringify(next));
  window.dispatchEvent(new Event("copybook-entitlements-changed"));
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function unlockAllColorsDirect() {
  ALL_COLORS.forEach((c) => unlockColor(c));

  const state = readState();
  writeState({
    ...state,
    allColors: true,
    unlockedColors: Array.from(
      new Set([...asArray(state.unlockedColors), ...ALL_COLORS])
    ),
  });
}

function unlockAllLevelsDirect() {
  const state = readState();
  const pid = PRODUCT_IDS.PREMIUM_ALL; // e.g. copybook_premium_all

  writeState({
    ...state,

    // 常見旗標
    allContent: true,

    // 三種常見欄位都寫，避免 hasPurchasedProduct 不同版本讀不到
    purchasedProductIds: Array.from(
      new Set([...asArray(state.purchasedProductIds), pid])
    ),
    purchasedProducts: Array.from(
      new Set([...asArray(state.purchasedProducts), pid])
    ),
    purchases: Array.from(
      new Set([...asArray(state.purchases), pid])
    ),
  });
}

export function redeemCode(inputCode) {
  const code = String(inputCode || "").trim().toUpperCase();

  if (!code) return { ok: false, reason: "invalid" };

  if (code === CODE_UNLOCK_COLORS) {
    unlockAllColorsDirect();
    return { ok: true, type: "colors" };
  }

  if (code === CODE_UNLOCK_ALL) {
    unlockAllLevelsDirect();
    return { ok: true, type: "all" };
  }

  return { ok: false, reason: "invalid" };
}