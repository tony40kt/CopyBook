import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
} from "@capacitor-community/admob";

const isNative = Capacitor.isNativePlatform();

/**
 * 正式版：
 * .env.production 設 VITE_ADMOB_TESTING=false
 * 開發版：
 * .env.development 設 VITE_ADMOB_TESTING=true
 */
const isTesting = import.meta.env.VITE_ADMOB_TESTING !== "false";

const bannerAdId =
  import.meta.env.VITE_ADMOB_BANNER_ID ||
  "ca-app-pub-3940256099942544/6300978111";

const rewardedAdId =
  import.meta.env.VITE_ADMOB_REWARDED_ID ||
  "ca-app-pub-3940256099942544/5224354917";

let initialized = false;

export async function initializeAds() {
  if (!isNative || initialized) return;

  await AdMob.initialize({
    initializeForTesting: isTesting,
  });

  initialized = true;
}

export async function showHomeBanner() {
  if (!isNative) return;

  await initializeAds();

  await AdMob.showBanner({
    adId: bannerAdId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting,
  });
}

export async function hideHomeBanner() {
  if (!isNative) return;
  await AdMob.hideBanner();
}

export async function removeHomeBanner() {
  if (!isNative) return;
  await AdMob.removeBanner();
}

export async function showRewardedAd() {
  if (!isNative) {
    // 瀏覽器測試時模擬成功
    return { rewarded: true, simulated: true };
  }

  await initializeAds();

  await AdMob.prepareRewardVideoAd({
    adId: rewardedAdId,
    isTesting,
  });

  await AdMob.showRewardVideoAd();

  return { rewarded: true };
}