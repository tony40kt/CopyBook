let bgm = null;

const STORAGE_KEY = "copybook_bgm_enabled";
const VOLUME_KEY = "copybook_bgm_volume";

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, Number(v)));
}

function ensureAudio() {
  if (!bgm) {
    bgm = new Audio("/audio/bgm-main.mp3");
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = getSavedVolume();
  }
  return bgm;
}

export function getSavedBgmEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true; // ✅ 預設開啟
    return raw === "true";
  } catch {
    return true;
  }
}

export function setSavedBgmEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  } catch {}
}

export function getSavedVolume() {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return 0.3; // ✅ 預設 30%
    return clamp(raw, 0, 1);
  } catch {
    return 0.3;
  }
}

export function setSavedVolume(volume) {
  const v = clamp(volume, 0, 1);
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {}
  if (bgm) bgm.volume = v;
}

export function getCurrentBgmVolume() {
  return bgm ? bgm.volume : getSavedVolume();
}

export function setBgmVolumeImmediate(volume) {
  const v = clamp(volume, 0, 1);
  ensureAudio().volume = v;
}

export async function playBgm() {
  const audio = ensureAudio();
  try {
    await audio.play();
  } catch (err) {
    console.warn("BGM play blocked:", err);
  }
}

export function pauseBgm() {
  if (bgm) bgm.pause();
}