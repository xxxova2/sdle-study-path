/**
 * SDLE Study Path - Storage Module
 * Handles localStorage operations with error handling and normalization
 */

const STORAGE_PREFIX = "sdle3_";

let storeWriteWarned = false;

/**
 * Show storage warning to user when localStorage fails
 */
export function showStorageWarn() {
  if (storeWriteWarned) return;
  storeWriteWarned = true;
  try {
    console.warn("sdle: localStorage write failed (quota or private mode)");
    if (document.getElementById("sdle-storage-warn")) return;
    const el = document.createElement("div");
    el.id = "sdle-storage-warn";
    el.setAttribute("role", "alert");
    el.style.cssText =
      "position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;background:#7f1d1d;color:#fff;padding:10px 14px;border-radius:8px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.4)";
    el.textContent =
      "Could not save progress (storage full or private mode). Free space or leave private browsing.";
    document.body.appendChild(el);
  } catch (_) {}
}

/**
 * Check if value is a plain object (not array)
 */
export function isPlainObject(o) {
  return o != null && typeof o === "object" && !Array.isArray(o);
}

/**
 * Convert value to array or return fallback
 */
export function asArray(v, fallback) {
  return Array.isArray(v) ? v : fallback;
}

/**
 * Convert value to object or return fallback
 */
export function asObject(v, fallback) {
  return isPlainObject(v) ? v : fallback;
}

/**
 * Normalize wrongBook array - keep last 500 valid IDs
 */
export function normalizeWrongBook(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((id) => id != null && (typeof id === "string" || typeof id === "number"))
    .slice(-500);
}

/**
 * Normalize stats object with proper defaults
 */
export function normalizeStats(v) {
  const s = asObject(v, null);
  if (!s) return { answered: 0, correct: 0, byTopic: {}, bySubtopic: {} };
  return {
    answered: Number.isFinite(+s.answered) ? +s.answered : 0,
    correct: Number.isFinite(+s.correct) ? +s.correct : 0,
    byTopic: asObject(s.byTopic, {}),
    bySubtopic: asObject(s.bySubtopic, {}),
  };
}

/**
 * Storage API wrapper with error handling
 */
export const store = {
  /**
   * Get value from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Parsed value or default
   */
  get(key, defaultValue) {
    try {
      const v = localStorage.getItem(STORAGE_PREFIX + key);
      return v ? JSON.parse(v) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  /**
   * Set value in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      // QuotaExceededError or private-mode — do not break quiz flow
      try {
        console.warn("sdle store.set failed:", key, e && e.name);
      } catch (_) {}
      showStorageWarn();
      return false;
    }
  },
  
  /**
   * Remove value from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch {
      return false;
    }
  },
  
  /**
   * Clear all sdle-prefixed keys
   * @returns {number} Number of keys cleared
   */
  clearAll() {
    let count = 0;
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        count++;
      });
    } catch {}
    return count;
  }
};

/**
 * Persisted state keys list
 */
export const PERSISTED_KEYS = [
  "day",
  "planLength",
  "stepsDone",
  "dayDone",
  "stats",
  "wrongBook",
  "seenIds",
  "cardKnown",
  "sessionDate",
  "sessionAnswered",
  "planDayVolumeKey",
  "planDayAnswered",
  "dailyGoal",
  "dailyGoalUserOverride",
  "focusMode",
  "examQa",
  "history",
  "planChosen",
  "simpleMode",
  "viewStack",
  "pomoMode",
  "pomoRemaining",
];

/**
 * Get calendar day key (YYYY-MM-DD) for session tracking
 */
export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Short subject line for UI (drop internal codenames after em dash)
 */
export function humanLessonTitle(L) {
  const raw = (L && L.title) || "Today";
  const cut = raw.split(/\s*[—–]\s*/)[0].trim();
  return cut || raw;
}

/**
 * Approximate SDLE domain weights for practice balance
 */
export const BLUEPRINT_WEIGHTS = {
  restorative: 0.4,
  perio: 0.18,
  endo: 0.17,
  oms: 0.15,
  ortho_pedo: 0.1,
};
