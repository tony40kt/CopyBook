import { Capacitor } from "@capacitor/core";
import {
  ActivityAction,
  IntentLauncher,
} from "@capgo/capacitor-intent-launcher";

export async function openTtsSettings() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // Android Settings.ACTION_TTS_SETTINGS
    await IntentLauncher.startActivityAsync({
      action: ActivityAction.TTS_SETTINGS,
    });

    return true;
  } catch (ttsError) {
    console.warn("無法直接打開文字轉語音設定：", ttsError);

    try {
      // 部分廠商 ROM 沒有指定的 TTS Settings Activity，退回系統設定首頁。
      await IntentLauncher.startActivityAsync({
        action: ActivityAction.SETTINGS,
      });

      return true;
    } catch (settingsError) {
      console.error("無法打開系統設定：", settingsError);
      return false;
    }
  }
}