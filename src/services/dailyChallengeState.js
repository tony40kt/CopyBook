const STORAGE_KEY = "copybook_daily_challenge_v1";

/**
 * state:
 * {
 *   "YYYY-MM-DD": { done: boolean, adUnlocked: boolean, stars: number }
 * }
 */

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(next) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getDailyState(dateStr) {
  const state = readState();
  return state[dateStr] || { done: false, adUnlocked: false, stars: 0 };
}

export function setDailyAdUnlocked(dateStr, unlocked = true) {
  const state = readState();
  const prev = state[dateStr] || {};
  state[dateStr] = {
    done: !!prev.done,
    adUnlocked: unlocked ? true : !!prev.adUnlocked,
    stars: typeof prev.stars === "number" ? prev.stars : 0,
  };
  writeState(state);
}

export function markDailyDone(dateStr, stars) {
  const state = readState();
  const prev = state[dateStr] || {};
  state[dateStr] = {
    done: (stars ?? 0) >= 1 ? true : !!prev.done, // ✅ 至少 1⭐ 才算完成
    adUnlocked: !!prev.adUnlocked,
    stars: Math.max(prev.stars || 0, stars || 0),
  };
  writeState(state);
}

export function getAllDailyState() {
  return readState();
}