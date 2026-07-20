/**
 * SDLE Study Path - State Module
 * Manages application state with persistence
 */

import { 
  store, 
  normalizeStats, 
  normalizeWrongBook, 
  asObject, 
  asArray,
  todayKey 
} from './storage.js';

/**
 * Normalize plan length to valid options
 */
export function normalizePlanLength(length) {
  const valid = [14, 30, 45, 60, 90];
  const num = +length;
  return valid.includes(num) ? num : 30;
}

/**
 * Get initial plan length (30d default for new installs)
 */
export function getInitialPlanLength() {
  return normalizePlanLength(store.get("planLength", 30));
}

/**
 * Get initial day number
 */
export function getInitialDay() {
  const rawDay = +store.get("day", 1);
  return Number.isFinite(rawDay) && rawDay >= 1 ? rawDay : 1;
}

/**
 * Get initial daily goal
 */
export function getInitialDailyGoal() {
  const rawGoal = +store.get("dailyGoal", 150);
  return Number.isFinite(rawGoal) && rawGoal > 0 ? rawGoal : 150;
}

/**
 * Create initial state object
 */
export function createInitialState() {
  return {
    view: "today",
    day: getInitialDay(),
    planLength: getInitialPlanLength(),
    stepsDone: asObject(store.get("stepsDone", {}), {}),
    dayDone: asObject(store.get("dayDone", {}), {}),
    stats: normalizeStats(store.get("stats", { answered: 0, correct: 0, byTopic: {} })),
    wrongBook: normalizeWrongBook(store.get("wrongBook", [])),
    seenIds: asObject(store.get("seenIds", {}), {}),
    cardIx: 0,
    cardKnown: asObject(store.get("cardKnown", {}), {}),
    quiz: null,
    focusMode: false,
    dailyGoal: getInitialDailyGoal(),
    sessionAnswered: Math.max(0, +store.get("sessionAnswered", 0) || 0),
    sessionDate: store.get("sessionDate", "") || "",
    planDayVolumeKey: store.get("planDayVolumeKey", "") || "",
    planDayAnswered: Math.max(0, +store.get("planDayAnswered", 0) || 0),
    examQa: asObject(store.get("examQa", {}), {}),
    history: asArray(store.get("history", []), []),
  };
}

/**
 * Ensure session day is current (roll over at midnight)
 */
export function ensureSessionDay(state) {
  const key = todayKey();
  if (state.sessionDate === key) return;
  state.sessionDate = key;
  state.sessionAnswered = 0;
  store.set("sessionDate", state.sessionDate);
  store.set("sessionAnswered", 0);
}

/**
 * Generate plan day volume key
 */
export function planDayVolumeKeyOf(planLength, day) {
  return `${planLength}:${day}`;
}

/**
 * Update plan day tracking when day changes
 */
export function updatePlanDayTracking(state, newDay, newPlanLength) {
  const newKey = planDayVolumeKeyOf(newPlanLength, newDay);
  if (state.planDayVolumeKey !== newKey) {
    state.planDayVolumeKey = newKey;
    state.planDayAnswered = 0;
    store.set("planDayVolumeKey", newKey);
    store.set("planDayAnswered", 0);
  }
}

/**
 * Save state to localStorage
 */
export function saveState(state, keys) {
  keys.forEach(key => {
    if (key in state) {
      store.set(key, state[key]);
    }
  });
}

/**
 * Simple mode detection
 */
export function isSimpleMode() {
  return store.get("simpleMode", true) !== false;
}

/**
 * Set simple mode
 */
export function setSimpleMode(on) {
  store.set("simpleMode", !!on);
}

/**
 * Apply chrome mode to DOM
 */
export function applyChromeMode() {
  const simple = isSimpleMode();
  try {
    document.body.classList.toggle("simple-ui", simple);
  } catch (_) {}
  
  const stats = document.getElementById("top-stats");
  const pomo = document.getElementById("pomo-bar");
  if (stats) stats.hidden = !!simple;
  if (pomo) pomo.hidden = !!simple;
}
