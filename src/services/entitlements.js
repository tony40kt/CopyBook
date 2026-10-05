const STORAGE_KEY = "copybook_entitlements_v1";

export const FREE_COLORS = ["#111111", "#e53935"];

const DEFAULT_STATE = {
  allColors: false,
  unlockedColors: [...FREE_COLORS],
  unlockedLevels: [],
  purchasedProducts: [],
};

function cloneDefaultState() {
  return {
    allColors: DEFAULT_STATE.allColors,
    unlockedColors: [...DEFAULT_STATE.unlockedColors],
    unlockedLevels: [],
    purchasedProducts: [],
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return cloneDefaultState();
    }

    const parsed = JSON.parse(raw);

    return {
      ...cloneDefaultState(),
      ...parsed,
      unlockedColors: Array.isArray(parsed.unlockedColors)
        ? parsed.unlockedColors
        : [...FREE_COLORS],
      unlockedLevels: Array.isArray(parsed.unlockedLevels)
        ? parsed.unlockedLevels
        : [],
      purchasedProducts: Array.isArray(parsed.purchasedProducts)
        ? parsed.purchasedProducts
        : [],
    };
  } catch (error) {
    console.warn("讀取解鎖資料失敗：", error);
    return cloneDefaultState();
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("copybook-entitlements-changed"));
  return state;
}

export function getEntitlements() {
  return readState();
}

export function isColorUnlocked(color) {
  const state = readState();

  return (
    state.allColors ||
    state.unlockedColors.includes(color) ||
    FREE_COLORS.includes(color)
  );
}

export function unlockColor(color) {
  const state = readState();

  if (!state.unlockedColors.includes(color)) {
    state.unlockedColors.push(color);
  }

  return writeState(state);
}

export function unlockAllColors() {
  const state = readState();
  state.allColors = true;
  return writeState(state);
}

export function isLevelAdUnlocked(levelId) {
  const state = readState();
  return state.unlockedLevels.includes(levelId);
}

export function unlockLevelByAd(levelId) {
  const state = readState();

  if (!state.unlockedLevels.includes(levelId)) {
    state.unlockedLevels.push(levelId);
  }

  return writeState(state);
}

// 🟢 請將 entitlements.js 裡的 hasPurchasedProduct 改成這樣：
export function hasPurchasedProduct(productId) {
  const state = readState();

  // 這裡直接防呆：如果已購買清單包含了傳入的商品，或者是包含大禮包字串，就放行！
  // 這樣寫最安全，完全不需要 import 任何外部檔案，絕對不引發白屏
  return (
    state.purchasedProducts.includes(productId) ||
    state.purchasedProducts.includes("copybook_premium_all") ||
    state.purchasedProducts.includes(import.meta.env.VITE_PRODUCT_PREMIUM_ALL)
  );
}


export function addPurchasedProduct(productId) {
  const state = readState();

  if (!state.purchasedProducts.includes(productId)) {
    state.purchasedProducts.push(productId);
  }

  if (productId === "copybook_all_colors") {
    state.allColors = true;
  }

  return writeState(state);
}

export function clearEntitlements() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("copybook-entitlements-changed"));
}