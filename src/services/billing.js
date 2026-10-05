import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { addPurchasedProduct, unlockAllColors } from "./entitlements";

export const PRODUCT_IDS = {
  ALL_COLORS: import.meta.env.VITE_PRODUCT_ALL_COLORS || "copybook_all_colors",
  PREMIUM_ALL: import.meta.env.VITE_PRODUCT_PREMIUM_ALL || "copybook_premium_all",
};

const isNative = Capacitor.isNativePlatform();
let initialized = false;

function normalizeProductIdsFromPurchase(purchase) {
  if (!purchase) return [];
  if (Array.isArray(purchase.productIds)) return purchase.productIds;
  if (Array.isArray(purchase.products)) return purchase.products;
  
  // 增加相容性抓取欄位
  const singleId = purchase.productId || purchase.productIdentifier || purchase.productIdentifierFromStore;
  if (typeof singleId === "string" && singleId) return [singleId];
  
  return [];
}

function isPurchaseCompleted(purchase) {
  if (!purchase) return false;
  
  // 抓取所有可能存放交易狀態的欄位
  const state = purchase.purchaseState ?? purchase.state ?? purchase.transactionState;
  
  // 如果是 Android 原生數字 0 代表 PURCHASED；或者是套件轉出的字串
  if (state === 0 || state === "0" || state === "PURCHASED" || state === "completed" || state === 1 || state === "1") {
    return true;
  }
  
  // 如果是 PENDING (Android 是 2) 則未完成
  if (state === 2 || state === "2" || state === "PENDING") return false;
  
  // 若完全沒有狀態欄位，但能走到這，預設信任套件成功回傳
  return state == null;
}

function markEntitlements(productId) {
  addPurchasedProduct(productId);
  if (productId === PRODUCT_IDS.ALL_COLORS) {
    unlockAllColors();
  }
}

export async function initializeBilling() {
  if (!isNative || initialized) return;

  const support = await NativePurchases.isBillingSupported();
  if (!support?.isBillingSupported) {
    throw new Error("Google Play Billing 不可用");
  }

  initialized = true;
}

export async function purchaseProduct(productId) {
  if (!isNative) {
    throw new Error("僅能在 Android/iOS 原生環境購買");
  }

  await initializeBilling();

  // 1. 發起購買
  const result = await NativePurchases.purchaseProduct({
    productIdentifier: productId,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
  });

  const purchase = result?.transaction || result?.purchase || result;

  // 2. 檢查狀態
  if (!isPurchaseCompleted(purchase)) {
    throw new Error("付款尚未完成（PENDING），暫不解鎖內容。");
  }

  // 🌟【核心修復】3. 必須向 Google Play 發送交易確認 (Acknowledge)
  // 如果不發送，Google 會在幾天後自動退款，且此時無法被系統正確認定解鎖
  try {
    const token = purchase.purchaseToken || purchase.token || result.purchaseToken;
    if (token) {
      await NativePurchases.acknowledgePurchase({
        purchaseToken: token,
        productType: PURCHASE_TYPE.INAPP
      });
      console.log("[IAP] 交易已成功向 Google Play 確認完成 (Acknowledge)");
    }
  } catch (ackError) {
    console.warn("[IAP] 發送交易確認失敗，可能已經確認過或環境不支援，繼續執行解鎖邏輯", ackError);
  }

  // 4. 解析商品 ID 並寫入權益存檔
  const ids = normalizeProductIdsFromPurchase(purchase);
  if (!ids.length) ids.push(productId);

  ids.forEach((id) => markEntitlements(id));

  return { ok: true, productIds: ids, raw: result };
}

export async function restorePurchases() {
  if (!isNative) return { restored: [] };

  await initializeBilling();

  const result = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.INAPP,
  });

  const purchases = result?.purchases || [];
  const restored = [];

  for (const p of purchases) {
    if (!isPurchaseCompleted(p)) continue;
    const ids = normalizeProductIdsFromPurchase(p);
    for (const id of ids) {
      markEntitlements(id);
      restored.push(id);
    }
  }

  return { restored };
}
