import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";

const RATE_KEY = "copybook_tts_rate";
const VOL_KEY = "copybook_tts_volume";
const ZH_VOICE_KEY = "copybook_tts_zh_voice"; // cantonese | mandarin

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v)));
}

export function getSavedTtsRate() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw === null) return 0.8; // ✅ 預設語速
    return clamp(raw, 0.5, 1.5);
  } catch {
    return 0.8;
  }
}

export function setSavedTtsRate(rate) {
  const v = clamp(rate, 0.5, 1.5);
  try {
    localStorage.setItem(RATE_KEY, String(v));
  } catch {}
  return v;
}

export function getSavedTtsVolume() {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    if (raw === null) return 0.3; // ✅ 預設音量 30%
    return clamp(raw, 0, 1);
  } catch {
    return 0.3;
  }
}

export function setSavedTtsVolume(volume) {
  const v = clamp(volume, 0, 1);
  try {
    localStorage.setItem(VOL_KEY, String(v));
  } catch {}
  return v;
}

export function getSavedZhVoice() {
  try {
    const raw = localStorage.getItem(ZH_VOICE_KEY);
    if (raw === "mandarin" || raw === "cantonese") return raw;
    return "cantonese"; // ✅ 預設粵語
  } catch {
    return "cantonese";
  }
}

export function setSavedZhVoice(voice) {
  const v = voice === "mandarin" ? "mandarin" : "cantonese";
  try {
    localStorage.setItem(ZH_VOICE_KEY, v);
  } catch {}
  return v;
}

export async function isTtsAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await TextToSpeech.stop();
    return true;
  } catch {
    return false;
  }
}

function resolveLang({ text, forceLang, zhVoice }) {
  if (forceLang) return forceLang;
  if (/[A-Za-z]/.test(text || "")) return "en-US";
  return zhVoice === "mandarin" ? "zh-CN" : "yue-HK";
}

export async function speakText(text, options = {}) {
  const content = String(text || "").trim();
  if (!content) return;

  if (!Capacitor.isNativePlatform()) {
    throw new Error("TTS 僅支援原生裝置");
  }

  const lang = resolveLang({
    text: content,
    forceLang: options.lang,
    zhVoice: options.zhVoice || getSavedZhVoice(),
  });

  const rate = options.rate ?? getSavedTtsRate();
  const volume = options.volume ?? getSavedTtsVolume();

  await TextToSpeech.stop().catch(() => {});
  await TextToSpeech.speak({
    text: content,
    lang,
    rate,
    pitch: 1.0,
    volume,
    category: "ambient",
  });
}

export async function stopSpeaking() {
  await TextToSpeech.stop().catch(() => {});
}