/* SDLE Study Path — simple step-by-step */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");

  let storeWriteWarned = false;
  function showStorageWarn() {
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

  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("sdle3_" + k);
        return v ? JSON.parse(v) : d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("sdle3_" + k, JSON.stringify(v));
        return true;
      } catch (e) {
        // QuotaExceededError or private-mode — do not break quiz flow
        try {
          console.warn("sdle store.set failed:", k, e && e.name);
        } catch (_) {}
        showStorageWarn();
        return false;
      }
    },
  };

  function isPlainObject(o) {
    return o != null && typeof o === "object" && !Array.isArray(o);
  }
  function asArray(v, fallback) {
    return Array.isArray(v) ? v : fallback;
  }
  function asObject(v, fallback) {
    return isPlainObject(v) ? v : fallback;
  }
  function normalizeWrongBook(v) {
    if (!Array.isArray(v)) return [];
    return v
      .filter((id) => id != null && (typeof id === "string" || typeof id === "number"))
      .slice(-500);
  }
  function normalizeStats(v) {
    const s = asObject(v, null);
    if (!s) return { answered: 0, correct: 0, byTopic: {}, bySubtopic: {} };
    return {
      answered: Number.isFinite(+s.answered) ? +s.answered : 0,
      correct: Number.isFinite(+s.correct) ? +s.correct : 0,
      byTopic: asObject(s.byTopic, {}),
      bySubtopic: asObject(s.bySubtopic, {}),
    };
  }

  /** Approximate SDLE domain weights for practice balance (not an official SCFHS score). */
  const BLUEPRINT_WEIGHTS = {
    restorative: 0.4,
    perio: 0.18,
    endo: 0.17,
    oms: 0.15,
    ortho_pedo: 0.1,
  };

  const PERSISTED_KEYS = [
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

  /** Default ON: fewer tabs + one practice path. Coach mode = full chrome. */
  function isSimpleMode() {
    return store.get("simpleMode", true) !== false;
  }
  function setSimpleMode(on) {
    store.set("simpleMode", !!on);
    applyChromeMode();
    paintMainNav();
    render();
  }

  /** Simple = calm chrome (no cockpit). Coach = full timer + stats. */
  function applyChromeMode() {
    const simple = isSimpleMode();
    try {
      document.body.classList.toggle("simple-ui", simple);
    } catch (_) {}
    const stats = $("#top-stats");
    const pomo = $("#pomo-bar");
    if (stats) stats.hidden = !!simple;
    if (pomo) pomo.hidden = !!simple;
  }

  /** Short subject line for UI (drop internal codenames after em dash). */
  function humanLessonTitle(L) {
    const raw = (L && L.title) || "Today";
    const cut = raw.split(/\s*[—–]\s*/)[0].trim();
    return cut || raw;
  }

  /** Local calendar day key (YYYY-MM-DD) for "Today Q" rollover. */
  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /* New installs default 30d (research: good default). Existing localStorage keeps prior length. */
  const rawPlan =
    typeof window.normalizePlanLength === "function"
      ? window.normalizePlanLength(store.get("planLength", 30))
      : [14, 30, 45, 60, 90].indexOf(+store.get("planLength", 30)) >= 0
        ? +store.get("planLength", 30)
        : 30;
  const rawDay = +store.get("day", 1);
  const rawGoal = +store.get("dailyGoal", 150);

  const state = {
    view: "today",
    day: Number.isFinite(rawDay) && rawDay >= 1 ? rawDay : 1,
    /** Calendar track: 14 | 30 | 45 | 60 | 90. Content still from 14 LESSONS. */
    planLength: rawPlan,
    stepsDone: asObject(store.get("stepsDone", {}), {}), // { "1-read": true, ... }
    dayDone: asObject(store.get("dayDone", {}), {}),
    stats: normalizeStats(store.get("stats", { answered: 0, correct: 0, byTopic: {} })),
    wrongBook: normalizeWrongBook(store.get("wrongBook", [])),
    /** Question ids already answered (any mode) — powers Unseen packs */
    seenIds: asObject(store.get("seenIds", {}), {}),
    cardIx: 0,
    cardKnown: asObject(store.get("cardKnown", {}), {}),
    quiz: null,
    // Loaded after focusModeCssSafe migration at init
    focusMode: false,
    dailyGoal: Number.isFinite(rawGoal) && rawGoal > 0 ? rawGoal : 150,
    /** MCQs answered on this calendar day (resets at local midnight). Top-bar "Today Q". */
    sessionAnswered: Math.max(0, +store.get("sessionAnswered", 0) || 0),
    sessionDate: store.get("sessionDate", "") || "",
    /**
     * MCQs on the current plan day (planLength:day). Day-complete / next-day gates use this
     * so volume on Day 1 does not auto-satisfy Day 2 the same calendar day.
     */
    planDayVolumeKey: store.get("planDayVolumeKey", "") || "",
    planDayAnswered: Math.max(0, +store.get("planDayAnswered", 0) || 0),
    /** In-lesson Exam Q&A picks: { [data-id]: { choice: 0-3, ok: bool } } */
    examQa: asObject(store.get("examQa", {}), {}),
    /** Recent quiz sessions: { ts, mode, label, topic, total, correct, pct, sec } */
    history: asArray(store.get("history", []), []),
  };

  /** Roll "Today Q" when the local calendar day changes. */
  function ensureSessionDay() {
    const key = todayKey();
    if (state.sessionDate === key) return;
    state.sessionDate = key;
    state.sessionAnswered = 0;
    store.set("sessionDate", state.sessionDate);
    store.set("sessionAnswered", 0);
  }

  function planDayVolumeKeyOf() {
    return String(state.planLength) + ":" + String(state.day);
  }

  /** Reset plan-day volume when calendar plan day (or track length) changes. */
  function ensurePlanDayVolume() {
    const key = planDayVolumeKeyOf();
    if (state.planDayVolumeKey === key) return;
    state.planDayVolumeKey = key;
    state.planDayAnswered = 0;
  }

  /** Count one MCQ toward calendar "Today Q" and plan-day day-gate volume. */
  function bumpVolume() {
    ensureSessionDay();
    ensurePlanDayVolume();
    state.sessionAnswered = (state.sessionAnswered || 0) + 1;
    state.planDayAnswered = (state.planDayAnswered || 0) + 1;
  }

  ensureSessionDay();
  ensurePlanDayVolume();

  let timer = null;
  let pomoTimer = null;
  let quizKeyHandler = null;
  let cardKeyHandler = null;
  /** In-app back stack (tabs + overlays). Never drops content — only navigation memory. */
  const TAB_VIEW_SET = new Set([
    "today",
    "days",
    "pass",
    "always",
    "practice",
    "mcqs",
    "progress",
    "feedback",
    "more",
  ]);
  let viewStack = asArray(store.get("viewStack", []), []).filter(
    (v) => typeof v === "string" && (TAB_VIEW_SET.has(v) || v === "quiz" || v === "cards")
  );

  function defaultFocusSec() {
    const fm =
      typeof window.focusMinutes === "function"
        ? window.focusMinutes(state.planLength)
        : 45;
    return Math.max(15, +fm || 45) * 60;
  }

  const pomo = {
    mode: store.get("pomoMode", "work"), // work | break
    remaining: store.get("pomoRemaining", null),
    running: false,
    workSec: defaultFocusSec(),
    breakSec: 5 * 60,
  };
  if (pomo.remaining == null || pomo.remaining <= 0) {
    pomo.remaining = pomo.workSec;
  }

  function save() {
    ensurePlanDayVolume();
    if (Array.isArray(state.wrongBook) && state.wrongBook.length > 500) {
      state.wrongBook = state.wrongBook.slice(-500);
    }
    store.set("day", state.day);
    store.set("planLength", state.planLength);
    store.set("stepsDone", state.stepsDone);
    store.set("dayDone", state.dayDone);
    store.set("stats", state.stats);
    store.set("wrongBook", state.wrongBook);
    store.set("seenIds", state.seenIds);
    store.set("cardKnown", state.cardKnown);
    store.set("sessionDate", state.sessionDate || todayKey());
    store.set("sessionAnswered", state.sessionAnswered);
    store.set("planDayVolumeKey", state.planDayVolumeKey || planDayVolumeKeyOf());
    store.set("planDayAnswered", state.planDayAnswered || 0);
    store.set("dailyGoal", state.dailyGoal);
    store.set("focusMode", state.focusMode);
    store.set("examQa", state.examQa);
    store.set("history", state.history);
    updateTop();
  }

  function maxDay() {
    if (typeof window.maxPlanDay === "function") return window.maxPlanDay(state.planLength);
    const n = +state.planLength;
    return [14, 30, 45, 60, 90].indexOf(n) >= 0 ? n : 30;
  }

  function clampDay() {
    const m = maxDay();
    if (state.day > m) state.day = m;
    if (state.day < 1) state.day = 1;
  }

  function trackMeta() {
    if (typeof window.planDayMeta === "function") {
      return window.planDayMeta(state.planLength, state.day) || {};
    }
    return { day: state.day, lessonDay: Math.min(state.day, 14), mode: "learn", phase: "", dailyGoal: 150 };
  }

  function setPlanLength(n, opts) {
    const force = !!(opts && opts.force);
    const confirmPick = !!(opts && opts.confirm);
    const len =
      typeof window.normalizePlanLength === "function"
        ? window.normalizePlanLength(n)
        : [14, 30, 45, 60, 90].indexOf(+n) >= 0
          ? +n
          : 30;
    if (confirmPick) {
      store.set("planChosen", true);
      store.set("planPickedExplicit", true);
    }
    // Same track, no force: nothing to do (except confirm already saved above)
    if (state.planLength === len && !force) {
      if (confirmPick) {
        const metaSame = trackMeta();
        if (metaSame.dailyGoal && !store.get("dailyGoalUserOverride", false)) {
          state.dailyGoal = metaSame.dailyGoal;
        }
        syncPomoFromPlan({ force: true });
        save();
        render();
      }
      return;
    }
    state.planLength = len;
    clampDay();
    ensurePlanDayVolume();
    // Switching plan re-syncs goal + timer from track (not hard-coded 150/45)
    store.set("dailyGoalUserOverride", false);
    const meta = trackMeta();
    if (meta.dailyGoal) state.dailyGoal = meta.dailyGoal;
    syncPomoFromPlan({ force: true });
    save();
    render();
  }

  /** Plan options with live hours/focus for Day 1 learn (so pickers never look hard-coded). */
  function planOptionsMeta() {
    return [
      { n: 14, title: "14 days", short: "14d blitz" },
      { n: 30, title: "30 days", short: "30d spaced" },
      { n: 45, title: "45 days", short: "45d" },
      { n: 60, title: "2 months", short: "2 mo" },
      { n: 90, title: "3 months", short: "3 mo" },
    ].map((o) => {
      const learnH =
        typeof window.dayHours === "function" ? window.dayHours(o.n, "learn") : o.n <= 14 ? 8 : 3;
      const focus =
        typeof window.focusMinutes === "function" ? window.focusMinutes(o.n) : 45;
      const goal =
        typeof window.planDayMeta === "function"
          ? (window.planDayMeta(o.n, 1) || {}).dailyGoal || 80
          : 80;
      return {
        ...o,
        learnH,
        focus,
        goal,
        sub: `~${learnH}h learn days · ${focus} min focus · Day1 goal ~${goal}Q`,
        desc:
          o.n === 14
            ? "Full engine days. Same 14 lessons, max hours."
            : o.n === 30
              ? "Learn + volume + review. Good default."
              : o.n === 45
                ? "Extra review on resto / perio / prosthesis."
                : o.n === 60
                  ? "Notebook pace. Score-makers first."
                  : "Calm full map. Short focus blocks.",
      };
    });
  }

  /** Live schedule for current calendar day (hours + ordered timed steps). */
  function currentSchedule() {
    const meta = trackMeta();
    if (meta.schedule) return meta.schedule;
    if (typeof window.daySchedule === "function") {
      return window.daySchedule(
        state.planLength,
        meta.mode || "learn",
        meta.dailyGoal || state.dailyGoal,
        meta.note || ""
      );
    }
    return {
      totalHours: 4,
      hoursLabel: "4 h",
      focusMinutes: 45,
      howToRead: "Read the open step, write hinges, then solve.",
      steps: [],
      mode: meta.mode || "learn",
      dailyGoal: meta.dailyGoal || state.dailyGoal,
    };
  }

  /**
   * Sync focus timer work block to plan length (and optional day focusMinutes).
   * Does not interrupt a running timer unless force + not running is already handled.
   */
  function syncPomoFromPlan({ force = false } = {}) {
    const sch = currentSchedule();
    const focusMin = sch.focusMinutes || (typeof window.focusMinutes === "function" ? window.focusMinutes(state.planLength) : 45);
    const nextWork = Math.max(15, +focusMin || 45) * 60;
    pomo.workSec = nextWork;
    if (pomo.running && !force) return;
    if (force || pomo.mode === "work") {
      if (!pomo.running) {
        pomo.mode = "work";
        pomo.remaining = nextWork;
        store.set("pomoMode", pomo.mode);
        store.set("pomoRemaining", pomo.remaining);
      }
    }
    paintPomoBar();
  }

  function saveViewStack() {
    try {
      store.set("viewStack", viewStack.slice(-24));
    } catch (_) {}
  }

  /**
   * Navigate with back-stack. push=true records current view before leaving.
   * Overlays (quiz/cards) push the tab they came from.
   */
  function navigateTo(view, { push = true, replace = false } = {}) {
    if (!view) return false;
    const from = state.view;
    if (from === view && !replace) {
      setActiveNav(TAB_VIEWS.includes(view) ? view : from);
      render();
      return true;
    }
    // Leaving quiz/cards needs clean leave
    if (from === "quiz" || from === "cards") {
      const ok = leaveQuizOrCards({ nextView: null, abandon: true, confirmTimed: true });
      if (!ok) return false;
      state.quiz = null;
    }
    if (push && from && from !== view) {
      // Don't stack pure re-renders of same tab chain noise
      if (viewStack[viewStack.length - 1] !== from) {
        viewStack.push(from);
        if (viewStack.length > 24) viewStack = viewStack.slice(-24);
        saveViewStack();
      }
    }
    if (replace) {
      // no push already handled
    }
    state.view = view;
    setActiveNav(TAB_VIEWS.includes(view) ? view : viewStack[viewStack.length - 1] || "today");
    render();
    return true;
  }

  function goBack() {
    // Prefer quiz/cards returnView if mid-session
    if (state.view === "quiz" && state.quiz) {
      // Peek only — do not mutate stack until leave is confirmed (timer confirm cancel)
      let back = state.quiz.returnView;
      if (!back) back = viewStack[viewStack.length - 1] || "today";
      const ok = leaveQuizOrCards({ nextView: back, abandon: true, confirmTimed: true });
      if (!ok) return;
      if (viewStack[viewStack.length - 1] === back) viewStack.pop();
      saveViewStack();
      return;
    }
    if (state.view === "cards") {
      let back = viewStack[viewStack.length - 1] || "today";
      if (back === "cards") back = viewStack[viewStack.length - 2] || "today";
      const ok = leaveQuizOrCards({ nextView: back, abandon: true, confirmTimed: false });
      if (!ok) return;
      if (viewStack[viewStack.length - 1] === "cards") viewStack.pop();
      if (viewStack[viewStack.length - 1] === back) viewStack.pop();
      saveViewStack();
      return;
    }
    let prev = viewStack.pop();
    saveViewStack();
    while (prev && (prev === state.view || prev === "quiz" || prev === "cards")) {
      prev = viewStack.pop();
      saveViewStack();
    }
    if (!prev) prev = "today";
    state.view = prev;
    setActiveNav(TAB_VIEWS.includes(prev) ? prev : "today");
    render();
  }

  function backBarHtml(label) {
    const can = viewStack.length > 0 || state.view === "quiz" || state.view === "cards";
    const text = label || (can ? "← Back" : "← Today");
    return `<div class="back-bar" role="navigation" aria-label="Back">
      <button type="button" class="btn ghost sm" id="app-back">${escapeHtml(text)}</button>
      <span class="back-bar-hint muted">${can ? "Previous screen" : "Home path"}</span>
    </div>`;
  }

  function bindBackBar() {
    const b = $("#app-back");
    if (b) b.onclick = () => goBack();
  }

  function lessonCardDeck(L) {
    const L0 = L || lesson();
    const d = (L0 && L0.cardDeck) || "";
    if (d && d !== "always") return d;
    const t = String((L0 && L0.quizTopic) || "").split(",")[0].trim();
    if (t === "operative" || t === "restorative") return "restorative";
    if (["perio", "endo", "oms", "ethics", "ortho_pedo"].includes(t)) return t;
    if (t === "pedo" || t === "ortho") return "ortho_pedo";
    /* Prefer enriched bank, not the old 150-card "always" deck alone */
    return "all";
  }

  function openCards(deck) {
    state._cardDeck = deck || lessonCardDeck();
    state.cardIx = 0;
    state._cardPoolKey = ""; /* force reshuffle */
    /* rebuild so wrong-book + notes enrichment stay current */
    window.__FLASHCARDS_ENRICHED = false;
    navigateTo("cards", { push: true });
  }

  function openPracticePane(pane) {
    state.practicePane = pane || "mcqs";
    navigateTo("practice", { push: true });
  }

  /** Student pass-readiness (practice ≥80% — not an exam guarantee). */
  function passReadiness() {
    const s = state.stats || {};
    const pct = s.answered ? Math.round((100 * s.correct) / s.answered) : null;
    const m = maxDay();
    const daysDone = Object.keys(state.dayDone || {}).filter((k) => {
      const d = +k;
      return state.dayDone[k] && d >= 1 && d <= m;
    }).length;
    const wrongN = (state.wrongBook || []).length;
    const answered = s.answered || 0;
    const weak = typeof weakTopicKeys === "function" ? weakTopicKeys(3) : [];
    const gates = [
      {
        id: "volume",
        ok: answered >= 400,
        label: `Volume: ${answered} answered (need ≥400)`,
      },
      {
        id: "acc",
        ok: pct != null && pct >= 80 && answered >= 100,
        label:
          pct == null
            ? "Accuracy: no data yet (need ≥80% on ≥100Q)"
            : `Accuracy: ${pct}% ${pct >= 80 && answered >= 100 ? "✓" : "(need ≥80% on ≥100Q)"}`,
      },
      {
        id: "wrong",
        ok: wrongN <= 40 || (answered >= 200 && wrongN / Math.max(answered, 1) < 0.15),
        label: `Wrong book: ${wrongN} open (target ≤40 or <15% of answers)`,
      },
      {
        id: "days",
        ok: daysDone >= Math.ceil(m * 0.6),
        label: `Days marked done: ${daysDone}/${m} (target ≥60% of track)`,
      },
      {
        id: "weak",
        ok: weak.length === 0 || answered < 50,
        label:
          answered < 50
            ? "Weak topics: answer more to rank"
            : `Weak focus: ${weak.join(", ") || "none"}`,
      },
    ];
    const okN = gates.filter((g) => g.ok).length;
    const score = Math.round((100 * okN) / gates.length);
    const blueprint = blueprintWeightedScore();
    return {
      pct,
      wrongN,
      daysDone,
      answered,
      weak,
      gates,
      score,
      ready: okN >= 4 && (pct || 0) >= 80,
      blueprint,
    };
  }

  /**
   * Weighted practice accuracy by approximate exam domain mix.
   * Requires ≥20 answered per included topic. Not a predicted SCFHS score.
   */
  function blueprintWeightedScore() {
    let score = 0;
    let totalWeight = 0;
    const parts = [];
    for (const [topic, w] of Object.entries(BLUEPRINT_WEIGHTS)) {
      const x = (state.stats.byTopic && state.stats.byTopic[topic]) || {};
      const a = x.a || 0;
      const c = x.c || 0;
      if (a >= 20) {
        const p = c / a;
        score += p * w;
        totalWeight += w;
        parts.push({ topic, w, a, c, pct: Math.round(100 * p) });
      }
    }
    if (totalWeight <= 0) return null;
    return {
      pct: Math.round((score / totalWeight) * 100),
      coveredWeight: Math.round(totalWeight * 100),
      parts,
    };
  }

  /**
   * One data-driven next action — wrong book first, else highest blueprint gap.
   * Never removes content; only suggests.
   */
  function nextBestAction() {
    const wrongN = (state.wrongBook || []).length;
    if (wrongN >= 15) {
      return {
        topic: "wrong",
        n: Math.min(50, wrongN),
        title: "Clear wrong book first",
        detail: `${wrongN} open misses. Empty these before new volume — free points stay open on Always tab.`,
        mode: "learn",
      };
    }
    const wrongByTopic = {};
    (state.wrongBook || []).forEach((id) => {
      const q = allQ().find((x) => x && x.id === id);
      if (q && q.topic) wrongByTopic[q.topic] = (wrongByTopic[q.topic] || 0) + 1;
    });
    let best = null;
    for (const [topic, w] of Object.entries(BLUEPRINT_WEIGHTS)) {
      const x = (state.stats.byTopic && state.stats.byTopic[topic]) || {};
      const a = x.a || 0;
      const c = x.c || 0;
      const acc = a >= 5 ? c / a : 0.5;
      const bias = 1 + Math.min(1, (wrongByTopic[topic] || 0) / 20);
      const priority = (1 - acc) * w * bias * (a < 20 ? 1.25 : 1);
      if (!best || priority > best.priority) {
        best = {
          topic,
          n: 50,
          title: `Work on ${topic}`,
          detail:
            a < 5
              ? `~${Math.round(w * 100)}% of exam weight · almost no practice yet (${a}Q).`
              : `~${Math.round(w * 100)}% of exam weight · you are at ${Math.round(acc * 100)}% on ${a}Q` +
                (wrongByTopic[topic] ? ` · ${wrongByTopic[topic]} in wrong book` : "") +
                ".",
          mode: "learn",
          priority,
        };
      }
    }
    if (!best) {
      return {
        topic: "always_src",
        n: 25,
        title: "Warm free points",
        detail: "Build a few answers, then re-open Progress for a topic pick.",
        mode: "learn",
      };
    }
    return best;
  }

  function nextBestActionHtml() {
    const nb = nextBestAction();
    const label =
      nb.topic === "wrong"
        ? "Wrong book"
        : nb.topic === "always_src"
          ? "Free points"
          : nb.topic;
    return `<div class="next-best alert" role="region" aria-label="Next best study action">
      <strong>Next best:</strong> ${escapeHtml(nb.title)}
      <p class="muted" style="margin:6px 0 10px">${escapeHtml(nb.detail)}</p>
      <div class="volume-grid">
        ${volBtn(nb.topic, nb.n, label, "success")}
        ${nb.topic !== "wrong" ? volBtn("wrong", 25, "Wrong 25", "ghost") : ""}
        ${volBtn("weak", 50, "Weak pack", "ghost")}
      </div>
    </div>`;
  }

  function passReadinessHtml(opts) {
    opts = opts || {};
    const r = passReadiness();
    const compact = !!opts.compact;
    const tone = r.ready ? "ready-ok" : r.score >= 50 ? "ready-mid" : "ready-low";
    const gateLis = r.gates
      .map(
        (g) =>
          `<li class="${g.ok ? "gate-ok" : "gate-miss"}">${g.ok ? "✓" : "○"} ${escapeHtml(g.label)}</li>`
      )
      .join("");
    const bp = r.blueprint;
    const bpLine =
      bp == null
        ? "Weighted practice: need ≥20Q on restorative/perio/endo/OMS/ortho-pedo"
        : `Weighted practice accuracy ~${bp.pct}% (covers ~${bp.coveredWeight}% of blueprint weights — not an official score)`;
    if (compact) {
      return `<div class="pass-ready ${tone}" title="Practice readiness, not exam guarantee">
        <strong>Practice readiness ${r.score}%</strong>
        · ${r.pct != null ? r.pct + "%" : "—"} acc · wrong ${r.wrongN}
        · ${r.ready ? "on track for ≥80% practice" : "keep wrong-book + volume"}
        <div class="muted" style="margin-top:4px">${escapeHtml(bpLine)}</div>
      </div>`;
    }
    return `<div class="pass-ready-card ${tone}">
      <div class="pass-ready-head">
        <strong>Am I ready? (practice ≥80%)</strong>
        <span class="badge ${r.ready ? "green" : "yellow"}">${r.score}%</span>
      </div>
      <p class="muted">This is <em>in-app practice readiness</em> — SCFHS pass is scaled ~542/800. Honest gates only.</p>
      <p class="muted"><strong>${escapeHtml(bpLine)}</strong></p>
      <ul class="pass-ready-gates">${gateLis}</ul>
      <div class="volume-grid" style="margin-top:8px">
        ${volBtn("wrong", 50, "Wrong book", "ghost")}
        ${volBtn("weak", 100, "Weak pack", "")}
        ${volBtn("unseen", 100, "Unseen", "")}
        ${volBtn("always_src", 50, "Free points", "")}
      </div>
    </div>`;
  }

  /** Mode coach: what a stressed student should do first today. */
  function modeCoachHtml(L) {
    const meta = trackMeta();
    const mode = (meta.mode || "learn").toLowerCase();
    const goal = meta.dailyGoal || state.dailyGoal || 150;
    const wrongN = (state.wrongBook || []).length;
    const playbooks = {
      learn: {
        title: "LEARN day — depth first",
        steps: [
          "Read blocks A→D in Step 1 (do not open random PDFs)",
          "Watch only listed videos",
          "Cards 10–15 min",
          `Quiz learn mode → hit ≥${goal}Q; write every miss in wrong book`,
        ],
        cta: "Start with Read → then Block 1 quiz",
      },
      volume: {
        title: "VOLUME day — MCQ mass, light re-read",
        steps: [
          "Skip full re-read unless you are cold on the topic",
          `Do quiz blocks + volume ladders → ≥${goal}Q`,
          "Show answer only when unsure; write misses",
          wrongN ? `Empty wrong book first (${wrongN} open)` : "Keep wrong book near zero",
        ],
        cta: "Jump to Quiz volume — protect time",
      },
      review: {
        title: "REVIEW day — wrong book + weak only",
        steps: [
          wrongN ? `Wrong book first (${wrongN} items)` : "Wrong book empty — run Weak pack",
          "Weak pack on lowest topics (Progress table)",
          "Re-read only bold lines from weak days — not whole textbooks",
          "Free points 25 if ethics/med weak",
        ],
        cta: "Wrong book → Weak pack → stop when green",
      },
      mock: {
        title: "MOCK day — timed sim",
        steps: [
          "Phone out · water · exam pace (~72s/Q)",
          "Warm free points 25 max, then full timed mock",
          "No new theory mid-mock",
          "After: every miss → one-line hinge in wrong book",
        ],
        cta: "Warm 25 FP → timed mock → review",
      },
      light: {
        title: "LIGHT day — protect the brain",
        steps: [
          "Always-comes out loud (20 rules)",
          "Optional ≤50 free-point MCQs — stop if anxiety spikes",
          "Logistics: ID, Mumaris, route, sleep ≥7h",
          "No new banks · no 200Q marathon",
        ],
        cta: "Always-comes + sleep — you are done early",
      },
    };
    const pb = playbooks[mode] || playbooks.learn;
    const sch = currentSchedule();
    const hrs = sch.hoursLabel || (meta.hoursLabel || L.hours || "?");
    return `<div class="mode-coach mode-${escapeHtml(mode)}">
      <div class="mode-coach-head">
        <span class="badge blue">Day ${state.day}/${maxDay()}</span>
        <span class="badge">${escapeHtml(mode.toUpperCase())}</span>
        <span class="badge">L${L.day}</span>
        <span class="badge yellow">${escapeHtml(String(hrs))}</span>
        <span class="badge yellow">Goal ${goal}Q</span>
        <span class="badge">${state.planLength}d · ${sch.focusMinutes || 45}m focus</span>
      </div>
      <strong>${escapeHtml(pb.title)}</strong>
      ${meta.note ? `<div class="muted">${escapeHtml(meta.note)}</div>` : ""}
      <ol class="mode-coach-steps">${pb.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <div class="mode-coach-cta"><strong>Do now:</strong> ${escapeHtml(pb.cta)}</div>
      ${mode === "review" ? reviewWeakPanelHtml() : ""}
      ${passReadinessHtml({ compact: true })}
      ${nextBestActionHtml()}
    </div>`;
  }

  /** Review-day: surface weak topics + one-tap packs (auto priority). */
  function reviewWeakPanelHtml() {
    const ranked = typeof weakRankedTopics === "function" ? weakRankedTopics() : [];
    const weak = ranked.filter((x) => x.a >= 8 && x.pct != null && x.pct < 80).slice(0, 4);
    const cold = ranked.filter((x) => x.a < 8).slice(0, 3);
    const wrongN = (state.wrongBook || []).length;
    const lines =
      weak.length || cold.length
        ? [...weak, ...cold]
            .slice(0, 5)
            .map((x) => {
              const pct = x.pct == null ? "cold" : Math.round(x.pct) + "%";
              return `<li><b>${escapeHtml(x.topic)}</b> — ${x.c}/${x.a} (${pct})</li>`;
            })
            .join("")
        : `<li class="muted">Answer more MCQs so weak ranking can rank topics.</li>`;
    return `<div class="review-weak-panel">
      <strong>Review focus (auto)</strong>
      <ul class="review-weak-list">${lines}</ul>
      <div class="volume-grid">
        ${wrongN ? volBtn("wrong", Math.min(50, wrongN), "Wrong book", "warn") : ""}
        ${volBtn("wrong", QUIZ_ALL, "Wrong ALL", "ghost")}
        ${volBtn("weak", 50, "Weak pack", "")}
        ${volBtn("weak", 100, "Weak pack", "success")}
        ${volBtn("weak", QUIZ_ALL, "Weak ALL", "success")}
        ${volBtn("always_src", 25, "Free points", "ghost")}
      </div>
      <p class="muted" style="margin:6px 0 0;font-size:0.85rem">One-tap starts immediately. Re-read only bold lines from weak lesson days — not full textbooks.</p>
    </div>`;
  }

  function noteDeptToCardDeck(dept) {
    const d = String(dept || "mixed");
    if (d === "fixed" || d === "operative" || d === "rpd") return "restorative";
    if (d === "ortho_pedo" || d === "ortho" || d === "pedo") return "ortho_pedo";
    if (["perio", "endo", "oms", "ethics", "restorative"].includes(d)) return d;
    return "always";
  }

  /**
   * Flashcards = static highyield (~150) + always-comes rules + notes_bank stems
   * + open wrong-book items. Rebuilt once per page load (notes are large).
   */
  function ensureFlashcards() {
    if (window.__FLASHCARDS_ENRICHED && Array.isArray(window.FLASHCARDS) && window.FLASHCARDS.length > 200) {
      return window.FLASHCARDS;
    }
    let cards = Array.isArray(window.FLASHCARDS) ? window.FLASHCARDS.slice() : [];
    const ids = new Set(cards.map((c) => c && c.id).filter(Boolean));

    (window.ALWAYS_COMES_READ || []).forEach((r, i) => {
      if (!r || !r[0]) return;
      const id = "ac_rule_" + (i + 1);
      if (ids.has(id)) return;
      const front = String(r[0]).replace(/^\d+\.\s*/, "").trim();
      cards.push({
        id,
        deck: "always",
        front: front || "Always-comes rule",
        back: String(r[1] || ""),
        src: "always_comes",
      });
      ids.add(id);
    });

    /* Enrich from NOTES_BANK (أبطال / رفيع extracts) — stem → note */
    const notes = (window.NOTES_BANK && window.NOTES_BANK.notes) || [];
    let noteAdded = 0;
    const NOTE_CAP = 3500;
    for (let i = 0; i < notes.length && noteAdded < NOTE_CAP; i++) {
      const n = notes[i];
      if (!n || !n.id) continue;
      const front = String(n.stemPreview || "").replace(/\s+/g, " ").trim();
      const back = String(n.text || "").replace(/\s+/g, " ").trim();
      if (front.length < 8 || back.length < 10) continue;
      if (back.length > 400) continue;
      const id = "note_" + n.id;
      if (ids.has(id)) continue;
      const pack = String(n.sourcePack || "");
      const fromAbtal = /abtal/i.test(pack);
      cards.push({
        id,
        deck: noteDeptToCardDeck(n.department),
        front,
        back,
        src: fromAbtal ? "abtal_note" : pack || "note",
      });
      ids.add(id);
      noteAdded++;
    }

    /* Live wrong-book → personal cards */
    try {
      const wrongIds = state.wrongBook || [];
      const bank = window.QUESTION_BANK || [];
      const byId = new Map(bank.map((q) => [q.id, q]));
      wrongIds.slice(0, 400).forEach((wid) => {
        const q = byId.get(wid);
        if (!q || !q.q) return;
        const id = "wb_" + wid;
        if (ids.has(id)) return;
        const ans =
          q.options && q.answer != null && q.options[q.answer] != null
            ? String(q.options[q.answer])
            : "";
        const exp = q.explanation ? " — " + String(q.explanation) : "";
        cards.push({
          id,
          deck: "wrong",
          front: String(q.q).slice(0, 320),
          back: (ans + exp).trim() || "(no answer text)",
          src: "wrong_book",
        });
        ids.add(id);
      });
    } catch (_) {
      /* ignore */
    }

    window.FLASHCARDS = cards;
    window.__FLASHCARDS_ENRICHED = true;
    window.__FLASHCARDS_META = {
      total: cards.length,
      fromNotes: noteAdded,
      staticBase: Math.max(0, cards.length - noteAdded - (state.wrongBook || []).length),
    };
    return cards;
  }

  function cardPoolForDeck(deck) {
    const cards = ensureFlashcards();
    const d = deck || "always";
    if (d === "all") return cards.slice();
    if (d === "unknown") {
      const unk = cards.filter((c) => c && !state.cardKnown[c.id]);
      return unk.length ? unk : cards.slice();
    }
    if (d === "wrong") return cards.filter((c) => c.deck === "wrong");
    if (d === "abtal_notes") return cards.filter((c) => c.src === "abtal_note");
    if (d === "always") return cards.filter((c) => c.deck === "always");
    // Day 9 uses pedo; include ortho cards too
    if (d === "pedo" || d === "ortho" || d === "ortho_pedo") {
      return cards.filter((c) => ["pedo", "ortho", "ortho_pedo", "always"].includes(c.deck));
    }
    const hit = cards.filter((c) => c.deck === d || c.deck === "always");
    return hit.length ? hit : cards.slice();
  }

  function logSession(entry) {
    if (!Array.isArray(state.history)) state.history = [];
    state.history.unshift(entry);
    if (state.history.length > 80) state.history = state.history.slice(0, 80);
    store.set("history", state.history);
  }

  function formatWhen(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  }

  function formatDur(sec) {
    if (sec == null || sec < 0) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m ? `${m}m ${s}s` : `${s}s`;
  }

  function formatPomo(s) {
    const m = Math.floor(Math.max(0, s) / 60);
    const sec = Math.max(0, s) % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function tickPomo() {
    if (!pomo.running) return;
    pomo.remaining--;
    store.set("pomoRemaining", pomo.remaining);
    store.set("pomoMode", pomo.mode);
    const el = $("#pomo-display");
    if (el) {
      el.textContent = formatPomo(pomo.remaining);
      el.dataset.mode = pomo.mode;
    }
    if (pomo.remaining <= 0) {
      pomo.running = false;
      if (pomoTimer) clearInterval(pomoTimer);
      pomoTimer = null;
      const wasWork = pomo.mode === "work";
      pomo.mode = wasWork ? "break" : "work";
      pomo.remaining = wasWork ? pomo.breakSec : pomo.workSec;
      store.set("pomoMode", pomo.mode);
      store.set("pomoRemaining", pomo.remaining);
      const workMin = Math.round(pomo.workSec / 60);
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(wasWork ? "Break — 5 min stand/water" : `Work block — ${workMin} min focus`);
        }
      } catch (_) {}
      if (wasWork) document.body.classList.add("pomo-break");
      else document.body.classList.remove("pomo-break");
      paintPomoBar();
      alert(
        wasWork
          ? "Pomodoro done → 5 min BREAK. Stand up, water, no phone rabbit holes."
          : `Break over → start next ${workMin} min work block (synced to your plan).`
      );
    }
  }

  function paintPomoBar() {
    const bar = $("#pomo-bar");
    if (!bar) return;
    if (isSimpleMode()) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }
    bar.hidden = false;
    const workMin = Math.round(pomo.workSec / 60);
    const sch = (() => {
      try {
        return currentSchedule();
      } catch (_) {
        return { hoursLabel: "—", mode: "" };
      }
    })();
    bar.innerHTML = `
      <span class="pomo-label">${pomo.mode === "work" ? "FOCUS" : "BREAK"}</span>
      <strong id="pomo-display" data-mode="${pomo.mode}">${formatPomo(pomo.remaining)}</strong>
      <button type="button" class="btn sm ghost" id="pomo-toggle" title="${pomo.running ? "Pause" : "Start"} timer">${pomo.running ? "❚❚" : "▶"}</button>
      <button type="button" class="btn sm ghost" id="pomo-reset" title="Reset ${workMin}/5 (plan ${state.planLength}d)">↺</button>
      <button type="button" class="btn sm ghost" id="focus-toggle" title="Quieter chrome — plan tabs stay visible">${state.focusMode ? "Exit" : "Read"}</button>
      <span class="pomo-goal" title="Hours · today Q · block">${escapeHtml(sch.hoursLabel || "—")} · Q${state.sessionAnswered}/${state.dailyGoal} · ${workMin}m</span>`;
    const t = $("#pomo-toggle");
    if (t)
      t.onclick = () => {
        if (pomo.running) {
          pomo.running = false;
          if (pomoTimer) clearInterval(pomoTimer);
          pomoTimer = null;
        } else {
          pomo.running = true;
          if (pomoTimer) clearInterval(pomoTimer);
          pomoTimer = setInterval(tickPomo, 1000);
          if (typeof Notification !== "undefined" && Notification.permission === "default") {
            try {
              Notification.requestPermission();
            } catch (_) {}
          }
        }
        paintPomoBar();
      };
    const r = $("#pomo-reset");
    if (r)
      r.onclick = () => {
        pomo.running = false;
        if (pomoTimer) clearInterval(pomoTimer);
        pomoTimer = null;
        syncPomoFromPlan({ force: true });
        pomo.mode = "work";
        pomo.remaining = pomo.workSec;
        store.set("pomoMode", pomo.mode);
        store.set("pomoRemaining", pomo.remaining);
        document.body.classList.remove("pomo-break");
        paintPomoBar();
      };
    const f = $("#focus-toggle");
    if (f)
      f.onclick = () => {
        state.focusMode = !state.focusMode;
        store.set("focusMode", state.focusMode);
        document.body.classList.toggle("focus-mode", state.focusMode);
        paintPomoBar();
      };
  }

  function syncPomoStickyTop() {
    /* Pomodoro lives inside sticky #topbar — no separate sticky offset. */
  }

  function ensurePomoBar() {
    let bar = $("#pomo-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "pomo-bar";
      bar.className = "pomo-bar";
      const row = $(".chrome-row");
      const top = $("#topbar") || $(".topbar");
      if (row) row.appendChild(bar);
      else if (top) top.appendChild(bar);
      else document.body.prepend(bar);
    }
    document.body.classList.toggle("focus-mode", state.focusMode);
    if (pomo.mode === "break") document.body.classList.add("pomo-break");
    paintPomoBar();
    syncPomoStickyTop();
  }

  function updateTop() {
    ensureSessionDay();
    applyChromeMode();
    const el = $("#top-stats");
    if (!el) return;
    if (isSimpleMode()) {
      el.innerHTML = "";
      el.hidden = true;
      // Timer stays hidden in simple — no cockpit.
      const bar = $("#pomo-bar");
      if (bar) {
        bar.hidden = true;
        bar.innerHTML = "";
      }
      return;
    }
    el.hidden = false;
    const s = state.stats;
    const pct = s.answered ? Math.round((100 * s.correct) / s.answered) : 0;
    const goalPct = Math.min(100, Math.round((100 * state.sessionAnswered) / (state.dailyGoal || 150)));
    const m = maxDay();
    el.innerHTML = `
      <span title="Calendar day on ${state.planLength}-day track"><strong>D${state.day}/${m}</strong></span>
      <span class="track-pill" title="Plan length">${state.planLength}d</span>
      <span title="All-time accuracy"><strong style="color:${pct >= 80 ? "var(--accent2)" : "var(--warn)"}">${pct}%</strong></span>
      <span title="Wrong book">W<strong>${state.wrongBook.length}</strong></span>
      <span title="Session MCQ goal">Q<strong style="color:${goalPct >= 100 ? "var(--accent2)" : "var(--warn)"}">${state.sessionAnswered}/${state.dailyGoal}</strong></span>`;
    ensurePomoBar();
  }

  /** Content lesson for current calendar day (14 lessons, mapped on 30-day track). */
  function lesson() {
    const meta = trackMeta();
    const ld = meta.lessonDay || Math.min(state.day, 14);
    return window.LESSONS.find((l) => l.day === ld) || window.LESSONS[0];
  }

  function trackSwitcherHtml() {
    const opts = planOptionsMeta();
    return `
      <div class="track-switch" role="group" aria-label="Plan length">
        <span class="muted track-switch-label">Plan:</span>
        ${opts
          .map(
            (o) =>
              `<button type="button" class="btn ghost track-btn ${
                state.planLength === o.n ? "active-track" : ""
              }" data-track="${o.n}" title="${escapeHtml(o.sub)}">${escapeHtml(o.short)}</button>`
          )
          .join("")}
      </div>`;
  }

  /**
   * Plan picker. gate=true only in Coach mode (blocks day until pick).
   * Simple mode uses compact strip so day content is never blocked (TTV).
   */
  function planChooserHtml({ gate = false, compact = false } = {}) {
    const opts = planOptionsMeta();
    if (compact) {
      return `
      <section class="plan-chooser plan-chooser-compact" aria-label="Study plan">
        <p class="plan-model-line"><b>Same 14 lessons</b> · plan only changes calendar speed, hours, and Q goal.</p>
        <div class="plan-compact-row">
          <span class="muted">Plan:</span>
          ${opts
            .map(
              (t) =>
                `<button type="button" class="btn sm ${state.planLength === t.n ? "" : "ghost"}" data-pick-plan="${t.n}" title="${escapeHtml(t.sub)}">${escapeHtml(t.short)}</button>`
            )
            .join("")}
        </div>
      </section>`;
    }
    return `
      <section class="plan-chooser ${gate ? "plan-chooser-gate" : ""}" aria-label="Choose study plan">
        <h2 class="plan-chooser-title">${gate ? "1 · Choose your plan first" : "Your plan"}</h2>
        <p class="lead plan-chooser-lead">
          Same 14 lessons — <b>hours, focus timer, MCQ goal, and step order</b> change with plan length.
        </p>
        <div class="plan-template-grid plan-chooser-grid">
          ${opts
            .map(
              (t) => `
            <button type="button" class="plan-template ${state.planLength === t.n ? "active" : ""}" data-pick-plan="${t.n}">
              <span class="plan-template-days">${escapeHtml(t.title)}</span>
              <span class="plan-template-sub">${escapeHtml(t.sub)}</span>
              <span class="plan-template-desc">${escapeHtml(t.desc)}</span>
            </button>`
            )
            .join("")}
        </div>
        ${
          gate
            ? `<p class="muted plan-chooser-hint">Tap a card → Today opens. Change later anytime.</p>`
            : `<p class="muted plan-chooser-hint">Active: <b>${state.planLength}-day</b>. <button type="button" class="btn sm ghost" id="repick-plan">Change plan…</button></p>`
        }
      </section>`;
  }

  function bindPlanChooser() {
    app.querySelectorAll("[data-pick-plan]").forEach((b) => {
      b.onclick = () => setPlanLength(+b.dataset.pickPlan, { confirm: true, force: true });
    });
    const repick = $("#repick-plan");
    if (repick)
      repick.onclick = () => {
        store.set("planChosen", false);
        store.set("planPickedExplicit", false);
        save();
        render();
      };
  }

  /**
   * Sticky “Note this” callout. Title is escaped; body is trusted author HTML only
   * (hardcoded call sites — do not pass user/MCQ text).
   */
  function noteThisHtml(title, body) {
    return `<aside class="note-this" role="note">
      <div class="note-this-label">Note this</div>
      <div class="note-this-title">${escapeHtml(title)}</div>
      <p class="note-this-body">${body}</p>
    </aside>`;
  }

  function examFocusBannerHtml() {
    return noteThisHtml(
      "Exam weight — write this in your notebook",
      "Most SDLE marks sit in <b>restorative / operative</b>, <b>periodontics</b>, and <b>prosthesis</b> (fixed, RPD, complete denture). " +
        "Protect these first. Endo, OMS, ortho/pedo, and ethics still appear — but do not steal hours from the big three until free points and wrong book are clean."
    );
  }

  function bindTrackSwitcher() {
    app.querySelectorAll("[data-track]").forEach((b) => {
      b.onclick = () => setPlanLength(+b.dataset.track, { force: true, confirm: true });
    });
  }

  function readingWithRefs(L) {
    const focus = (L && L.focus) || "";
    const refs =
      typeof window.scfhsRefsHtml === "function" ? window.scfhsRefsHtml(focus, { short: false }) : "";
    const bookTopic = focus || (L && L.quizTopic) || "";
    const bookRefs =
      typeof window.bookRefsHtml === "function"
        ? window.bookRefsHtml({ topic: bookTopic, q: L.title || "", explanation: focus }, { limit: 2 })
        : "";
    // Simple path: lesson text only. Coach gets calendar banner + notebook callouts.
    if (isSimpleMode()) {
      return (L.reading || "") + (refs || "") + (bookRefs || "");
    }
    const meta = trackMeta();
    const banner = `
      <div class="track-day-banner alert">
        <strong>Calendar Day ${state.day}/${maxDay()}</strong> · ${escapeHtml(meta.phase || "")}
        · mode <b>${escapeHtml(meta.mode || "learn")}</b>
        · content lesson <b>${L.day}</b>: ${escapeHtml(L.title || "")}
        ${meta.note ? ` · ${escapeHtml(meta.note)}` : ""}
        <br/><span class="muted">Target today: <b>${meta.dailyGoal || state.dailyGoal} MCQs</b> · global practice target <b>≥80%</b> · wrong book after every miss.</span>
      </div>`;
    const note =
      meta.mode === "learn" || meta.mode === "volume"
        ? noteThisHtml(
            "Notebook — exam score-makers",
            "Restorative · perio · prosthesis carry most of the exam. Underline hinges as you read; after MCQs, rewrite misses in one line."
          )
        : "";
    return banner + note + (L.reading || "") + (refs || "") + (bookRefs || "");
  }

  function stepKey(name) {
    return state.day + "-" + name;
  }

  function isDone(name) {
    return !!state.stepsDone[stepKey(name)];
  }

  function setDone(name, val) {
    state.stepsDone[stepKey(name)] = val;
    save();
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function shuffle(a) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(s) {
    const m = Math.floor(Math.max(0, s) / 60);
    const r = Math.max(0, s) % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  /* ——— NAV ——— */
  const TAB_VIEWS = [
    "today",
    "days",
    "pass",
    "always",
    "practice",
    "mcqs",
    "recalls",
    "notes",
    "progress",
    "feedback",
    "more",
  ];
  /** Simple chrome: Today · تدرب · Notes · Progress · Feedback */
  const SIMPLE_PRIMARY = ["today", "practice", "notes", "progress", "feedback"];
  /** Public source repo (docs only — feedback does NOT open GitHub). */
  const REPO_URL = "https://github.com/xxxova2/sdle-study-path";
  /** External ChatGPT custom GPT — academic tutor only (not SCFHS, not clinical care). */
  const SDLEGPT_URL = "https://chatgpt.com/g/g-ytJW9hxum-sdlegpt";

  /**
   * Build a paste-ready prompt for SDLEGPT from current study context.
   * opts: { topic, question, options, picked, correct, explanation, subject }
   */
  function buildSdleGptContext(opts) {
    const o = opts || {};
    const lines = [
      "I am studying for the KSA SDLE (Prometric) dental exam.",
      "Please give an academic explanation with textbook-style reasoning.",
      "Not medical advice for a real patient. Not official SCFHS content.",
      "",
    ];
    if (o.subject) lines.push("Today's topic / subject: " + o.subject);
    if (o.topic) lines.push("Bank topic tag: " + o.topic);
    if (o.question) {
      lines.push("", "MCQ:", o.question);
      if (Array.isArray(o.options) && o.options.length) {
        o.options.forEach((opt, i) => {
          lines.push(String.fromCharCode(65 + i) + ". " + opt);
        });
      }
      if (o.picked != null && o.picked >= 0)
        lines.push("My answer: " + String.fromCharCode(65 + o.picked));
      if (o.correct != null && o.correct >= 0)
        lines.push("Correct answer (bank): " + String.fromCharCode(65 + o.correct));
      if (o.explanation) lines.push("Bank explanation: " + o.explanation);
      lines.push("", "Explain why the correct choice is right and why the others are wrong.");
    } else {
      lines.push("", "Quiz me / explain high-yield points for this topic in exam style.");
    }
    return lines.filter((x) => x != null).join("\n");
  }

  function sdleGptButtonHtml(kind) {
    /* kind: "row" | "link" | "compact" */
    if (kind === "link") {
      return `<button type="button" class="btn-link" data-sdlegpt data-sdlegpt-kind="topic">Ask SDLEGPT…</button>`;
    }
    if (kind === "compact") {
      return `<button type="button" class="btn ghost sm" data-sdlegpt data-sdlegpt-kind="mcq">Ask SDLEGPT</button>`;
    }
    return `<div class="sdlegpt-row">
      <button type="button" class="btn ghost sm" data-sdlegpt data-sdlegpt-kind="mcq">Ask SDLEGPT</button>
      <span class="muted sdlegpt-hint">Copies context → opens ChatGPT tutor (external)</span>
    </div>`;
  }

  async function openSdleGptWithContext(text) {
    const payload = (text || "").trim();
    let copied = false;
    if (payload && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(payload);
        copied = true;
      } catch (_) {}
    }
    if (!copied && payload) {
      try {
        const ta = document.createElement("textarea");
        ta.value = payload;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (_) {}
    }
    window.open(SDLEGPT_URL, "_blank", "noopener,noreferrer");
    if (copied) {
      try {
        const tip = document.createElement("div");
        tip.className = "sdlegpt-toast";
        tip.setAttribute("role", "status");
        tip.textContent = "Context copied — paste in SDLEGPT (Ctrl/Cmd+V)";
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 3200);
      } catch (_) {}
    }
  }

  function defaultSdleGptTopicContext() {
    const L = typeof lesson === "function" ? lesson() : null;
    const subject = L ? humanLessonTitle(L) : "SDLE";
    const topic = (L && (L.quizTopic || L.topic)) || "";
    return buildSdleGptContext({ subject, topic });
  }

  function contextFromQuizItem(item, picked) {
    if (!item) return defaultSdleGptTopicContext();
    const L = typeof lesson === "function" ? lesson() : null;
    return buildSdleGptContext({
      subject: L ? humanLessonTitle(L) : "",
      topic: item.topic || "",
      question: item.q || "",
      options: item.options || [],
      picked: picked != null ? picked : -1,
      correct: item.answer,
      explanation: item.explanation || "",
    });
  }

  function bindSdleGptButtons(root, getContext) {
    const el = root || app;
    if (!el) return;
    el.querySelectorAll("[data-sdlegpt]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const text = typeof getContext === "function" ? getContext(btn) : defaultSdleGptTopicContext();
        openSdleGptWithContext(text);
      };
    });
  }

  function paintMainNav() {
    const nav = $("#main-nav");
    if (!nav) return;
    applyChromeMode();
    if (isSimpleMode()) {
      nav.innerHTML = `
        <button type="button" data-view="today" title="Today’s lesson">Today</button>
        <button type="button" data-view="practice" title="MCQs · Flashcards · Mock">تدرب</button>
        <button type="button" data-view="notes" title="Review all notes">Notes</button>
        <button type="button" data-view="progress" title="Scores & settings">Progress</button>
        <button type="button" data-view="feedback" title="Send feedback">Feedback</button>`;
    } else {
      nav.innerHTML = `
        <button type="button" data-view="today" title="Today">Today</button>
        <button type="button" data-view="days" title="All days">Days</button>
        <button type="button" data-view="pass" title="Pass plan">Pass</button>
        <button type="button" data-view="always" title="Always-comes free points">Always</button>
        <button type="button" data-view="practice" title="تدرب">تدرب</button>
        <button type="button" data-view="mcqs" title="MCQs hub">MCQs</button>
        <button type="button" data-view="recalls" title="Exam recall packs">Recalls</button>
        <button type="button" data-view="notes" title="Study notes by department">Notes</button>
        <button type="button" data-view="progress" title="Progress">Progress</button>
        <button type="button" data-view="feedback" title="Send feedback — no login">Feedback</button>
        <button type="button" data-view="more" title="Simple mode">Simple</button>`;
    }
    bindNav();
    setActiveNav(TAB_VIEWS.includes(state.view) ? state.view : "today");
  }

  /**
   * MCQs hub categories → pool() keys.
   * Preferred = SDLE-first subset (not the full 16k dump). Archive = rest. All = everything usable.
   */
  const MCQ_CATEGORIES = [
    { id: "preferred", label: "Preferred (SDLE)", pool: "preferred", primary: true },
    { id: "abtal_src", label: "أبطال ★ priority", pool: "abtal", primary: true },
    { id: "rafi_core", label: "رفيع 11–19 first", pool: "rafi_core", primary: true },
    { id: "rafi_second", label: "رفيع 7·5·10·9·1·3", pool: "rafi_second", primary: true },
    { id: "all", label: "All MCQs", pool: "all", primary: true },
    { id: "archive", label: "Archive (rest)", pool: "archive", primary: false },
    { id: "restorative", label: "Restorative", pool: "restorative", primary: true },
    { id: "operative", label: "Operative", pool: "operative", primary: true },
    { id: "perio", label: "Perio", pool: "perio", primary: true },
    { id: "endo", label: "Endo", pool: "endo", primary: true },
    { id: "oms", label: "OMS / Path", pool: "oms", primary: true },
    { id: "ortho_pedo", label: "Ortho / Pedo", pool: "ortho_pedo", primary: true },
    { id: "ethics", label: "Ethics / Med", pool: "ethics", primary: true },
    { id: "mixed", label: "Mixed", pool: "mixed", primary: true },
    { id: "fixed", label: "Fixed", pool: "fixed", primary: false },
    { id: "implant", label: "Implant", pool: "implant", primary: false },
    { id: "rpd", label: "RPD", pool: "rpd", primary: false },
    { id: "complete_denture", label: "Complete denture", pool: "complete_denture", primary: false },
    { id: "materials", label: "Materials", pool: "materials", primary: false },
    { id: "always_src", label: "Free points", pool: "always_src", primary: true },
    { id: "saud_delta", label: "Saud delta", pool: "saud_delta", primary: true },
    { id: "rafi", label: "رفيع ALL parts", pool: "rafi", primary: false },
    { id: "wrong", label: "Wrong book", pool: "wrong", primary: true },
  ];

  function setActiveNav(view) {
    let navView = TAB_VIEWS.includes(view) ? view : "today";
    if (isSimpleMode() && !SIMPLE_PRIMARY.includes(navView)) {
      /* secondary screens: highlight closest primary tab */
      if (navView === "mcqs" || navView === "recalls" || navView === "always" || navView === "cards" || navView === "quiz")
        navView = "practice";
      else if (navView === "more") navView = "progress";
      else if (navView === "days" || navView === "pass") navView = "today";
      else navView = "practice";
    }
    document.querySelectorAll(".simple-nav button").forEach((x) => {
      const on = x.dataset.view === navView;
      x.classList.toggle("active", on);
      if (on) x.setAttribute("aria-current", "page");
      else x.removeAttribute("aria-current");
    });
  }

  function clearQuizTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  /** Start/restart timed quiz countdown. Safe if quiz missing or untimed. */
  function startQuizTimer() {
    clearQuizTimer();
    if (!state.quiz || !state.quiz.timed || state.quiz.seconds == null) return;
    timer = setInterval(() => {
      if (!state.quiz || state.quiz.seconds == null) return;
      state.quiz.seconds--;
      const t = $("#quiz-timer");
      if (t) t.textContent = formatTime(state.quiz.seconds);
      if (state.quiz.seconds <= 0) {
        clearQuizTimer();
        finishQuiz();
      }
    }, 1000);
  }

  /**
   * Leave quiz/cards cleanly before any view switch. Prevents timer finish after nav away.
   * @returns {boolean} false if user cancelled timed abandon
   */
  function leaveQuizOrCards({ nextView, abandon = true, confirmTimed = true } = {}) {
    const qz = state.quiz;
    const inQuiz = state.view === "quiz" && qz;
    const unfinishedTimed =
      inQuiz && qz.timed && qz.seconds != null && qz.i < (qz.items || []).length;

    if (abandon && unfinishedTimed && confirmTimed) {
      // Pause timer before sync confirm() so finishQuiz cannot race the dialog
      clearQuizTimer();
      const ok = confirm(
        "Leave timed quiz? Timer will stop. Progress so far may be partial (not fully scored)."
      );
      if (!ok) {
        if (state.quiz && state.view === "quiz") startQuizTimer();
        return false;
      }
    }

    clearQuizTimer();
    unbindQuizKeys();
    unbindCardKeys();

    if (abandon && inQuiz && qz) {
      // Partial log for learn / test when some answers exist
      if ((qz.mode === "learn" || qz.mode === "test") && qz.learnN > 0) {
        const sec = Math.round((Date.now() - (qz.startedAt || Date.now())) / 1000);
        logSession({
          ts: Date.now(),
          mode: qz.mode || "learn",
          label: (qz.label || "Quiz") + " (partial)",
          topic: qz.topic,
          total: (qz.items && qz.items.length) || qz.learnN,
          answered: qz.learnN,
          correct: qz.learnOk,
          pct: Math.round((100 * (qz.learnOk || 0)) / qz.learnN),
          sec,
        });
        save();
      }
      // timed/exam mid-run: do NOT call finishQuiz scoring
    }

    state.quiz = null;
    if (nextView) {
      state.view = nextView;
      setActiveNav(nextView);
      render();
    }
    return true;
  }

  function bindNav() {
    document.querySelectorAll(".simple-nav button").forEach((b) => {
      b.onclick = () => {
        const next = b.dataset.view;
        if (!next) return;
        if (state.view === "quiz" || state.view === "cards") {
          const ok = leaveQuizOrCards({ nextView: null, abandon: true, confirmTimed: true });
          if (!ok) return;
          state.quiz = null;
          // Drop overlay from logical place — tab click is a top-level jump
          state.view = viewStack.pop() || "today";
          saveViewStack();
        }
        navigateTo(next, { push: true });
      };
    });
  }

  function assertBoot() {
    const problems = [];
    if (!Array.isArray(window.LESSONS) || window.LESSONS.length !== 14) {
      problems.push("LESSONS (need exactly 14 content days)");
    }
    if (!Array.isArray(window.QUESTION_BANK) || window.QUESTION_BANK.length < 100) {
      problems.push("QUESTION_BANK");
    }
    if (!Array.isArray(window.ALWAYS_COMES_READ)) problems.push("ALWAYS_COMES_READ");
    if (!Array.isArray(window.FLASHCARDS)) problems.push("FLASHCARDS");
    if (problems.length) {
      app.innerHTML = `<div class="alert"><strong>Data failed to load:</strong> ${escapeHtml(
        problems.join(", ")
      )}. Hard-refresh (Ctrl+Shift+R). Check script tags in index.html (highyield → scfhs_refs → plan_tracks → video_links → book_index → lessons → questions → app).</div>`;
      throw new Error("boot: " + problems.join(", "));
    }
    if (!window.HIGH_YIELD) console.warn("boot: HIGH_YIELD missing (soft)");
    if (!window.PASS_PROTOCOL) console.warn("boot: PASS_PROTOCOL missing (soft)");
    if (!window.VIDEO_ROOT) console.warn("boot: VIDEO_ROOT missing; using path fallback");
    if (!window.SCFHS_APPENDIX_C) console.warn("boot: SCFHS_APPENDIX_C missing (soft)");
    if (!window.PLAN_TRACKS) console.warn("boot: PLAN_TRACKS missing (soft)");
    if (!window.VIDEO_DRIVE) console.warn("boot: VIDEO_DRIVE missing (soft) — Drive video links offline");
    if (!window.BOOK_INDEX) console.warn("boot: BOOK_INDEX missing (soft) — local book page hits offline");
    clampDay();
  }

  /* ——— RENDER ——— */
  function render() {
    updateTop();
    if (state.view === "today") renderToday();
    else if (state.view === "days") renderDays();
    else if (state.view === "pass") renderPass();
    else if (state.view === "always") renderAlways();
    else if (state.view === "practice") renderPractice();
    else if (state.view === "mcqs") renderMcqs();
    else if (state.view === "recalls") renderRecalls();
    else if (state.view === "notes") renderNotes();
    else if (state.view === "progress") renderProgress();
    else if (state.view === "feedback") renderFeedback();
    else if (state.view === "more") renderMore();
    else if (state.view === "quiz") renderQuizUI();
    else if (state.view === "cards") renderCardsUI();
  }

  /** Secondary destinations — tree of only what you need (not a button dump). */
  function renderMore() {
    const simple = isSimpleMode();
    app.innerHTML = `
      <div class="more-tree">
        <h1>More</h1>
        <details class="more-branch" open>
          <summary>Study</summary>
          <div class="more-branch-body">
            <button type="button" class="btn ghost more-link" data-go="days">All days</button>
            <button type="button" class="btn ghost more-link" data-go="pass">Pass plan</button>
            <button type="button" class="btn ghost more-link" data-go="always">Free points list</button>
            <button type="button" class="btn ghost more-link" data-go="recalls">Recalls (أبطال + رفيع/سعود)</button>
            <button type="button" class="btn ghost more-link" data-go="notes">Notes by department</button>
          </div>
        </details>
        <details class="more-branch" open>
          <summary>Plan length</summary>
          <div class="more-branch-body plan-compact-row">
            ${planOptionsMeta()
              .map(
                (t) =>
                  `<button type="button" class="btn sm ${state.planLength === t.n ? "" : "ghost"}" data-pick-plan="${t.n}">${escapeHtml(t.title)}</button>`
              )
              .join("")}
          </div>
        </details>
        <details class="more-branch">
          <summary>Backup</summary>
          <div class="more-branch-body">
            <button type="button" class="btn ghost more-link" id="more-export">Export progress</button>
            <label class="btn ghost more-link" style="cursor:pointer">
              Import progress…
              <input type="file" id="more-import" accept="application/json,.json" hidden />
            </label>
          </div>
        </details>
        <details class="more-branch">
          <summary>App mode</summary>
          <div class="more-branch-body">
            <p class="muted more-hint">${simple ? "Simple is on (clean tabs)." : "Coach is on (full tools)."}</p>
            <button type="button" class="btn ${simple ? "ghost" : "success"}" id="toggle-simple">
              ${simple ? "Switch to Coach mode" : "Switch to Simple mode"}
            </button>
          </div>
        </details>
        <details class="more-branch" open>
          <summary>Help</summary>
          <div class="more-branch-body">
            <button type="button" class="btn ghost more-link" data-sdlegpt data-sdlegpt-kind="topic">Ask SDLEGPT (tutor)</button>
            <p class="muted more-hint">Opens ChatGPT SDLEGPT with today’s topic copied. Academic study aid only — not clinical advice.</p>
            <button type="button" class="btn ghost more-link" data-go="feedback">Send feedback</button>
          </div>
        </details>
      </div>`;
    bindPlanChooser();
    app.querySelectorAll("[data-go]").forEach((b) => {
      b.onclick = () => navigateTo(b.dataset.go, { push: true });
    });
    bindSdleGptButtons(app, () => defaultSdleGptTopicContext());
    const t = $("#toggle-simple");
    if (t) t.onclick = () => setSimpleMode(!isSimpleMode());
    $("#more-export") && ($("#more-export").onclick = exportFullProgress);
    bindImportProgress($("#more-import"));
  }

  function dayPickerBar() {
    const m = maxDay();
    // Simple: Prev / Day N / Next only — no 30-row syllabus dump.
    if (isSimpleMode()) {
      return `
      <div class="nav-day simple-day-nav" role="group" aria-label="Day">
        <button type="button" class="btn ghost" id="prev-day" ${state.day <= 1 ? "disabled" : ""}>←</button>
        <span class="simple-day-label">Day <strong>${state.day}</strong> / ${m}</span>
        <button type="button" class="btn ghost" id="next-day" ${state.day >= m ? "disabled" : ""}>→</button>
      </div>`;
    }
    const track = typeof window.getPlanTrack === "function" ? window.getPlanTrack(state.planLength) : null;
    let options = "";
    if (track && track.length) {
      options = track
        .map((t) => {
          const L = window.LESSONS.find((x) => x.day === t.lessonDay) || {};
          const hrs =
            typeof window.dayHours === "function" ? window.dayHours(state.planLength, t.mode) : "";
          const label = `${t.day}. [${t.mode}${hrs ? " · " + hrs + "h" : ""}] L${t.lessonDay} ${L.title || ""}`.slice(
            0,
            80
          );
          return `<option value="${t.day}" ${t.day === state.day ? "selected" : ""}>${escapeHtml(label)}</option>`;
        })
        .join("");
    } else {
      options = window.LESSONS.map(
        (l) =>
          `<option value="${l.day}" ${l.day === state.day ? "selected" : ""}>${l.day}. ${escapeHtml(l.title)}</option>`
      ).join("");
    }
    return `
      <div class="nav-day">
        <label>Day
          <select id="day-select">${options}</select>
        </label>
        <button class="btn ghost" id="prev-day" ${state.day <= 1 ? "disabled" : ""}>← Prev</button>
        <button class="btn ghost" id="next-day" ${state.day >= m ? "disabled" : ""}>Next →</button>
      </div>`;
  }

  function bindDayPicker() {
    bindTrackSwitcher();
    $("#day-select") &&
      ($("#day-select").onchange = (e) => {
        state.day = +e.target.value;
        ensurePlanDayVolume();
        const meta = trackMeta();
        if (meta.dailyGoal && !store.get("dailyGoalUserOverride", false)) state.dailyGoal = meta.dailyGoal;
        syncPomoFromPlan({ force: true });
        save();
        render();
      });
    $("#prev-day") &&
      ($("#prev-day").onclick = () => {
        if (state.day > 1) {
          state.day--;
          ensurePlanDayVolume();
          const meta = trackMeta();
          if (meta.dailyGoal && !store.get("dailyGoalUserOverride", false)) state.dailyGoal = meta.dailyGoal;
          syncPomoFromPlan({ force: true });
          save();
          render();
        }
      });
    $("#next-day") &&
      ($("#next-day").onclick = () => {
        if (state.day < maxDay()) {
          state.day++;
          ensurePlanDayVolume();
          const meta = trackMeta();
          if (meta.dailyGoal && !store.get("dailyGoalUserOverride", false)) state.dailyGoal = meta.dailyGoal;
          syncPomoFromPlan({ force: true });
          save();
          render();
        }
      });
  }

  /** One synced day plan card — hours/order/goal from plan_tracks (not hard-coded copy). */
  function dayPlanCardHtml(L) {
    const sch = currentSchedule();
    const meta = trackMeta();
    const steps = sch.steps || [];
    const timeline = steps
      .map((s, i) => {
        const minLabel = s.min >= 60 ? `${Math.round((s.min / 60) * 10) / 10}h` : `${s.min} min`;
        const done = s.key && isDone(s.key);
        return `<li class="day-plan-step ${done ? "done" : ""}" data-plan-step="${escapeHtml(s.key || "")}">
          <span class="day-plan-n">${i + 1}</span>
          <span class="day-plan-time">${escapeHtml(minLabel)}</span>
          <span class="day-plan-body">
            <strong>${escapeHtml(s.label)}</strong>
            <span class="muted">${escapeHtml(s.detail || "")}</span>
          </span>
        </li>`;
      })
      .join("");
    const first = steps[0];
    return `
      <div class="day-plan-card">
        <div class="day-plan-head">
          <strong>Do today · ${escapeHtml(sch.hoursLabel || "?")} total</strong>
          <span class="badge blue">${state.planLength}-day plan</span>
          <span class="badge">${escapeHtml((meta.mode || "learn").toUpperCase())}</span>
          <span class="badge yellow">${escapeHtml(sch.timerLabel || sch.focusMinutes + " min focus")}</span>
          <span class="badge">Goal ${sch.dailyGoal || state.dailyGoal}Q · now ${state.sessionAnswered}</span>
        </div>
        <p class="day-plan-how"><b>How to read:</b> ${escapeHtml(sch.howToRead || "")}</p>
        ${meta.note ? `<p class="muted day-plan-note">${escapeHtml(meta.note)}</p>` : ""}
        <ol class="day-plan-timeline">${timeline}</ol>
        <p class="day-plan-cta"><strong>Start:</strong> ${escapeHtml(first ? first.label : "first step")} · Timer = <b>${sch.focusMinutes} min</b> (this plan) · Q bar = goal above</p>
      </div>`;
  }

  function stepOrder(L) {
    const mode = (trackMeta().mode || "learn").toLowerCase();
    let keys;
    // Mode-aware path: student should not re-read 45k chars on volume/review/mock days.
    if (mode === "volume") keys = ["quiz", "cards", "always", "read", "video"];
    else if (mode === "review") keys = ["quiz", "always", "cards", "read", "video"];
    else if (mode === "mock") keys = ["mock", "quiz", "always", "cards", "read", "video"];
    else if (mode === "light") keys = ["always", "cards", "quiz", "read", "video"];
    else keys = ["read", "video", "cards", "quiz", "always"]; // learn: free points last (matches Today DOM)

    if (L.mockType && !keys.includes("mock")) {
      // insert mock before always when lesson has mock
      const ai = keys.indexOf("always");
      if (ai >= 0) keys.splice(ai, 0, "mock");
      else keys.push("mock");
    }
    // Drop mock step if lesson has no mockType
    if (!L.mockType) keys = keys.filter((k) => k !== "mock");
    // Deduplicate while preserving order
    const seen = new Set();
    return keys.filter((k) => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  function firstIncompleteKey(L) {
    for (const k of stepOrder(L)) {
      if (!isDone(k)) return k;
    }
    return null;
  }

  /** Never leave Today with zero open steps (all done → always or last). Mode biases first open step. */
  function resolveOpenKey(L) {
    const order = stepOrder(L);
    if (isSimpleMode()) {
      // Hub → path handoff (Read / Videos / Quiz taps)
      if (state._forceOpenKey && order.includes(state._forceOpenKey)) {
        const forced = state._forceOpenKey;
        state._forceOpenKey = null;
        return forced;
      }
      const firstS = firstIncompleteKey(L);
      if (firstS) return firstS;
      if (order.includes("always")) return "always";
      return order[order.length - 1] || "read";
    }
    const mode = (trackMeta().mode || "learn").toLowerCase();
    const prefer =
      mode === "volume" || mode === "review"
        ? "quiz"
        : mode === "mock"
          ? L.mockType
            ? "mock"
            : "quiz"
          : mode === "light"
            ? "always"
            : null;
    if (prefer && order.includes(prefer) && !isDone(prefer)) return prefer;
    const first = firstIncompleteKey(L);
    if (first) return first;
    if (order.includes("always")) return "always";
    return order[order.length - 1] || "read";
  }

  const STEP_CHIP_LABELS = {
    read: "Read",
    video: "Videos",
    cards: "Cards",
    quiz: "Quiz",
    mock: "Mock",
    always: "Always",
  };

  function stepStripHtml(L, openKey) {
    const order = stepOrder(L);
    return `<nav class="step-strip" aria-label="Day steps">${order
      .map((k) => {
        const done = isDone(k);
        const open = k === openKey;
        const cls = ["step-chip", done ? "done" : "", open ? "open" : ""].filter(Boolean).join(" ");
        const aria = open ? ' aria-current="step"' : "";
        return `<button type="button" class="${cls}" data-step="${k}"${aria}>${STEP_CHIP_LABELS[k] || k}</button>`;
      })
      .join("")}</nav>`;
  }

  function openStepKey(key) {
    if (!key) return;
    // Toggle visibility only — never drop educational HTML from the page.
    app.querySelectorAll(".step[data-step]").forEach((s) => {
      s.classList.toggle("open", s.dataset.step === key);
    });
    app.querySelectorAll(".step-chip").forEach((c) => {
      const on = c.dataset.step === key;
      c.classList.toggle("open", on);
      if (on) c.setAttribute("aria-current", "step");
      else c.removeAttribute("aria-current");
    });
    const el = app.querySelector(`.step[data-step="${key}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }

  function stepHtml(num, key, title, bodyHtml, openKey) {
    const done = isDone(key);
    const open = key === openKey;
    const simple = isSimpleMode();
    // Keep full titles for Read/Video (education). Short labels only for chrome-like steps.
    const headTitle =
      simple && (key === "quiz" || key === "cards" || key === "mock" || key === "always")
        ? STEP_CHIP_LABELS[key] || title
        : title;
    const markLabel = simple ? "Mark done" : "Mark this step done → next step opens";
    // ALWAYS keep bodyHtml (lessons, videos, free points). CSS hides closed bodies.
    // Never strip educational content for "fewer characters".
    return `
      <div class="step ${done ? "done" : ""} ${open ? "open" : ""}" data-step="${key}">
        <div class="step-head">
          <div class="step-num">${done ? "✓" : num}</div>
          <div class="step-title">${headTitle}</div>
          <span class="badge ${done ? "green" : open ? "yellow" : ""}">${done ? "Done" : open ? "Now" : ""}</span>
        </div>
        <div class="step-body">
          ${bodyHtml}
          <label class="check-row">
            <input type="checkbox" class="step-check" data-key="${key}" ${done ? "checked" : ""}>
            ${markLabel}
          </label>
        </div>
      </div>`;
  }

  function deepChecklistHtml(L) {
    // Days 1–3 / 5–9 already carry a full day-specific lesson in L.reading.
    // Do NOT paste the whole "restorative 40%" mega-list on Day 1 (it mixed prostho into operative).
    if (L.day <= 3 || (L.day >= 5 && L.day <= 9)) return "";

    const hy = window.HIGH_YIELD || {};
    // Integration / mock days: playbook + theme ranking
    if (L.day === 4 || L.day >= 10) {
      const top = (hy.bankEmphasis || []).slice(0, 10);
      const free = (hy.materials && hy.materials.freeMocks) || [];
      const mockPlay =
        L.day >= 10
          ? `<div class="alert" style="margin:12px 0">
              <strong>Mock / fix-day playbook (student-tested):</strong>
              <ol style="margin:8px 0 0 1.1rem">
                <li>Warm free points ≤25 only — then timed work.</li>
                <li>Answer every item (no negative marking). Flag hard items; never freeze.</li>
                <li>After each block: wrong book one-liners only (not full textbook re-read).</li>
                <li>Target practice accuracy <b>≥80%</b> on warm packs; mock score can be lower — trend up.</li>
                <li>Day ${L.day === 11 ? "11" : L.day}: Progress tab → Weak pack on lowest domains.</li>
              </ol>
            </div>`
          : "";
      return `
        ${mockPlay}
        <h3>High-frequency themes (optional recap)</h3>
        <ol class="rank-list">
          ${top.map((t) => `<li><strong>#${t.rank}</strong> ${escapeHtml(t.theme)}</li>`).join("")}
        </ol>
        <h3>External free mocks (only after in-app work)</h3>
        <ul>
          ${free
            .map((m) => `<li><a href="${escapeHtml(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a></li>`)
            .join("")}
        </ul>`;
    }
    return "";
  }

  /**
   * Simple home:
   * 1) First page = pick plan (user must tap — never auto-force 14).
   * 2) Then today’s topic → learn → practice.
   */
  function renderTodayHub(L) {
    const subject = humanLessonTitle(L);
    const order = stepOrder(L);
    const doneCount = order.filter((k) => isDone(k)).length;
    const vidN = (L.videos && L.videos.length) || 0;
    const m = maxDay();
    /* Old builds set planChosen without a real tap — require one explicit pick. */
    if (store.get("planChosen", false) && !store.get("planPickedExplicit", false)) {
      store.set("planChosen", false);
    }
    const planChosen = !!store.get("planChosen", false);
    const repick = !!state._hubRepickPlan;

    /* ——— Page 1: choose plan only (not Day 1 / not 14 forced) ——— */
    if (!planChosen || repick) {
      const opts = planOptionsMeta();
      const row = opts
        .map((t) => {
          /* First visit: nothing pre-selected as “yours”. 30 only labeled recommended. */
          const rec = t.n === 30 ? " rec" : "";
          const cur = repick && state.planLength === t.n ? " active" : "";
          return `<button type="button" class="btn hub-plan-pick${rec}${cur}" data-pick-plan="${t.n}">${escapeHtml(t.title)}${t.n === 30 ? " ★" : ""}</button>`;
        })
        .join("");

      app.innerHTML = `
        <div class="today-hub hub-setup">
          <h1 class="hub-title">${repick ? "Change plan" : "Choose your plan"}</h1>
          <p class="hub-sub">Same 14 topics either way. Pick how many days to study.</p>
          <div class="hub-plan-picks" role="group" aria-label="Plan length">${row}</div>
          ${repick ? `<button type="button" class="btn ghost" id="hub-pace-cancel">Cancel</button>` : ""}
        </div>`;

      app.querySelectorAll("[data-pick-plan]").forEach((b) => {
        b.onclick = () => {
          state._hubRepickPlan = false;
          store.set("planPickedExplicit", true);
          setPlanLength(+b.dataset.pickPlan, { confirm: true, force: true });
        };
      });
      const cancel = $("#hub-pace-cancel");
      if (cancel) {
        cancel.onclick = () => {
          state._hubRepickPlan = false;
          renderTodayHub(L);
        };
      }
      return;
    }

    /* ——— Daily hub: subject first, learn first, practice second ——— */
    const stepRows = order
      .map((k) => {
        const done = isDone(k);
        const label = STEP_CHIP_LABELS[k] || k;
        return `<li class="hub-step ${done ? "done" : ""}"><span class="hub-dot">${done ? "✓" : "○"}</span> ${escapeHtml(label)}</li>`;
      })
      .join("");

    const goalLine = (L.goal && String(L.goal).trim()) || "High-yield points for this topic.";
    const qLine =
      state.sessionAnswered > 0
        ? ` · ${state.sessionAnswered} Q practiced today`
        : "";

    app.innerHTML = `
      <div class="today-hub">
        <p class="hub-kicker">Today’s topic</p>
        <h1 class="hub-title">${escapeHtml(subject)}</h1>
        <p class="hub-sub">${escapeHtml(goalLine)}${qLine}</p>

        <div class="hub-actions" role="group" aria-label="Start studying">
          <button type="button" class="btn success path-primary hub-primary" id="hub-read">Start today’s lesson</button>
          <button type="button" class="btn ghost hub-secondary" id="hub-practice">تدرب · MCQs (today’s subject)</button>
          ${vidN ? `<button type="button" class="btn ghost hub-secondary" id="hub-videos">Watch videos (${vidN})</button>` : ""}
          <button type="button" class="btn ghost hub-secondary" id="hub-cards">تدرب · Flashcards</button>
          <button type="button" class="btn ghost hub-secondary" id="hub-mock">تدرب · Mock (72s/Q)</button>
          <button type="button" class="btn ghost hub-secondary" id="hub-always">اسئلة مكررة</button>
        </div>

        <div class="hub-progress">
          <div class="step-progress" aria-label="Day progress">
            <div class="step-progress-bar" style="width:${Math.round((100 * doneCount) / Math.max(1, order.length))}%"></div>
            <span class="step-progress-label">${doneCount} of ${order.length} steps</span>
          </div>
          <ul class="hub-step-list">${stepRows}</ul>
        </div>

        <div class="hub-day-nav">
          <button type="button" class="btn ghost sm" id="prev-day" ${state.day <= 1 ? "disabled" : ""}>← Prev</button>
          <span class="hub-day-meta muted">Topic ${Math.min(L.day || state.day, 14)} of 14</span>
          <button type="button" class="btn ghost sm" id="next-day" ${state.day >= m ? "disabled" : ""}>Next →</button>
        </div>

        <p class="hub-foot-links">
          <button type="button" class="btn-link" id="hub-change-pace">Change study pace…</button>
          ·
          ${sdleGptButtonHtml("link")}
        </p>
      </div>`;

    $("#hub-read") &&
      ($("#hub-read").onclick = () => {
        state.todaySurface = "path";
        state._forceOpenKey = "read";
        renderToday();
      });
    $("#hub-practice") &&
      ($("#hub-practice").onclick = () => openPracticePane("mcqs"));
    bindSdleGptButtons(app, () =>
      buildSdleGptContext({
        subject: humanLessonTitle(L),
        topic: L.quizTopic || L.topic || "",
      })
    );
    $("#hub-videos") &&
      ($("#hub-videos").onclick = () => {
        state.todaySurface = "path";
        state._forceOpenKey = "video";
        renderToday();
      });
    $("#hub-cards") &&
      ($("#hub-cards").onclick = () => openPracticePane("cards"));
    $("#hub-mock") &&
      ($("#hub-mock").onclick = () => openPracticePane("mock"));
    $("#hub-always") &&
      ($("#hub-always").onclick = () => openPracticePane("always"));
    $("#hub-change-pace") &&
      ($("#hub-change-pace").onclick = () => {
        state._hubRepickPlan = true;
        renderTodayHub(L);
      });
    bindDayPicker();
  }

  function renderToday() {
    const L = lesson();
    const root = window.VIDEO_ROOT || "/data/prometric/prometric/";
    const order = stepOrder(L);
    const doneCount = order.filter((k) => isDone(k)).length;
    const simple = isSimpleMode();

    // New-user home: one screen, three jobs. Content loads after a tap.
    if (simple && state.todaySurface !== "path") {
      renderTodayHub(L);
      return;
    }

    const openKey = resolveOpenKey(L);

    let n = 1;
    const steps = [];

    // 1 Read — full educational HTML preserved; coach meta optional
    const readBody = simple
      ? `<div class="reading">
           ${readingWithRefs(L)}
           ${deepChecklistHtml(L)}
         </div>`
      : `<div class="read-source">
           <div><b>Read from:</b> this page only (scroll inside Step 1)</div>
           <div><b>Do not open:</b> PDFs / other folders for core study today</div>
           <div><b>Time:</b> ${escapeHtml(L.hours)} total day · reading block first</div>
           <div><b>Goal:</b> <span style="color:var(--accent2)">${escapeHtml(L.goal)}</span></div>
         </div>
         <div class="reading">
           ${readingWithRefs(L)}
           ${deepChecklistHtml(L)}
         </div>`;
    steps.push(
      stepHtml(
        n++,
        "read",
        simple ? "Read today’s lesson" : "Step 1 — Read today’s lesson (here in the app)",
        readBody,
        openKey
      )
    );

    // 2 Videos — Google Drive (hosted + local); local path only on localhost
    if (L.videos && L.videos.length) {
      const driveRoot =
        (window.VIDEO_DRIVE && window.VIDEO_DRIVE.rootFolderUrl) ||
        "https://drive.google.com/drive/folders/1_2pMWMnyvAnmGpcAMMO_9TfVvf58cLJb";
      const localHost =
        typeof location !== "undefined" &&
        (location.hostname === "localhost" ||
          location.hostname === "127.0.0.1" ||
          location.hostname === "");
      const list = L.videos
        .map((v, i) => {
          const localPath = root + v.file;
          const dlink =
            typeof window.videoDriveLink === "function" ? window.videoDriveLink(v.file) : null;
          const openUrl = (dlink && dlink.openUrl) || driveRoot;
          const folderUrl = (dlink && dlink.folderUrl) || driveRoot;
          const localBits = localHost
            ? `<code class="vid-path">${escapeHtml(localPath)}</code>
            <button type="button" class="btn ghost sm copy-path" data-path="${escapeHtml(localPath)}">Copy local path</button>`
            : "";
          return `
        <li>
          <span class="vid-icon">🎬</span>
          <div class="vid-body">
            <strong>${i + 1}. ${escapeHtml(v.label)}</strong>
            ${localBits}
            <div class="vid-actions">
              <a class="btn success sm" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener">▶ Open on Drive</a>
              <a class="btn ghost sm" href="${escapeHtml(folderUrl)}" target="_blank" rel="noopener">Drive folder</a>
            </div>
          </div>
        </li>`;
        })
        .join("");
      const vNote = L.videoNote
        ? `<div class="alert" style="margin:10px 0"><strong>Video check:</strong> ${escapeHtml(L.videoNote)}</div>`
        : "";
      const howLocal = localHost
        ? `or open the local path in your file manager · Local folder: <code>${escapeHtml(root)}</code>
            <button type="button" class="btn ghost sm" id="copy-folder" data-path="${escapeHtml(root)}">Copy folder path</button> · `
        : "";
      steps.push(
        stepHtml(
          n++,
          "video",
          `Step 2 — Watch only these ${L.videos.length} video(s)`,
          `<div class="folder-hint">
            <strong>How:</strong> <b>Open on Drive</b> (same on phone or laptop) · 1.25–1.5× OK.<br>
            ${howLocal}<a href="${escapeHtml(driveRoot)}" target="_blank" rel="noopener">All videos on Drive (كورس 46)</a>
          </div>
          ${vNote}
          <ul class="video-list">${list}</ul>
          <p style="color:var(--muted);font-size:0.88rem;margin:0">Do <strong>not</strong> watch other subjects today. Numbers match folder names lec.19 / lec.20 / lec.21.</p>`,
          openKey
        )
      );
    } else {
      steps.push(
        stepHtml(
          n++,
          "video",
          "Step 2 — Videos today",
          `<div class="folder-hint"><strong>No new videos today.</strong> Stay in the app for reading + practice. If weak on an older subject, open that day and rewatch only its listed files.</div>`,
          openKey
        )
      );
    }

    // 3 Cards
    const cardN = cardPoolForDeck(L.cardDeck || "always").length;
    const cardAll = ensureFlashcards().length;
    steps.push(
      stepHtml(
        n++,
        "cards",
        `Step 3 — Flashcards (5–15 min) · ${cardN} in deck`,
        `<p class="lead">Memorize short free-point rules. Tap card to flip. <b>${cardAll}</b> cards total in app · today deck <code>${escapeHtml(
          L.cardDeck || "always"
        )}</code> = <b>${cardN}</b>.</p>
         <p class="muted vol-hint">Keys: <b>Space/Enter</b> flip · <b>1</b> Know · <b>2</b> Again · <b>N</b> Next</p>
         <div class="volume-grid">
           <button class="btn" id="go-cards">Open today’s deck (${cardN})</button>
           <button class="btn ghost" id="go-cards-always">Always deck</button>
           <button class="btn ghost" id="go-cards-all">All cards (${cardAll})</button>
           <button class="btn ghost" id="go-cards-unknown">Unknown only</button>
         </div>`,
        openKey
      )
    );

    // 4 Quiz — multi-block (100s of MCQs per day topic)
    const topicLabel = L.quizTopic === "all" ? "mixed bank" : L.quizTopic === "wrong" ? "wrong book" : L.quizTopic;
    const poolSize = pool(L.quizTopic || "all").length;
    const sets = L.quizSets && L.quizSets.length
      ? L.quizSets
      : [{ topic: L.quizTopic, count: L.quizCount || 50, label: `Main ${L.quizCount || 50}Q`, mode: "learn" }];
    const setBtns = sets
      .map(
        (s, i) =>
          `<button class="btn ${i === 0 ? "" : "ghost"} quiz-set-btn" data-topic="${escapeHtml(s.topic)}" data-n="${
            s.count
          }" data-mode="${escapeHtml(s.mode || "learn")}">${escapeHtml(s.label)}</button>`
      )
      .join(" ");
    const focusTopic = L.quizTopic || "all";
    const focusShort =
      focusTopic === "operative"
        ? "Operative"
        : focusTopic === "restorative"
          ? "Resto"
          : focusTopic === "always_src"
            ? "Free points"
            : focusTopic;
    const focusSizes = sizeLadder(poolSize, [50, 100, 150, 200, 300, 500]);
    const focusVol = focusSizes.map((n) => volBtn(focusTopic, n, focusShort, "")).join("") + volBtn(focusTopic, QUIZ_ALL, focusShort, "success");
    const quizSimple = isSimpleMode();
    const quizAdvanced = `
         <h4 class="vol-sub">More volume — same focus pool (${poolSize})</h4>
         <div class="volume-grid">${focusVol}
           ${volBtn("always_src", 50, "Free points", "")}
           ${volBtn("always_src", QUIZ_ALL, "Free points", "")}
           ${volBtn("restorative", 100, "Resto", "")}
           ${volBtn("restorative", QUIZ_ALL, "Resto", "")}
           ${volBtn("all", 200, "Full bank", "")}
           ${volBtn("all", QUIZ_ALL, "Full bank", "success")}
         </div>
         <h4 class="vol-sub">Smart packs (unseen + weak topics)</h4>
         <div class="volume-grid">
           ${volBtn("unseen", 50, "Unseen", "")}
           ${volBtn("unseen", 100, "Unseen", "")}
           ${volBtn("unseen", 200, "Unseen", "")}
           ${volBtn("unseen", QUIZ_ALL, "Unseen", "success")}
           ${volBtn("weak", 50, "Weak pack", "")}
           ${volBtn("weak", 100, "Weak pack", "")}
           ${volBtn("weak", 150, "Weak pack", "")}
           ${volBtn("weak", QUIZ_ALL, "Weak pack", "success")}
         </div>
         <h4 class="vol-sub">Unseen by subject (never answered in that pool)</h4>
         <div class="volume-grid">
           ${volBtn("unseen:operative", 50, "Unseen Op", "")}
           ${volBtn("unseen:operative", 100, "Unseen Op", "")}
           ${volBtn("unseen:restorative", 50, "Unseen Resto", "")}
           ${volBtn("unseen:restorative", 100, "Unseen Resto", "")}
           ${volBtn(unseenTopic(focusTopic), 50, "Unseen focus", "")}
           ${volBtn(unseenTopic(focusTopic), 100, "Unseen focus", "")}
           ${volBtn(unseenTopic(focusTopic), QUIZ_ALL, "Unseen focus", "success")}
         </div>
         <p class="muted vol-hint">${smartPackHint()}</p>`;
    const quizBody = quizSimple
      ? `<p class="lead">Answer → see why → next. Focus pool: <strong>${poolSize}</strong> (${escapeHtml(String(topicLabel))}).</p>
         <div class="volume-grid primary-actions" style="margin:12px 0">
           <button class="btn success" id="go-quiz">▶ Start 20</button>
           <button class="btn" id="go-wrong">Wrong book 50</button>
           <button class="btn ghost" id="go-quiz-full">Start ${L.quizCount || 50}Q</button>
         </div>
         <div class="quiz-sets volume-grid" style="margin:8px 0">${setBtns}</div>
         <details class="adv-details">
           <summary>More volume packs (all still here)</summary>
           ${quizAdvanced}
           <div class="volume-grid" style="margin-top:8px">
             <button class="btn ghost" id="go-wrong-all">Wrong book ALL</button>
             <button class="btn ghost" id="go-practice-vol">→ Extra practice (every set)</button>
           </div>
         </details>`
      : `<p class="lead"><strong>${allQ().length}</strong> usable MCQs · <strong>${poolSize}</strong> for today’s focus (<code>${escapeHtml(
          String(focusTopic)
        )}</code>). Learn mode: answer → explanation → next. <b>ALL = entire pool</b>.</p>
         <div class="alert"><strong>ADHD rule:</strong> Block 1 → break → Block 2 → break → Block 3. Target ≥${state.dailyGoal || 150}Q.</div>
         <div class="quiz-sets volume-grid" style="margin:12px 0">${setBtns}</div>
         ${quizAdvanced}
         <div class="volume-grid" style="margin-top:8px">
           <button class="btn" id="go-quiz">Quick start ${L.quizCount || 50}Q</button>
           <button class="btn ghost" id="go-wrong">Wrong book 50</button>
           <button class="btn ghost" id="go-wrong-all">Wrong book ALL</button>
           <button class="btn ghost" id="go-practice-vol">→ Extra practice (every set)</button>
         </div>`;
    steps.push(
      stepHtml(
        n++,
        "quiz",
        quizSimple
          ? `Step 4 — Practice · ${poolSize} focus`
          : `Step 4 — Practice quizzes · ${allQ().length} usable · ${poolSize} focus (${topicLabel}) · aim ≥${state.dailyGoal || 150}Q`,
        quizBody,
        openKey
      )
    );

    // 5 Mock if any
    if (L.mockType) {
      let mockBtns = `<button class="btn warn" id="go-mock" data-m="${escapeHtml(L.mockType)}">${escapeHtml(L.mockLabel || "Start mock")}</button>`;
      if (L.mockType2) {
        mockBtns += `<button class="btn warn" id="go-mock2" data-m="${escapeHtml(L.mockType2)}">${escapeHtml(L.mockLabel2 || "Part 2")}</button>`;
      }
      if (L.mockType3) {
        mockBtns += `<button class="btn warn" id="go-mock3" data-m="${escapeHtml(L.mockType3)}">${escapeHtml(L.mockLabel3 || "Full 200")}</button>`;
      }
      steps.push(
        stepHtml(
          n++,
          "mock",
          "Step 5 — Timed mock (exam pace)",
          `<p class="lead">~72 seconds per question. Exam mode — score only at the end. No negative marking: answer every item.</p>
           <div class="volume-grid">${mockBtns}</div>`,
          openKey
        )
      );
    }

    // 6 Always comes micro
    const acStep = L.mockType ? 6 : 5;
    steps.push(
      stepHtml(
        n++,
        "always",
        `Step ${acStep} — Free points (always-comes)`,
        `<p class="lead">These marks are free if you know them cold. Say 8 rules out loud, then drill MCQs. Full list: Always-comes · Pass plan tabs.</p>
         <div>${window.ALWAYS_COMES_READ.slice(0, 8)
           .map((r) => `<div class="rule"><strong>${escapeHtml(r[0])}</strong><span>${escapeHtml(r[1])}</span></div>`)
           .join("")}
         <div class="volume-grid">
           ${volBtn("always_src", 25, "Free points", "")}
           ${volBtn("always_src", 50, "Free points", "")}
           ${volBtn("always_src", QUIZ_ALL, "Free points", "success")}
           <button class="btn" id="go-fp-drill">Drill free points 25</button>
           <button class="btn ghost" id="go-always">See all ${window.ALWAYS_COMES_READ.length} rules</button>
           <button class="btn ghost" id="go-pass">Pass plan</button>
         </div></div>`,
        openKey
      )
    );

    // Finish day
    const dayComplete = !!state.dayDone[state.day];
    const metaToday = trackMeta();
    const calDay = state.day;
    const mDays = maxDay();
    const schNow = currentSchedule();
    const planChosen = !!store.get("planChosen", false);

    // Coach gate only. Simple mode gates plan on the hub (renderTodayHub), not here.
    if (!planChosen && !simple) {
      app.innerHTML = `
        ${planChooserHtml({ gate: true })}
        <p class="muted" style="margin-top:12px">Pick a plan to open the day path.</p>
      `;
      bindPlanChooser();
      return;
    }

    const subject = humanLessonTitle(L);

    const dayLead = simple
      ? ""
      : `<p class="lead">Lesson <b>L${L.day}/14</b>
          · <b>${state.planLength}-day</b> · <b>${escapeHtml((metaToday.mode || "learn").toUpperCase())}</b>
          · ${escapeHtml(schNow.hoursLabel || "")} today · focus <b>${schNow.focusMinutes || 45} min</b>
          · Stay in-app except listed videos.</p>`;

    const pathCtas = simple
      ? `<div class="path-ctas path-toolbar" role="group" aria-label="Study">
          <button type="button" class="btn ghost" id="hub-back">← Home</button>
          <button type="button" class="btn ghost" id="path-practice">Practice…</button>
        </div>`
      : "";

    const coachChrome = simple
      ? ""
      : `${dayPickerBar()}
        ${dayPlanCardHtml(L)}
        ${modeCoachHtml(L)}
        <div class="meta">
          <span class="badge blue">Focus: ${escapeHtml(L.focus)}</span>
          <span class="badge ${dayComplete ? "green" : "yellow"}">${dayComplete ? "Day complete" : "In progress"}</span>
          <span class="badge ${state.sessionAnswered >= state.dailyGoal ? "green" : "yellow"}">MCQ ${state.sessionAnswered}/${state.dailyGoal}</span>
        </div>
        <div class="adhd-toolbar">
          <label class="adhd-goal-label">MCQ goal (from plan)
            <select id="daily-goal-sel">
              ${[40, 60, 80, 100, 120, 150, 200, 250].map((n) => `<option value="${n}" ${state.dailyGoal === n ? "selected" : ""}>${n}</option>`).join("")}
            </select>
          </label>
          <button type="button" class="btn sm ghost" id="reset-session-q" title="Reset session counter only">Reset Q</button>
        </div>
        ${stepStripHtml(L, openKey)}
        <div class="step-progress" aria-label="Day progress">
          <div class="step-progress-bar" style="width:${Math.round((100 * doneCount) / Math.max(1, order.length))}%"></div>
          <span class="step-progress-label">${doneCount} / ${order.length} steps · now: ${openKey}</span>
        </div>
        <div class="mcq-goal-bar" aria-label="MCQ goal"><div class="mcq-goal-fill" style="width:${Math.min(100, Math.round((100 * state.sessionAnswered) / (state.dailyGoal || 150)))}%"></div></div>`;

    const finishBlock = simple
      ? `<div class="step ${dayComplete ? "done" : ""} finish-day simple-finish">
        <div class="step-body" style="display:block;border:none">
          <button class="btn success" id="to-next" ${state.day >= maxDay() ? "disabled" : ""}>Next day →</button>
          <label class="check-row" style="margin-top:10px">
            <input type="checkbox" id="day-complete" ${dayComplete ? "checked" : ""}>
            Mark day done
          </label>
        </div>
      </div>`
      : `<div class="step ${dayComplete ? "done" : ""} finish-day">
        <div class="step-body" style="display:block;border:none">
          <label class="check-row">
            <input type="checkbox" id="day-complete" ${dayComplete ? "checked" : ""}>
            <strong>I finished calendar Day ${state.day}/${maxDay()}</strong> (content lesson ${L.day}) — then go to next day
          </label>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn success" id="to-next" ${state.day >= maxDay() ? "disabled" : ""}>Go to Day ${Math.min(maxDay(), state.day + 1)} →</button>
            <button class="btn ghost" id="to-days">All ${maxDay()} days</button>
          </div>
        </div>
      </div>`;

    app.innerHTML = `
      ${simple ? "" : planChooserHtml({ gate: false, compact: false })}
      <div class="day-header ${simple ? "day-header-path" : ""}">
        ${pathCtas}
        <h1>${simple ? `Day ${calDay} · ${escapeHtml(subject)}` : `Day ${calDay}/${mDays}: ${escapeHtml(L.title)}`}</h1>
        ${dayLead}
        ${coachChrome}
      </div>
      ${!simple && metaToday.mode === "review" ? reviewWeakPanelHtml() : ""}
      ${steps.join("")}
      ${finishBlock}
    `;

    bindDayPicker();
    bindPlanChooser();

    const goalSel = $("#daily-goal-sel");
    if (goalSel)
      goalSel.onchange = () => {
        state.dailyGoal = +goalSel.value || 150;
        store.set("dailyGoal", state.dailyGoal);
        store.set("dailyGoalUserOverride", true);
        updateTop();
        renderToday();
      };
    const resetQ = $("#reset-session-q");
    if (resetQ)
      resetQ.onclick = () => {
        state.sessionAnswered = 0;
        state.sessionDate = todayKey();
        state.planDayAnswered = 0;
        state.planDayVolumeKey = planDayVolumeKeyOf();
        store.set("sessionDate", state.sessionDate);
        store.set("sessionAnswered", 0);
        store.set("planDayAnswered", 0);
        store.set("planDayVolumeKey", state.planDayVolumeKey);
        updateTop();
        renderToday();
      };

    // accordion — never collapse to zero open steps
    app.querySelectorAll(".step-head").forEach((h) => {
      h.onclick = () => {
        const step = h.closest(".step[data-step]");
        if (!step) return;
        const key = step.dataset.step;
        if (step.classList.contains("open")) return; // keep open
        openStepKey(key);
      };
    });
    app.querySelectorAll(".step-chip").forEach((chip) => {
      chip.onclick = () => openStepKey(chip.dataset.step);
    });
    app.querySelectorAll(".step-check").forEach((c) => {
      c.onclick = (e) => e.stopPropagation();
      c.onchange = () => {
        setDone(c.dataset.key, c.checked);
        renderToday();
      };
    });
    app.querySelectorAll(".copy-path, #copy-folder").forEach((b) => {
      b.onclick = async (e) => {
        e.stopPropagation();
        const path = b.dataset.path || "";
        try {
          await navigator.clipboard.writeText(path);
          const old = b.textContent;
          b.textContent = "Copied!";
          setTimeout(() => (b.textContent = old), 1200);
        } catch {
          prompt("Copy this path:", path);
        }
      };
    });
    $("#day-complete") &&
      ($("#day-complete").onchange = (e) => {
        if (e.target.checked) {
          const goal = state.dailyGoal || 150;
          ensurePlanDayVolume();
          const vol = state.planDayAnswered || 0;
          if (vol < goal) {
            const force = confirm(
              `Day gate: only ${vol}/${goal} MCQs on this plan day.\n\nOK = mark day done anyway\nCancel = keep studying volume`
            );
            if (!force) {
              e.target.checked = false;
              return;
            }
          }
        }
        state.dayDone[state.day] = e.target.checked;
        save();
        renderToday();
      });
    $("#to-next") &&
      ($("#to-next").onclick = () => {
        const goal = state.dailyGoal || 150;
        ensurePlanDayVolume();
        const vol = state.planDayAnswered || 0;
        if (!state.dayDone[state.day] && vol < goal) {
          const force = confirm(
            `Only ${vol}/${goal} MCQs on this plan day and day not ticked done.\n\nOK = go to next day anyway\nCancel = stay and do more volume`
          );
          if (!force) return;
        }
        if (state.day < maxDay()) {
          state.day++;
          ensurePlanDayVolume();
          const meta = trackMeta();
          if (meta.dailyGoal && !store.get("dailyGoalUserOverride", false)) state.dailyGoal = meta.dailyGoal;
          syncPomoFromPlan({ force: true });
          save();
          render();
        }
      });
    $("#to-days") && ($("#to-days").onclick = () => navigateTo("days", { push: true }));
    bindVolButtons(app);
    $("#go-practice-vol") && ($("#go-practice-vol").onclick = () => navigateTo("practice", { push: true }));
    $("#go-cards") && ($("#go-cards").onclick = () => openCards(L.cardDeck || "always"));
    $("#go-cards-always") && ($("#go-cards-always").onclick = () => openCards("always"));
    $("#go-cards-all") && ($("#go-cards-all").onclick = () => openCards("all"));
    $("#go-cards-unknown") && ($("#go-cards-unknown").onclick = () => openCards("unknown"));
    $("#go-quiz") &&
      ($("#go-quiz").onclick = () =>
        isSimpleMode()
          ? goPracticeBuilder()
          : startQuiz(L.quizTopic, L.quizCount, "learn", false)
      );
    $("#go-quiz-full") &&
      ($("#go-quiz-full").onclick = () => startQuiz(L.quizTopic, L.quizCount, "learn", false));
    app.querySelectorAll(".quiz-set-btn").forEach((b) => {
      b.onclick = () => startQuiz(b.dataset.topic, +b.dataset.n, b.dataset.mode || "learn", false);
    });
    $("#go-wrong") &&
      ($("#go-wrong").onclick = () => startQuiz("wrong", 50, "learn", false));
    $("#go-wrong-all") &&
      ($("#go-wrong-all").onclick = () => startQuiz("wrong", QUIZ_ALL, "learn", false));
    $("#go-always") && ($("#go-always").onclick = () => navigateTo("always", { push: true }));
    $("#go-fp-drill") &&
      ($("#go-fp-drill").onclick = () => startQuiz("always_src", 25, "learn", false));
    $("#go-pass") && ($("#go-pass").onclick = () => navigateTo("pass", { push: true }));
    app.querySelectorAll(".day-plan-step[data-plan-step]").forEach((li) => {
      li.onclick = () => {
        const k = li.dataset.planStep;
        if (k) openStepKey(k);
      };
      li.style.cursor = "pointer";
    });
    $("#go-mock") &&
      ($("#go-mock").onclick = () => runMock($("#go-mock").dataset.m));
    $("#go-mock2") &&
      ($("#go-mock2").onclick = () => runMock($("#go-mock2").dataset.m));
    $("#go-mock3") &&
      ($("#go-mock3").onclick = () => runMock($("#go-mock3").dataset.m));

    const pathP = $("#path-practice");
    if (pathP) pathP.onclick = () => goPracticeBuilder();
    const hubBack = $("#hub-back");
    if (hubBack)
      hubBack.onclick = () => {
        state.todaySurface = "hub";
        state._forceOpenKey = null;
        renderToday();
      };

    enhanceExamQa(app);
  }

  /**
   * Interactive scoring for in-lesson Exam Q&A blocks (.exam-qa article.eq).
   * Click a/b/c/d → instant correct/wrong · auto-open hinge · block score · localStorage.
   * Counts toward session MCQ goal + stats.byTopic.exam_qa (not bank wrong-book ids).
   */
  function enhanceExamQa(root) {
    const sections = root.querySelectorAll("section.exam-qa");
    if (!sections.length) return;
    if (!state.examQa || typeof state.examQa !== "object") state.examQa = {};

    sections.forEach((sec) => {
      if (sec.dataset.eqEnhanced === "1") return;
      sec.dataset.eqEnhanced = "1";

      const day = sec.dataset.day || String(state.day);
      const block = sec.dataset.block || "?";
      const articles = [...sec.querySelectorAll("article.eq")];
      if (!articles.length) return;

      // Scoreboard
      const board = document.createElement("div");
      board.className = "exam-qa-score";
      board.innerHTML = `
        <span class="eq-score-text">Tap a/b/c/d to score · 0 / ${articles.length}</span>
        <button type="button" class="btn sm ghost eq-reset-block">Reset block</button>`;
      const hint = sec.querySelector(".exam-qa-hint");
      if (hint) {
        hint.textContent =
          "Tap an option to lock your answer. Green = correct · red = miss. Hinge opens after you pick. Target ≥4/5.";
        hint.after(board);
      } else {
        sec.insertBefore(board, sec.firstChild);
      }

      const scoreText = board.querySelector(".eq-score-text");

      function parseCorrectIdx(art) {
        const line = art.querySelector(".ans-line");
        if (!line) return null;
        const m = (line.textContent || "").match(/Answer:\s*([a-dA-D])/);
        if (!m) return null;
        return m[1].toLowerCase().charCodeAt(0) - 97;
      }

      function updateBoard() {
        let answered = 0;
        let correct = 0;
        articles.forEach((art) => {
          const id = art.dataset.id;
          const rec = id && state.examQa[id];
          if (rec && typeof rec.choice === "number") {
            answered++;
            if (rec.ok) correct++;
          }
        });
        const pct = answered ? Math.round((100 * correct) / answered) : 0;
        const done = answered === articles.length && articles.length > 0;
        const flag =
          done && correct >= Math.ceil(articles.length * 0.8)
            ? " · pass ≥4/5 ✓"
            : done
              ? " · re-drill misses"
              : "";
        scoreText.textContent = `Block ${block}: ${correct} / ${answered} correct (${answered}/${articles.length} answered${answered ? `, ${pct}%` : ""})${flag}`;
        board.classList.toggle("eq-pass", done && correct >= Math.ceil(articles.length * 0.8));
        board.classList.toggle("eq-fail", done && correct < Math.ceil(articles.length * 0.8));
      }

      function paintArticle(art, rec) {
        const opts = [...art.querySelectorAll("li.eq-opt, ol.exam-opts > li")];
        const correctIdx = parseCorrectIdx(art);
        opts.forEach((li, idx) => {
          li.classList.remove("eq-picked", "eq-correct", "eq-wrong", "eq-reveal");
          li.setAttribute("aria-disabled", rec ? "true" : "false");
          if (!rec) return;
          if (idx === correctIdx) li.classList.add("eq-correct", "eq-reveal");
          if (idx === rec.choice) {
            li.classList.add("eq-picked");
            if (!rec.ok) li.classList.add("eq-wrong");
          }
        });
        art.classList.toggle("eq-answered", !!rec);
        art.classList.toggle("eq-ok", !!(rec && rec.ok));
        art.classList.toggle("eq-miss", !!(rec && !rec.ok));
        const det = art.querySelector("details.exam-ans");
        if (det && rec) det.open = true;
        const badge = art.querySelector(".eq-result");
        if (badge) badge.remove();
        if (rec) {
          const tag = document.createElement("span");
          tag.className = "eq-result " + (rec.ok ? "ok" : "miss");
          tag.textContent = rec.ok ? "Correct" : "Miss — read hinge";
          const num = art.querySelector(".eq-num");
          if (num) num.after(tag);
          else art.insertBefore(tag, art.firstChild);
        }
      }

      function lockPick(art, choiceIdx) {
        const id = art.dataset.id;
        if (!id) return;
        if (state.examQa[id] && typeof state.examQa[id].choice === "number") return; // already locked
        const correctIdx = parseCorrectIdx(art);
        if (correctIdx == null || choiceIdx < 0 || choiceIdx > 3) return;
        const ok = choiceIdx === correctIdx;
        state.examQa[id] = { choice: choiceIdx, ok, day: +day, block };
        // session + plan-day volume + cumulative stats (lesson Qs count toward daily goal)
        bumpVolume();
        state.stats.answered = (state.stats.answered || 0) + 1;
        if (ok) state.stats.correct = (state.stats.correct || 0) + 1;
        const t = "exam_qa";
        if (!state.stats.byTopic[t]) state.stats.byTopic[t] = { a: 0, c: 0 };
        state.stats.byTopic[t].a++;
        if (ok) state.stats.byTopic[t].c++;
        save();
        paintArticle(art, state.examQa[id]);
        updateBoard();
        updateTop();
        // soft refresh of goal bar without full re-render
        const fill = document.querySelector(".mcq-goal-fill");
        if (fill) {
          fill.style.width =
            Math.min(100, Math.round((100 * state.sessionAnswered) / (state.dailyGoal || 150))) + "%";
        }
        const badgeGoal = document.querySelector(".day-header .meta .badge.yellow, .day-header .meta .badge.green");
        // update MCQ goal badge if present
        document.querySelectorAll(".day-header .meta .badge").forEach((b) => {
          if (/MCQ goal/.test(b.textContent || "")) {
            b.textContent = `MCQ goal ${state.sessionAnswered}/${state.dailyGoal}`;
            b.classList.toggle("green", state.sessionAnswered >= state.dailyGoal);
            b.classList.toggle("yellow", state.sessionAnswered < state.dailyGoal);
          }
        });
      }

      articles.forEach((art) => {
        const ol = art.querySelector("ol.exam-opts");
        if (!ol) return;
        const lis = [...ol.querySelectorAll("li")];
        lis.forEach((li, idx) => {
          li.classList.add("eq-opt");
          li.dataset.idx = String(idx);
          li.setAttribute("role", "button");
          li.tabIndex = 0;
          const letter = String.fromCharCode(97 + idx);
          if (!li.querySelector(".eq-letter")) {
            const lab = document.createElement("span");
            lab.className = "eq-letter";
            lab.textContent = letter + ".";
            li.insertBefore(lab, li.firstChild);
            // space after letter
            lab.after(document.createTextNode(" "));
          }
          const onActivate = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (art.classList.contains("eq-answered")) return;
            lockPick(art, idx);
          };
          li.addEventListener("click", onActivate);
          li.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") onActivate(e);
          });
        });

        // Keep details closed until answered; summary still works after
        const det = art.querySelector("details.exam-ans");
        if (det) {
          const sum = det.querySelector("summary");
          if (sum) sum.textContent = "Answer + hinge (opens after you pick · or tap here)";
        }

        const id = art.dataset.id;
        const rec = id && state.examQa[id];
        if (rec && typeof rec.choice === "number") paintArticle(art, rec);
      });

      board.querySelector(".eq-reset-block").onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Reset Exam Q&A scores for Block ${block}?`)) return;
        articles.forEach((art) => {
          const id = art.dataset.id;
          if (id && state.examQa[id]) delete state.examQa[id];
          art.classList.remove("eq-answered", "eq-ok", "eq-miss");
          art.querySelectorAll("li").forEach((li) => {
            li.classList.remove("eq-picked", "eq-correct", "eq-wrong", "eq-reveal");
            li.setAttribute("aria-disabled", "false");
          });
          const badge = art.querySelector(".eq-result");
          if (badge) badge.remove();
          const det = art.querySelector("details.exam-ans");
          if (det) det.open = false;
        });
        save();
        updateBoard();
      };

      updateBoard();
    });
  }

  function renderDays() {
    const track = typeof window.getPlanTrack === "function" ? window.getPlanTrack(state.planLength) : [];
    const tiles = (track.length ? track : window.LESSONS.map((l) => ({ day: l.day, lessonDay: l.day, mode: "learn" })))
      .map((t) => {
        const L = window.LESSONS.find((x) => x.day === (t.lessonDay || t.day)) || {};
        const done = !!state.dayDone[t.day];
        const title = t.note || L.title || "";
        return `<button class="day-tile ${done ? "done" : ""}" data-d="${t.day}">
            <div class="d">Day ${t.day}${done ? " ✓" : ""} <span class="mode-tag">${escapeHtml(t.mode || "")}</span></div>
            <div style="font-size:0.8rem;margin-top:4px;opacity:.9">L${t.lessonDay || t.day}: ${escapeHtml(String(title).slice(0, 48))}</div>
          </button>`;
      })
      .join("");
    app.innerHTML = `
      <h1>All days — ${state.planLength}-day track</h1>
      <p class="lead">Tap a calendar day. Content lessons are the deep ADHD texts (14); longer tracks (30–90) space them for ≥80% with less burnout.</p>
      ${trackSwitcherHtml()}
      <div class="day-grid">${tiles}</div>
      <div class="alert" style="margin-top:16px">
        <strong>How the exam works (KSA SDLE):</strong> 200 MCQs · 4 hours · 2×100 in 120 min · 30 min break ·
        Pass 542/800 · Target ≥80% · FDI numbering · English · No negative marking · Restorative ~40% of questions.
      </div>
      <div class="alert muted" style="margin-top:10px">
        <strong>Books:</strong> SCFHS Appendix C suggested textbooks are attached under each reading and under MCQ “Show answer”
        (titles only — never fake page numbers). Local curated PDFs live under <code>data/raw/books/sdle_book/</code>.
      </div>
    `;
    bindTrackSwitcher();
    app.querySelectorAll(".day-tile").forEach((b) => {
      b.onclick = () => {
        state.day = +b.dataset.d;
        ensurePlanDayVolume();
        const meta = trackMeta();
        if (meta.dailyGoal) state.dailyGoal = meta.dailyGoal;
        state.view = "today";
        setActiveNav("today");
        save();
        render();
      };
    });
  }

  function renderPass() {
    const P = window.PASS_PROTOCOL || {};
    const inv = bankInventory();
    const pct = state.stats.answered
      ? Math.round((100 * state.stats.correct) / state.stats.answered)
      : null;
    const m = maxDay();
    const daysDone = Object.keys(state.dayDone || {}).filter((k) => {
      const d = +k;
      return state.dayDone[k] && d >= 1 && d <= m;
    }).length;
    const meta = trackMeta();
    const phase = meta.phase || "Study phase";
    const rawTotal = (window.QUESTION_BANK || []).length;
    const templates = [
      { n: 14, title: "14 days", sub: "Blitz · ~8h learn days", desc: "One full lesson per day. Focus timer 45 min. Only if you can sit long sessions." },
      { n: 30, title: "30 days", sub: "Spaced · ~5h learn days", desc: "Learn + volume + review. Focus 40 min. Good default." },
      { n: 45, title: "45 days", sub: "Steady · ~4h learn days", desc: "Extra review on resto/perio/prosthesis. Focus 35 min." },
      { n: 60, title: "2 months", sub: "Calm · ~3h learn days", desc: "Notebook pace. Focus 30 min. Score-makers first." },
      { n: 90, title: "3 months", sub: "Full · ~2.5h learn days", desc: "Same 14 lessons, more rest. Focus 25 min." },
    ];
    const acN = (window.ALWAYS_COMES_READ || []).length;
    app.innerHTML = `
      ${backBarHtml("← Back")}
      <h1>Pass plan</h1>
      <p class="lead">Pick a calendar template. Same 14 deep lessons — only the pacing and <b>hours per day</b> change. Target practice <b>≥80%</b> · official pass <b>${escapeHtml(
        P.passScore || "542/800"
      )}</b>.</p>
      ${examFocusBannerHtml()}

      <h3 class="section-label">1 · Choose your template</h3>
      <div class="plan-template-grid">
        ${templates
          .map(
            (t) => `
          <button type="button" class="plan-template ${state.planLength === t.n ? "active" : ""}" data-track="${t.n}">
            <span class="plan-template-days">${escapeHtml(t.title)}</span>
            <span class="plan-template-sub">${escapeHtml(t.sub)}</span>
            <span class="plan-template-desc">${escapeHtml(t.desc)}</span>
          </button>`
          )
          .join("")}
      </div>
      ${trackSwitcherHtml()}

      <div class="stat-row pass-stats">
        <div class="stat-box"><div class="num">${escapeHtml(P.passScore || "542/800")}</div><div class="lbl">Official pass</div></div>
        <div class="stat-box"><div class="num" style="color:var(--accent2)">${escapeHtml(P.practiceTarget || "≥80%")}</div><div class="lbl">Practice target</div></div>
        <div class="stat-box"><div class="num" style="color:${pct != null && pct >= 80 ? "var(--accent2)" : "var(--warn)"}">${pct != null ? pct + "%" : "—"}</div><div class="lbl">Your accuracy</div></div>
        <div class="stat-box"><div class="num">${daysDone}/${m}</div><div class="lbl">Days done</div></div>
      </div>

      <div class="alert you-are-here">
        <strong>You are here — Day ${state.day}/${m}</strong>
        · ${escapeHtml(phase)} · <b>${escapeHtml(meta.mode || "learn")}</b> · lesson L${meta.lessonDay || "?"}
        · goal <b>${meta.dailyGoal || state.dailyGoal} Q</b> today
      </div>

      <h3 class="section-label">2 · Score-makers (do these first)</h3>
      <p class="muted vol-hint">Simple order: free points → restorative → perio / prosthesis → wrong book → one timed block.</p>
      <div class="volume-grid roi-grid pass-roi">
        ${volBtn("always_src", 50, "Free points", "success")}
        ${volBtn("always_src", QUIZ_ALL, "Free points ALL", "success")}
        ${volBtn("operative", 100, "Operative", "")}
        ${volBtn("restorative", 100, "Restorative", "")}
        ${volBtn("perio", 50, "Perio", "")}
        ${volBtn("fixed", 50, "Fixed / prosthesis", "")}
        ${volBtn("wrong", QUIZ_ALL, "Wrong book", "ghost")}
        <button type="button" class="btn warn" data-m="50">Timed 50</button>
        <button type="button" class="btn warn" data-m="200">Timed 200</button>
      </div>
      <div class="volume-grid pass-nav-row">
        <button type="button" class="btn" id="pass-today">Open Today path</button>
        <button type="button" class="btn ghost" id="pass-ac">Always-comes (${acN} notes + MCQs)</button>
        <button type="button" class="btn ghost" id="pass-cards">Always cards</button>
        <button type="button" class="btn ghost" id="pass-practice">Extra practice (all packs)</button>
      </div>

      <h3 class="section-label">3 · Where marks hide</h3>
      <div class="blueprint-cards">
        <div class="blueprint-card hot"><b>Restorative</b><span>~40%</span><em>${inv.restorative} + op ${inv.operative}</em></div>
        <div class="blueprint-card hot"><b>Perio</b><span>~18%</span><em>${inv.perio} Q</em></div>
        <div class="blueprint-card hot"><b>Prosthesis</b><span>inside resto</span><em>fixed ${inv.fixed || "—"} · RPD/CD</em></div>
        <div class="blueprint-card"><b>Endo</b><span>~17%</span><em>${inv.endo} Q</em></div>
        <div class="blueprint-card"><b>OMS</b><span>~15%</span><em>${inv.oms} Q</em></div>
        <div class="blueprint-card"><b>Ortho/Pedo</b><span>~10%</span><em>${inv.ortho_pedo} Q</em></div>
      </div>

      <details class="study-fold" open>
        <summary>More volume (same bank — nothing removed)</summary>
        <p class="muted vol-hint">Bank: <b>${inv.all}</b> usable / ${rawTotal} loaded. ${escapeHtml(smartPackHint())}</p>
        <div class="volume-grid roi-grid">
          ${volBtn("saud_delta", 50, "Saud delta", "")}
          ${volBtn("saud_delta", QUIZ_ALL, "Saud delta ALL", "success")}
          ${volBtn("unseen", 100, "Unseen", "")}
          ${volBtn("unseen", 200, "Unseen", "")}
          ${volBtn("unseen", QUIZ_ALL, "Unseen ALL", "success")}
          ${volBtn("weak", 100, "Weak pack", "")}
          ${volBtn("weak", QUIZ_ALL, "Weak ALL", "success")}
          ${volBtn("operative", 150, "Operative", "")}
          ${volBtn("operative", QUIZ_ALL, "Operative ALL", "success")}
          ${volBtn("restorative", 200, "Restorative", "")}
          ${volBtn("restorative", QUIZ_ALL, "Resto ALL", "success")}
          ${volBtn("all", 200, "Mixed", "")}
          ${volBtn("all", QUIZ_ALL, "Full bank", "success")}
          <button type="button" class="btn warn" data-m="100">Timed 100</button>
          <button type="button" class="btn warn" data-m="op100">Op 100 timed</button>
          <button type="button" class="btn warn" data-m="resto100">Resto 100 timed</button>
        </div>
        ${volBlock("Unseen only (full bank)", "unseen", [50, 100, 150, 200, 300, 500], "Unseen")}
        ${volBlock("Unseen Operative", "unseen:operative", [50, 100, 150, 200, 300], "Unseen Op")}
        ${volBlock("Unseen Restorative", "unseen:restorative", [50, 100, 150, 200, 300], "Unseen Resto")}
        ${volBlock("Unseen Perio", "unseen:perio", [50, 100, 150], "Unseen Perio")}
        ${volBlock("Unseen Endo", "unseen:endo", [50, 100, 150], "Unseen Endo")}
        ${volBlock("Unseen OMS", "unseen:oms", [50, 100, 150, 200], "Unseen OMS")}
        ${volBlock("Unseen Ortho/Pedo", "unseen:ortho_pedo", [50, 100], "Unseen Ortho")}
        ${volBlock("Unseen Ethics", "unseen:ethics", [50, 100], "Unseen Ethics")}
        ${volBlock("Weak topics pack", "weak", [50, 100, 150, 200, 300], "Weak pack")}
        ${volBlock("Free points", "always_src", [25, 50, 100], "Free points")}
        ${volBlock("Operative", "operative", [50, 100, 150, 200, 300, 500], "Operative")}
        ${volBlock("Restorative", "restorative", [50, 100, 150, 200, 300, 500], "Resto")}
        ${volBlock("Perio", "perio", [50, 100, 150, 200], "Perio")}
        ${volBlock("Endo", "endo", [50, 100, 150, 200], "Endo")}
        ${volBlock("OMS", "oms", [50, 100, 150, 200, 300], "OMS")}
        ${volBlock("Ortho/Pedo", "ortho_pedo", [50, 100, 150, 200], "Ortho/Pedo")}
        ${volBlock("Ethics/Med", "ethics", [50, 100], "Ethics")}
        ${volBlock("Fixed subtopic", "fixed", [25, 50, 100, 150], "Fixed")}
        ${volBlock("Implant subtopic", "implant", [25, 50, 100, 150], "Implant")}
        ${volBlock("RPD subtopic", "rpd", [25, 50], "RPD")}
        ${volBlock("Complete denture", "complete_denture", [25, 50], "CD")}
        ${volBlock("Materials", "materials", [25, 50], "Materials")}
        ${volBlock("Mixed topic tag", "mixed", [50, 100], "Mixed")}
        ${volBlock("Full usable bank", "all", [50, 100, 150, 200, 300, 500, 1000], "Full bank")}
        ${volBlock("Wrong book", "wrong", [25, 50, 100], "Wrong")}
      </details>

      <details class="study-fold">
        <summary>Daily OS · exam day · emergency order</summary>
        <h3>Daily operating system</h3>
        <ol>${(P.daily || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>
        <h3>Exam-day rules</h3>
        <ol>${(P.examDay || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ol>
        <h3>If time is short</h3>
        <ol>
          <li><b>Free points</b> until ≥90% on Always-comes drill</li>
          <li><b>Restorative 150–300</b> (${inv.restorative} ready)</li>
          <li><b>Wrong book</b> until empty</li>
          <li><b>One full 200 timed</b></li>
          <li>Ethics / IC free points (${inv.ethics})</li>
        </ol>
        <div class="alert warn"><strong>Stop:</strong> random new banks mid-day · re-reading strong topics while wrong book is full.</div>
      </details>

      <details class="study-fold">
        <summary>Pool inventory (live)</summary>
        ${inventoryTableHtml(inv)}
      </details>
    `;
    bindBackBar();
    bindTrackSwitcher();
    app.querySelectorAll(".plan-template[data-track]").forEach((b) => {
      b.onclick = () => setPlanLength(+b.dataset.track, { force: true, confirm: true });
    });
    bindVolButtons(app);
    app.querySelectorAll("[data-m]").forEach((b) => {
      b.onclick = () => runMock(b.dataset.m);
    });
    $("#pass-cards") && ($("#pass-cards").onclick = () => openCards("always"));
    $("#pass-today") && ($("#pass-today").onclick = () => navigateTo("today", { push: true }));
    $("#pass-practice") && ($("#pass-practice").onclick = () => navigateTo("practice", { push: true }));
    $("#pass-ac") && ($("#pass-ac").onclick = () => navigateTo("always", { push: true }));
  }

  function renderAlways() {
    const nAlways = poolN("always_src");
    const nSaud = poolN("saud_delta");
    const rules = window.ALWAYS_COMES_READ || [];
    const formSwitch = [
      {
        idea: "Same fact, new clothes",
        note: "Writers swap the stem: “most likely cause”, “first step”, “best next”, or flip to a clinical vignette. The hinge stays the same — memorize the rule, not one sentence.",
      },
      {
        idea: "Option shuffle",
        note: "Correct answer may move from A→C. Read every option. Eliminate two wrong, then pick best of remaining.",
      },
      {
        idea: "Negative stems",
        note: "“All except”, “least likely”, “contraindicated” — underline the negative word in your head before choosing.",
      },
      {
        idea: "Score-maker overlap",
        note: "Free points often sit inside restorative, perio, and prosthesis stems (dam, contacts, drugs→gingiva, RPD force, implant distances). Write those in your notebook first.",
      },
    ];
    app.innerHTML = `
      ${backBarHtml("← Back")}
      <h1>Always-comes</h1>
      <p class="lead simple-lead">Three steps only: <b>read a note</b> → <b>drill MCQs</b> → <b>say it out loud</b>. Target ≥90% on free points.</p>
      ${examFocusBannerHtml()}

      <section class="simple-panel">
        <h3 class="section-label">1 · Start here (drill)</h3>
        <p class="muted"><b>${nAlways}</b> free-point MCQs${nSaud ? ` · Saud <b>${nSaud}</b>` : ""}</p>
        <div class="volume-grid ac-drill">
          ${volBtn("always_src", 25, "Practice 25", "")}
          ${volBtn("always_src", 50, "Practice 50", "")}
          ${volBtn("always_src", QUIZ_ALL, "Practice ALL", "success")}
          <button type="button" class="btn" id="ac-cards">Flashcards</button>
        </div>
      </section>

      <section class="simple-panel">
        <h3 class="section-label">2 · Note this (how exam wording changes)</h3>
        ${noteThisHtml(
          "Form-switch",
          "Exam teams rephrase stems and shuffle options. Own the <b>one-line hinge</b> in your notebook, then prove it on MCQs."
        )}
        <div class="form-switch-grid">
          ${formSwitch
            .map(
              (f) => `
            <div class="form-switch-card">
              <div class="note-this-label">Note this</div>
              <strong>${escapeHtml(f.idea)}</strong>
              <p>${escapeHtml(f.note)}</p>
            </div>`
            )
            .join("")}
        </div>
      </section>

      <details class="study-fold simple-panel" open>
        <summary>3 · Short notes (${rules.length}) — say out loud</summary>
        <p class="muted">Then re-drill section 1 — same facts, different wording.</p>
        <div class="ac-rules-grid">
          ${rules
            .map(
              (r) =>
                `<div class="rule ac-rule"><strong>${escapeHtml(r[0])}</strong><span>${escapeHtml(r[1])}</span></div>`
            )
            .join("")}
        </div>
      </details>

      <details class="study-fold">
        <summary>More free-point volume (same bank)</summary>
        <div class="volume-grid">
          ${volBtn("always_src", 100, "Free points 100", "")}
          ${nSaud ? volBtn("saud_delta", 50, "Saud delta", "") : ""}
          ${nSaud ? volBtn("saud_delta", QUIZ_ALL, "Saud ALL", "success") : ""}
          <button type="button" class="btn warn" data-m="fp50">Free points 50 timed</button>
        </div>
      </details>
    `;
    bindBackBar();
    bindVolButtons(app);
    app.querySelectorAll("[data-m]").forEach((b) => {
      b.onclick = () => runMock(b.dataset.m);
    });
    $("#ac-cards").onclick = () => openCards("always");
  }

  function startMcqTest(poolKey, count) {
    const nPool = poolN(poolKey);
    if (!nPool) {
      alert("No questions in this pool yet.");
      return;
    }
    const n = !count || count >= QUIZ_ALL ? nPool : Math.min(count, nPool);
    if (n > 300) {
      const ok = confirm(
        `Full test: ${n} questions (entire pool, not a sample). Progress is saved per answer. Continue?`
      );
      if (!ok) return;
    }
    startQuiz(poolKey, count || QUIZ_ALL, "test", false);
  }

  /** True when bank stored import noise instead of a real teaching hinge. */
  function isPlaceholderExplanation(text) {
    const t = String(text || "").trim();
    if (!t) return true;
    if (/community bank/i.test(t)) return true;
    if (/extracted from/i.test(t)) return true;
    if (/أبطال/.test(t)) return true;
    if (/verify if no textbook/i.test(t)) return true;
    if (t.length < 12) return true;
    return false;
  }

  /** Strip old coaching / "Correct: X) …" pads — hinge text only, never the letter. */
  function scrubExplanation(text) {
    let t = String(text || "").trim();
    t = t.replace(/\s*Eliminate contradicting distractors;\s*re-drill wrongs same day\.?\s*$/i, "");
    t = t.replace(/\s*Re-drill this hinge if you missed it\.?\s*$/i, "");
    t = t.replace(/\s*Correct:\s*[A-D]\).*$/i, "");
    t = t.replace(/\s*Correct bank letter:\s*[A-D]\).*$/i, "");
    return t.replace(/\s+/g, " ").trim();
  }

  function correctLetterOption(item) {
    const letter = "ABCD"[item.answer];
    const opt =
      item.options && letter != null && item.options[item.answer] != null
        ? String(item.options[item.answer])
        : "";
    if (!letter) return "";
    return opt ? `${letter}) ${opt}` : `${letter})`;
  }

  /** Hinge only — never restate letter/option (that lives in the answer line). */
  function hingeOnly(item) {
    return scrubExplanation(item.explanation || "");
  }

  /**
   * One feedback block for all 2500 MCQs (learn / test reveal / review):
   * 1) Correct. / Incorrect. + which answer is right (once)
   * 2) Why: clinical hinge only (no second copy of the answer)
   * opts.ok: true | false | null (null = show answer without right/wrong label)
   */
  function formatAnswerFeedback(item, opts) {
    opts = opts || {};
    const ok = opts.ok;
    const ans = correctLetterOption(item);
    let head;
    if (ok === true) {
      head = `<div class="explain"><strong>Correct.</strong> ${escapeHtml(ans)}</div>`;
    } else if (ok === false) {
      head = `<div class="explain"><strong>Incorrect.</strong> Correct answer: ${escapeHtml(ans)}</div>`;
    } else {
      head = `<div class="explain"><strong>Correct answer:</strong> ${escapeHtml(ans)}</div>`;
    }
    return head + formatWhy(item);
  }

  function formatWhy(item) {
    const body = hingeOnly(item);
    const placeholder = isPlaceholderExplanation(body);
    const scfhs =
      typeof window.scfhsRefsForTopic === "function"
        ? window.scfhsRefsForTopic(item.topic || item.pool)
        : [];
    /* Skip generic book dump when hinge was empty — wrong books confuse more than they help. */
    const scfhsShort =
      !placeholder && scfhs.length > 0
        ? `<div class="src-line muted">Study books: ${scfhs
            .slice(0, 2)
            .map((r) => escapeHtml(r.split(",")[0] || r))
            .join(" · ")}</div>`
        : "";
    const bookHtml =
      !placeholder && typeof window.bookRefsHtml === "function"
        ? window.bookRefsHtml(item, { limit: 2 })
        : "";
    const whyBody = placeholder
      ? "No short hinge stored — use the options + Ask SDLEGPT, then verify in a textbook."
      : body;
    const footer = placeholder
      ? `<div class="src-line why-footer">Community bank item — treat letter as provisional until you verify.</div>`
      : "";
    return `<div class="explain"><strong>Why:</strong> ${escapeHtml(whyBody)}</div>
      ${footer}
      ${scfhsShort}${bookHtml}`;
  }

  function examPacksMeta() {
    return (window.EXAM_PACKS && window.EXAM_PACKS.packs) || [];
  }

  function notesBankMeta() {
    return window.NOTES_BANK || { notes: [], count: 0, byDepartment: {} };
  }

  const NOTE_DEPTS = [
    { id: "all", label: "All" },
    { id: "operative", label: "Operative" },
    { id: "fixed", label: "Fixed / implant" },
    { id: "rpd", label: "Removable" },
    { id: "endo", label: "Endo" },
    { id: "perio", label: "Perio" },
    { id: "oms", label: "OMS / med" },
    { id: "ortho_pedo", label: "Ortho / Pedo" },
    { id: "ethics", label: "Ethics / IC" },
    { id: "mixed", label: "Mixed" },
  ];

  function renderNotes() {
    const meta = notesBankMeta();
    const all = meta.notes || [];
    const L = lesson();
    const focusTopic = String(L.quizTopic || "").split(",")[0].trim();
    const defaultDept =
      focusTopic === "operative" || focusTopic === "restorative"
        ? "operative"
        : ["perio", "endo", "oms", "ortho_pedo", "ethics", "fixed", "rpd"].includes(focusTopic)
          ? focusTopic
          : "all";
    if (!state.notesFilter) state.notesFilter = { dept: defaultDept, q: "" };
    const filt = state.notesFilter;
    let list = all;
    if (filt.dept && filt.dept !== "all") {
      if (filt.dept === "restorative") {
        list = list.filter((n) =>
          ["operative", "fixed", "rpd", "restorative"].includes(n.department || "")
        );
      } else {
        list = list.filter((n) => (n.department || "mixed") === filt.dept);
      }
    }
    if (filt.q) {
      const qq = String(filt.q).toLowerCase();
      list = list.filter(
        (n) =>
          String(n.text || "").toLowerCase().includes(qq) ||
          String(n.stemPreview || "").toLowerCase().includes(qq) ||
          String(n.sourcePack || "").toLowerCase().includes(qq)
      );
    }
    const by = meta.byDepartment || {};
    const SIMPLE_NOTE_DEPTS = [
      { id: "all", label: "All" },
      { id: "operative", label: "Operative" },
      { id: "fixed", label: "Fixed" },
      { id: "rpd", label: "RPD" },
      { id: "endo", label: "Endo" },
      { id: "perio", label: "Perio" },
      { id: "oms", label: "OMS" },
      { id: "ortho_pedo", label: "Ortho/Pedo" },
      { id: "ethics", label: "Ethics" },
      { id: "mixed", label: "Mixed" },
    ];
    const limit = state.notesLimit || 50;
    const shown = list.slice(0, limit);
    const packLabel = (pack) => {
      const p = String(pack || "");
      if (/abtal_mar_june/i.test(p)) return "أبطال الديجيتال · Mar–Jun 2026";
      if (/abtal_dec_feb/i.test(p)) return "أبطال الديجيتال · Dec–Feb 2026";
      if (/abtal_oct/i.test(p)) return "أبطال الديجيتال · Oct 2025";
      if (/abtal_sep/i.test(p)) return "أبطال الديجيتال · Sep 2025";
      if (/abtal/i.test(p)) return "أبطال الديجيتال";
      if (/rafi|saud/i.test(p)) return p.replace(/_/g, " ");
      return p || "note";
    };

    app.innerHTML = `
      <div class="simple-hub">
        <h1>Notes</h1>
        <p class="simple-lead">Full notes · stem + answer. Today: <b>${escapeHtml(humanLessonTitle(L))}</b></p>
        <p class="simple-day-sync muted">Day ${state.day}/${maxDay()} · ${all.length} notes in bank</p>
        <div class="simple-dept-row">
          ${SIMPLE_NOTE_DEPTS.map((d) => {
            const n =
              d.id === "all"
                ? all.length
                : by[d.id] != null
                  ? by[d.id]
                  : all.filter((x) => x.department === d.id).length;
            const on = (filt.dept || "all") === d.id;
            return `<button type="button" class="btn ${on ? "success" : "ghost"} simple-dept-btn" data-note-dept="${d.id}">${escapeHtml(d.label)} <span class="badge">${n}</span></button>`;
          }).join("")}
        </div>
        <input type="search" id="notes-search" class="simple-search" placeholder="Search stem or note…" value="${escapeHtml(filt.q || "")}" />
        <p class="muted simple-count">${shown.length < list.length ? shown.length + " of " : ""}${list.length}</p>
        <div class="simple-note-list">
          ${
            shown.length
              ? shown
                  .map((n) => {
                    const stem = String(n.stemPreview || "").trim();
                    const text = String(n.text || "").trim();
                    return `<article class="simple-note note-full">
                      <div class="simple-note-meta">
                        <span class="simple-note-tag">${escapeHtml(n.department || "mixed")}</span>
                        <span class="muted note-src">${escapeHtml(packLabel(n.sourcePack))}</span>
                      </div>
                      ${stem ? `<p class="note-stem"><strong>Q:</strong> ${escapeHtml(stem)}</p>` : ""}
                      <p class="note-body"><strong>Note:</strong> ${escapeHtml(text || "—")}</p>
                    </article>`;
                  })
                  .join("")
              : `<p class="muted">No notes in this filter.</p>`
          }
        </div>
        ${
          list.length > limit
            ? `<button type="button" class="btn" id="notes-more" style="width:100%;margin-top:12px">Show more (${list.length - limit} left)</button>`
            : ""
        }
        ${
          list.length > 0 && limit < list.length
            ? `<button type="button" class="btn ghost" id="notes-all" style="width:100%;margin-top:8px">Load all ${list.length}</button>`
            : ""
        }
      </div>`;

    const apply = (patch) => {
      state.notesFilter = Object.assign({}, state.notesFilter || {}, patch);
      if (patch.dept) state.notesLimit = 50;
      renderNotes();
    };
    app.querySelectorAll("[data-note-dept]").forEach((b) => {
      b.onclick = () => apply({ dept: b.getAttribute("data-note-dept") });
    });
    const search = $("#notes-search");
    if (search) {
      let t = null;
      search.oninput = () => {
        clearTimeout(t);
        t = setTimeout(() => apply({ q: search.value.trim() }), 200);
      };
    }
    const more = $("#notes-more");
    if (more) {
      more.onclick = () => {
        state.notesLimit = (state.notesLimit || 50) + 80;
        renderNotes();
      };
    }
    const loadAll = $("#notes-all");
    if (loadAll) {
      loadAll.onclick = () => {
        state.notesLimit = list.length;
        renderNotes();
      };
    }
  }

  function renderRecalls() {
    const packs = examPacksMeta()
      .slice()
      .sort((a, b) => (a.priority || 9) - (b.priority || 9));
    const openId = state.recallPack || null;
    const open = packs.find((p) => p.id === openId) || null;

    if (open) {
      const nBank = poolN(open.bankPool || "all");
      const allItems = open.items || [];
      const noteN = open.noteCount != null
        ? open.noteCount
        : allItems.filter((x) => (x.notes || []).length).length;
      const months = Array.from(
        new Set(allItems.map((x) => x.month || "—").filter(Boolean))
      );
      const filt = state.recallFilter || { month: "all", q: "", notesOnly: false };
      let items = allItems;
      if (filt.month && filt.month !== "all") {
        items = items.filter((x) => (x.month || "—") === filt.month);
      }
      if (filt.notesOnly) {
        items = items.filter((x) => (x.notes || []).length > 0);
      }
      if (filt.q) {
        const qq = String(filt.q).toLowerCase();
        items = items.filter((x) => {
          const blob = [x.stem, ...(x.options || []), ...(x.notes || [])]
            .join(" ")
            .toLowerCase();
          return blob.includes(qq);
        });
      }
      const themes = (open.themes || [])
        .map((t) => `<span class="badge blue">${escapeHtml(t)}</span>`)
        .join(" ");
      const monthBtns = [
        `<button type="button" class="btn sm ${filt.month === "all" ? "" : "ghost"}" data-month="all">All months</button>`,
        ...months.map(
          (m) =>
            `<button type="button" class="btn sm ${
              filt.month === m ? "" : "ghost"
            }" data-month="${escapeHtml(m)}">${escapeHtml(m)}</button>`
        ),
      ].join("");
      app.innerHTML = `
        ${backBarHtml("← All recall packs")}
        <h1>${escapeHtml(open.title)}</h1>
        <p class="lead">${escapeHtml(open.period || "")}${
          open.pages ? ` · ${open.pages} PDF pages` : ""
        } · <strong>${allItems.length}</strong> items extracted ·
        <strong>${noteN}</strong> with notes ·
        bank pool <strong>${escapeHtml(open.bankPool || "—")}</strong> (${nBank} Q)</p>
        ${
          open.noteAr
            ? `<p class="muted" dir="rtl" style="text-align:right">${escapeHtml(open.noteAr)}</p>`
            : ""
        }
        <p class="muted pack-disclaimer">${escapeHtml(open.disclaimer || "")}</p>
        <div class="volume-grid" style="margin-bottom:12px">
          <button type="button" class="btn success" id="pack-drill" ${nBank < 1 ? "disabled" : ""}>
            Practice linked bank (${nBank})
          </button>
          <button type="button" class="btn ghost" id="pack-drill-25" ${nBank < 1 ? "disabled" : ""}>25 Q</button>
          <button type="button" class="btn ghost" id="pack-back">All packs</button>
        </div>
        <div class="pack-themes">${themes || ""}</div>
        <div class="pack-filter-bar">
          <input type="search" id="pack-search" class="pack-search" placeholder="Search stems / notes…" value="${escapeHtml(
            filt.q || ""
          )}" />
          <label class="pack-notes-toggle"><input type="checkbox" id="pack-notes-only" ${
            filt.notesOnly ? "checked" : ""
          } /> Notes only</label>
        </div>
        <div class="pack-month-row">${monthBtns}</div>
        <p class="muted">Showing <strong>${items.length}</strong> of ${allItems.length}</p>
        <div class="pack-items">
          ${items
            .map((it, idx) => {
              const opts = (it.options || [])
                .map(
                  (o, i) =>
                    `<li><span class="muted">${"ABCD"[i] || "?"}.</span> ${escapeHtml(o)}</li>`
                )
                .join("");
              const notes = (it.notes || [])
                .map((n) => `<li>${escapeHtml(n)}</li>`)
                .join("");
              return `<article class="pack-item${notes ? " has-notes" : ""}">
                <header>
                  <strong>#${escapeHtml(String(it.n != null ? it.n : idx + 1))}</strong>
                  <span class="muted">${escapeHtml(it.month || "")}${
                    it.topic ? " · " + escapeHtml(it.topic) : ""
                  }</span>
                  ${it.communityMarked ? '<span class="badge" title="Community mark in PDF">PDF ✅</span>' : ""}
                  ${notes ? '<span class="badge blue">note</span>' : ""}
                </header>
                <p class="pack-stem">${escapeHtml(it.stem || "")}</p>
                ${opts ? `<ul class="pack-opts">${opts}</ul>` : ""}
                ${
                  notes
                    ? `<div class="pack-notes"><strong>Notes</strong><ul>${notes}</ul></div>`
                    : ""
                }
              </article>`;
            })
            .join("")}
        </div>
        ${
          !items.length
            ? `<p class="muted">No items match this filter — clear search or month.</p>`
            : ""
        }
      `;
      bindBackBar();
      const back = () => {
        state.recallPack = null;
        state.recallFilter = null;
        renderRecalls();
      };
      $("#pack-back") && ($("#pack-back").onclick = back);
      const bb = $("#back-bar-btn");
      if (bb) {
        const prev = bb.onclick;
        bb.onclick = () => {
          state.recallPack = null;
          state.recallFilter = null;
          if (typeof prev === "function") prev();
          else renderRecalls();
        };
      }
      $("#pack-drill") &&
        ($("#pack-drill").onclick = () =>
          startQuiz(open.bankPool, QUIZ_ALL, "learn", false));
      $("#pack-drill-25") &&
        ($("#pack-drill-25").onclick = () => startQuiz(open.bankPool, 25, "learn", false));
      const applyFilter = (patch) => {
        state.recallFilter = Object.assign({}, state.recallFilter || {}, patch);
        renderRecalls();
      };
      app.querySelectorAll("[data-month]").forEach((b) => {
        b.onclick = () => applyFilter({ month: b.getAttribute("data-month") });
      });
      const notesOnly = $("#pack-notes-only");
      if (notesOnly) {
        notesOnly.onchange = () => applyFilter({ notesOnly: !!notesOnly.checked });
      }
      const search = $("#pack-search");
      if (search) {
        let t = null;
        search.oninput = () => {
          clearTimeout(t);
          t = setTimeout(() => applyFilter({ q: search.value.trim() }), 200);
        };
      }
      return;
    }

    const invAbtal = poolN("abtal");
    const invSaud = poolN("saud_delta");
    const invStream = poolN("stream");
    const invRafi = poolN("rafi");
    app.innerHTML = `
      <h1>Recalls · exam packs</h1>
      <p class="lead">أبطال windows + <strong>رفيع المقام</strong> + سعود delta. Browse stems; drill bank pools.
        <b>Not official SCFHS keys</b> — community marks can be wrong.</p>
      <div class="volume-grid pack-quick">
        <button type="button" class="btn success" data-pack-pool="rafi" data-n="${QUIZ_ALL}">رفيع ALL (${invRafi})</button>
        <button type="button" class="btn" data-pack-pool="abtal" data-n="${QUIZ_ALL}">أبطال bank (${invAbtal})</button>
        <button type="button" class="btn" data-pack-pool="saud_delta" data-n="${QUIZ_ALL}">سعود delta (${invSaud})</button>
        <button type="button" class="btn ghost" data-pack-pool="stream" data-n="${QUIZ_ALL}">Stream (${invStream})</button>
      </div>
      <div class="pack-grid">
        ${packs
          .map((p) => {
            const n = poolN(p.bankPool || "all");
            const themes = (p.themes || [])
              .slice(0, 4)
              .map((t) => `<span class="badge blue">${escapeHtml(t)}</span>`)
              .join(" ");
            return `<div class="pack-card" data-open-pack="${escapeHtml(p.id)}">
              <div class="mcq-cat-head">
                <strong>${escapeHtml(p.title)}</strong>
                <span class="badge">${escapeHtml(p.kind || "")}</span>
              </div>
              <p class="muted mcq-cat-sub">${escapeHtml(p.period || "")}${
                p.pages ? ` · ${p.pages}p` : ""
              } · <b>${p.itemCountExtracted || (p.items || []).length}</b> items ·
              ${(p.noteCount != null ? p.noteCount : 0)} with notes · practice ${n}</p>
              <div class="pack-themes">${themes}</div>
              <div class="volume-grid mcq-cat-actions">
                <button type="button" class="btn" data-open-pack="${escapeHtml(p.id)}">Browse stems</button>
                <button type="button" class="btn ghost" data-pack-pool="${escapeHtml(
                  p.bankPool || "all"
                )}" data-n="25" ${n < 1 ? "disabled" : ""}>Drill 25</button>
              </div>
            </div>`;
          })
          .join("")}
      </div>
      <p class="muted" style="margin-top:16px">Source: local أبطال PDFs (Sep/Oct/Dec–Feb/Mar–June) + تلخيص سعود (new vs رفيع 16/19). Full رفيع 16/19 books are not mirrored in-app — only the Saud delta is.</p>
    `;
    app.querySelectorAll("[data-open-pack]").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        state.recallPack = el.getAttribute("data-open-pack");
        renderRecalls();
      };
    });
    app.querySelectorAll("[data-pack-pool]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const poolKey = btn.getAttribute("data-pack-pool");
        const n = +btn.getAttribute("data-n") || 25;
        startQuiz(poolKey, n, "learn", false);
      };
    });
  }

  function renderMcqs() {
    const inv = bankInventory();
    const rawTotal = (window.QUESTION_BANK || []).length;
    const primary = MCQ_CATEGORIES.filter((c) => c.primary);
    const secondary = MCQ_CATEGORIES.filter((c) => !c.primary);

    function catCard(c) {
      const n = poolN(c.pool);
      const disabled = n < 1 ? "disabled" : "";
      return `<div class="mcq-cat-card" data-pool="${escapeHtml(c.pool)}">
        <div class="mcq-cat-head">
          <strong>${escapeHtml(c.label)}</strong>
          <span class="badge blue">${n}</span>
        </div>
        <p class="muted mcq-cat-sub">Full test = every usable MCQ in this pool</p>
        <div class="volume-grid mcq-cat-actions">
          <button type="button" class="btn success" data-mcq-start="${escapeHtml(c.pool)}" data-n="${QUIZ_ALL}" ${disabled}>Start full test</button>
          <button type="button" class="btn ghost" data-mcq-start="${escapeHtml(c.pool)}" data-n="50" ${n < 1 ? "disabled" : ""}>50</button>
          <button type="button" class="btn ghost" data-mcq-start="${escapeHtml(c.pool)}" data-n="100" ${n < 1 ? "disabled" : ""}>100</button>
          <button type="button" class="btn ghost" data-mcq-start="${escapeHtml(c.pool)}" data-n="150" ${n < 1 ? "disabled" : ""}>150</button>
        </div>
      </div>`;
    }

    app.innerHTML = `
      <h1>MCQs — practice tests</h1>
      <p class="lead"><b>أبطال ★</b> = highly recommended (recalls).
        <b>رفيع</b> from خطة المذاكرة: <b>11–19 first</b> (refs) → then <b>7·5·10·9·1·3</b>;
        parts 2/4/6/8 = extra only. Study subject-by-subject across files.
        <b>Preferred</b> = أبطال + curated + quality core رفيع. <b>All</b> = full dump. <b>Archive</b> = rest.</p>
      <div class="alert"><strong>Preferred ${inv.preferred || 0}</strong> · أبطال ${inv.abtal || 0}
        · رفيع 11–19 ${inv.rafi_core || 0} · رفيع 2nd ${inv.rafi_second || 0}
        · All ${inv.all} · Archive ${inv.archive || 0}
        · Free ${inv.always} · Saud ${inv.saud_delta || 0} · Wrong ${inv.wrong}
      </div>
      <div class="alert muted">
        After you pick an answer, use <b>Show answer</b> for a short why. Next stays on a sticky bar — no scrolling to continue.
      </div>
      ${examFocusBannerHtml()}

      <h3>Subjects</h3>
      <div class="mcq-cat-grid">
        ${primary.map(catCard).join("")}
      </div>

      <h3>Subtopics</h3>
      <div class="mcq-cat-grid">
        ${secondary.map(catCard).join("")}
      </div>

      ${inventoryTableHtml(inv)}
      <p class="muted">Need timed mocks / volume ladders? Use <button type="button" class="btn ghost" id="mcq-to-practice">Extra practice</button></p>
    `;

    app.querySelectorAll("[data-mcq-start]").forEach((b) => {
      b.onclick = () => {
        const pool = b.dataset.mcqStart;
        const n = +b.dataset.n;
        startMcqTest(pool, n);
      };
    });
    $("#mcq-to-practice") &&
      ($("#mcq-to-practice").onclick = () => {
        state.view = "practice";
        setActiveNav("practice");
        render();
      });
  }

  /**
   * Practice = choose, don’t force (Qbank-style create test):
   * 1) MCQs or flashcards  2) which pool  3) how many  4) learn vs timed  5) start
   */
  function practiceTopicLabel(topic) {
    const map = {
      all: "Full bank",
      preferred: "Preferred (SDLE)",
      archive: "Archive",
      abtal: "أبطال",
      rafi_core: "رفيع 11–19",
      rafi_second: "رفيع 7·5·10·9·1·3",
      rafi: "رفيع ALL",
      rafi_plan: "رفيع plan parts",
      plan: "Plan banks",
      saud_delta: "Saud delta",
      wrong: "Wrong book",
      always_src: "Free points",
      unseen: "Unseen",
      weak: "Weak topics",
      operative: "Operative",
      restorative: "Restorative",
      perio: "Perio",
      endo: "Endo",
      oms: "OMS",
      ortho_pedo: "Ortho / Pedo",
      ethics: "Ethics",
      fixed: "Fixed prosth",
      rpd: "RPD",
      implant: "Implant",
      materials: "Materials",
      complete_denture: "Complete denture",
      mixed: "Mixed",
    };
    const raw = String(topic || "");
    if (raw.includes("@")) {
      const [dept, scope] = raw.split("@");
      return (map[dept] || dept) + " · " + (map[scope] || scope);
    }
    if (map[topic]) return map[topic];
    if (raw.indexOf("unseen:") === 0) {
      const rest = raw.slice(7);
      if (rest.includes("@")) return "Unseen " + practiceTopicLabel(rest);
      return "Unseen " + (map[rest] || rest);
    }
    return topic || "Pool";
  }

  function getPracticeScope() {
    if (!state.practiceScope) state.practiceScope = "plan";
    return state.practiceScope;
  }

  function setPracticeScope(scope) {
    state.practiceScope = scope || "plan";
    try {
      store.set("practiceScope", state.practiceScope);
    } catch (_) {}
  }

  /** Restore scope from storage once */
  function hydratePracticeScope() {
    if (state._scopeHydrated) return;
    state._scopeHydrated = true;
    const s = store.get("practiceScope", null);
    if (s) state.practiceScope = s;
  }

  function ensurePracticeBuild() {
    if (!state.practiceBuild || typeof state.practiceBuild !== "object") {
      state.practiceBuild = { step: "hub" };
    }
    return state.practiceBuild;
  }

  function resetPracticeBuild() {
    state.practiceBuild = { step: "hub" };
  }

  function goPracticeBuilder() {
    resetPracticeBuild();
    navigateTo("practice", { push: true });
  }

  /** One bank card: title, count, 50 / 100 / All — أبطال uses star styling */
  function bankCardHtml(opts) {
    const o = opts || {};
    const pool = o.pool;
    const n = poolN(pool);
    const star = o.star ? " bank-card-star" : "";
    const sub = o.sub ? `<p class="bank-card-sub">${escapeHtml(o.sub)}</p>` : "";
    const disabled = n < 1 ? "disabled" : "";
    return `<article class="bank-card${star}" data-bank-pool="${escapeHtml(pool)}">
      <div class="bank-card-top">
        <div>
          <h3 class="bank-card-title">${o.star ? "★ " : ""}${escapeHtml(o.title)}</h3>
          ${sub}
        </div>
        <span class="badge ${o.star ? "warn" : "blue"}">${n}</span>
      </div>
      <div class="bank-card-actions">
        <button type="button" class="btn ${o.star ? "success" : "ghost"}" data-qz="${escapeHtml(pool)}" data-n="50" ${n < 1 ? "disabled" : ""}>50</button>
        <button type="button" class="btn ghost" data-qz="${escapeHtml(pool)}" data-n="100" ${n < 1 ? "disabled" : ""}>100</button>
        <button type="button" class="btn ${o.star ? "success" : ""}" data-qz="${escapeHtml(pool)}" data-n="${QUIZ_ALL}" ${disabled}>All</button>
      </div>
    </article>`;
  }

  function bindBankQuizButtons(root) {
    (root || app).querySelectorAll("button[data-qz]").forEach((b) => {
      b.onclick = () => startQuiz(b.dataset.qz, +b.dataset.n, "learn", false);
    });
  }

  function renderPractice() {
    setPracticeScope("plan");
    const L = lesson();
    const focusTopic = String(L.quizTopic || "restorative").split(",")[0].trim();
    const focusDept = [
      "restorative",
      "perio",
      "endo",
      "oms",
      "ortho_pedo",
      "ethics",
      "operative",
    ].includes(focusTopic)
      ? focusTopic === "operative"
        ? "restorative"
        : focusTopic
      : "restorative";
    const subjectTitle = humanLessonTitle(L);
    const pane = state.practicePane || "mcqs";
    if (!["mcqs", "cards", "mock", "always"].includes(pane)) state.practicePane = "mcqs";

    function poolKey(dept) {
      return dept + "@plan";
    }

    /** Compact size chips for one selected bank (horizontal). */
    function sizeChips(pool, n, mode) {
      if (n < 1) return `<span class="muted">Empty bank</span>`;
      const isExam = mode === "exam";
      const sizes = [50, 100, 200].filter((k) => k <= n);
      const parts = sizes.map(
        (k) =>
          `<button type="button" class="btn ghost simple-sz" data-qz="${escapeHtml(pool)}" data-n="${k}" data-mode="${isExam ? "exam" : "learn"}">${k}</button>`
      );
      if (!isExam) {
        parts.push(
          `<button type="button" class="btn success simple-sz" data-qz="${escapeHtml(pool)}" data-n="${QUIZ_ALL}" data-mode="learn">All ${n}</button>`
        );
      } else if (n >= 50) {
        parts.push(
          `<button type="button" class="btn success simple-sz" data-qz="${escapeHtml(pool)}" data-n="${Math.min(200, n)}" data-mode="exam">Go ${Math.min(200, n)}</button>`
        );
      }
      return parts.join("");
    }

    /** Horizontal bank chip (select only). */
    function bankChip(opts) {
      const n = poolN(opts.pool);
      const on = opts.selected ? " is-on" : "";
      const star = opts.today ? " is-today" : "";
      return `<button type="button" class="hz-bank${on}${star}" data-pick-pool="${escapeHtml(opts.pool)}" ${n < 1 ? "disabled" : ""}>
        <span class="hz-bank-name">${escapeHtml(opts.label)}</span>
        <span class="hz-bank-n">${n}</span>
      </button>`;
    }

    const SUBJECTS = [
      { id: "restorative", label: "Restorative" },
      { id: "perio", label: "Perio" },
      { id: "endo", label: "Endo" },
      { id: "oms", label: "OMS" },
      { id: "ortho_pedo", label: "Ortho/Pedo" },
      { id: "ethics", label: "Ethics" },
    ];

    const cardN = ensureFlashcards().length;
    const acRules = window.ALWAYS_COMES_READ || [];

    /* Grouped banks — no separate "Today" tile (same pool as focus department) */
    const bankProviders = [
      { pool: "abtal", label: "أبطال الديجيتال" },
      { pool: "rafi", label: "رفيع المقام" },
      { pool: "rafi_core", label: "رفيع 11–19" },
      { pool: "rafi_second", label: "رفيع 7·5·10…" },
      { pool: "saud_delta", label: "سعود delta" },
      { pool: "stream", label: "Stream" },
      { pool: "preferred", label: "Preferred" },
      { pool: "all", label: "All MCQs" },
    ];
    const bankDepts = SUBJECTS.map((s) => ({
      pool: poolKey(s.id),
      label: s.label,
      today: s.id === focusDept,
    }));
    /* Department × provider (full dump for that dept from one source) */
    const bankDeptAbtal = SUBJECTS.map((s) => ({
      pool: s.id + "@abtal",
      label: s.label + " · أبطال",
    }));
    const bankDeptRafi = SUBJECTS.map((s) => ({
      pool: s.id + "@rafi",
      label: s.label + " · رفيع",
    }));
    const bankReview = [
      { pool: "always_src", label: "اسئلة مكررة" },
      { pool: "wrong", label: "Wrong book" },
    ];

    const allBanksFlat = bankProviders
      .concat(bankDepts)
      .concat(bankDeptAbtal)
      .concat(bankDeptRafi)
      .concat(bankReview);

    if (pane === "mcqs" || pane === "mock") {
      /* No default selection — size chips only after user picks a bank */
      const valid = allBanksFlat.some((b) => b.pool === state.practiceBank);
      if (!valid) state.practiceBank = "";
    }
    if (pane === "always") state.practiceBank = "always_src";

    const selectedPool = state.practiceBank || "";
    /* Default: by department (not provider) */
    const sortMode = state.practiceSort === "provider" ? "provider" : "department";

    const subnav = `
      <div class="tadarrub-tabs" role="tablist">
        <button type="button" class="tad-tab${pane === "mcqs" ? " active" : ""}" data-pane="mcqs">MCQs</button>
        <button type="button" class="tad-tab${pane === "always" ? " active" : ""}" data-pane="always">اسئلة مكررة</button>
        <button type="button" class="tad-tab${pane === "cards" ? " active" : ""}" data-pane="cards">Flashcards</button>
        <button type="button" class="tad-tab${pane === "mock" ? " active" : ""}" data-pane="mock">Mock</button>
      </div>`;

    const sizeMode = pane === "mock" ? "exam" : "learn";

    /** Bank grid: 50/100/200/All only under the one bank the user clicked. */
    function bankStrip(banks) {
      const parts = [];
      banks.forEach((b) => {
        const on = !!selectedPool && b.pool === selectedPool;
        parts.push(
          bankChip({
            pool: b.pool,
            label: b.label,
            today: b.today,
            selected: on,
          })
        );
        if (on) {
          const n = poolN(b.pool);
          parts.push(`<div class="hz-under-sizes" role="group" aria-label="How many">
            <div class="hz-size-chips">${sizeChips(b.pool, n, sizeMode)}</div>
          </div>`);
        }
      });
      return `<div class="hz-strip" role="listbox">${parts.join("")}</div>`;
    }

    function bankSection(title, titleAr, banks) {
      if (!banks || !banks.length) return "";
      return `<section class="hz-section">
        <h3 class="hz-sec-title"><span dir="rtl">${escapeHtml(titleAr || "")}</span> ${escapeHtml(title)}</h3>
        ${bankStrip(banks)}
      </section>`;
    }

    function sortToggle() {
      return `<div class="hz-sort" role="group" aria-label="Sort banks">
        <button type="button" class="btn sm ${sortMode === "department" ? "success" : "ghost"}" data-sort="department">By department · حسب التخصص</button>
        <button type="button" class="btn sm ${sortMode === "provider" ? "success" : "ghost"}" data-sort="provider">By provider · المصادر</button>
      </div>`;
    }

    function banksBySort() {
      if (sortMode === "provider") {
        return (
          bankSection("Exam providers", "مصادر · أبطال · رفيع", bankProviders) +
          bankSection("By department", "حسب التخصص", bankDepts) +
          bankSection("Review", "مراجعة", bankReview)
        );
      }
      /* Default: department first — no extra Today row (today’s subject is starred) */
      return (
        bankSection("By department", "حسب التخصص", bankDepts) +
        bankSection("Department · أبطال", "تخصص × أبطال", bankDeptAbtal) +
        bankSection("Department · رفيع", "تخصص × رفيع", bankDeptRafi) +
        bankSection("Exam providers", "مصادر الامتحان", bankProviders) +
        bankSection("Review", "مراجعة", bankReview)
      );
    }

    /* Centered upper search — always visible on MCQs / Mock */
    const sq = state.practiceSearch || "";
    const searchHits = state.searchHitResults || [];
    const showSearch = pane === "mcqs" || pane === "mock";
    const searchTop = showSearch
      ? `
      <div class="search-top">
        <div class="search-top-row">
          <input type="search" id="bank-search-q" class="bank-search-center" autocomplete="off"
            placeholder="Search MCQs here · ابحث عن الأسئلة هنا"
            value="${escapeHtml(sq)}"
            aria-label="Search MCQs here · ابحث عن الأسئلة هنا" />
          <button type="button" class="btn success sm" id="bank-search-go">Search · بحث</button>
          ${sq.trim() ? `<button type="button" class="btn ghost sm" id="bank-search-clear">Clear</button>` : ""}
          ${
            searchHits.length
              ? `<button type="button" class="btn sm" id="bank-search-drill">Practice ${searchHits.length}</button>`
              : ""
          }
        </div>
        <div class="bank-search-results">
          ${
            state.searchHitRan && !searchHits.length && sq.trim().length >= 3
              ? `<p class="muted">No match · لا نتائج</p>`
              : searchHits
                  .map((h, i) => {
                    const item = h.q;
                    const src = item.source || item.topic || "";
                    const preview = String(item.q || "").slice(0, 140);
                    return `<button type="button" class="bank-hit" data-hit-ix="${i}">
                      <span class="bank-hit-meta">${i + 1}. ${escapeHtml(String(src))}</span>
                      <span class="bank-hit-q">${escapeHtml(preview)}${preview.length >= 140 ? "…" : ""}</span>
                    </button>`;
                  })
                  .join("")
          }
        </div>
      </div>`
      : "";

    let body = "";

    if (pane === "always") {
      body = `
        <div class="hz-layout">
          ${bankSection("اسئلة مكررة", "", [{ pool: "always_src", label: "اسئلة مكررة", today: true }])}
          <div class="hz-actions">
            <button type="button" class="btn sm" id="ac-open-cards">Cards</button>
            <button type="button" class="btn sm ghost" id="ac-full-page">All rules</button>
          </div>
          <div class="hz-rules-scroll">
            ${acRules
              .slice(0, 24)
              .map((r, i) => {
                const front = Array.isArray(r) ? r[0] : r && r.front;
                const back = Array.isArray(r) ? r[1] : r && r.back;
                if (!front) return "";
                return `<div class="hz-rule"><b>${i + 1}.</b> ${escapeHtml(String(front).replace(/^\d+\.\s*/, ""))}${
                  back ? ` — <span class="muted">${escapeHtml(String(back))}</span>` : ""
                }</div>`;
              })
              .join("")}
          </div>
        </div>`;
    } else if (pane === "mcqs") {
      body = `
        <div class="hz-layout">
          ${sortToggle()}
          ${banksBySort()}
        </div>`;
    } else if (pane === "cards") {
      const deck = lessonCardDeck(L);
      const deckN = cardPoolForDeck(deck).length;
      const abtalN = cardPoolForDeck("abtal_notes").length;
      const wrongN = cardPoolForDeck("wrong").length;
      const alwaysN = cardPoolForDeck("always").length;
      body = `
        <div class="hz-layout">
          <section class="hz-section">
            <h3 class="hz-sec-title"><span dir="rtl">مصادر</span> Providers</h3>
            <div class="hz-strip">
              <button type="button" class="hz-bank is-today" id="cards-today"><span class="hz-bank-name">Today</span><span class="hz-bank-n">${deckN}</span></button>
              <button type="button" class="hz-bank" id="cards-abtal"><span class="hz-bank-name">أبطال</span><span class="hz-bank-n">${abtalN}</span></button>
              <button type="button" class="hz-bank" id="cards-always"><span class="hz-bank-name">اسئلة مكررة</span><span class="hz-bank-n">${alwaysN}</span></button>
              <button type="button" class="hz-bank" id="cards-all"><span class="hz-bank-name">All</span><span class="hz-bank-n">${cardN}</span></button>
              <button type="button" class="hz-bank" id="cards-wrong"><span class="hz-bank-name">Wrong</span><span class="hz-bank-n">${wrongN}</span></button>
            </div>
          </section>
          <section class="hz-section">
            <h3 class="hz-sec-title"><span dir="rtl">حسب التخصص</span> Department</h3>
            <div class="hz-strip">
              <button type="button" class="hz-bank" data-card-deck="restorative"><span class="hz-bank-name">Restorative</span><span class="hz-bank-n">${cardPoolForDeck("restorative").length}</span></button>
              <button type="button" class="hz-bank" data-card-deck="perio"><span class="hz-bank-name">Perio</span><span class="hz-bank-n">${cardPoolForDeck("perio").length}</span></button>
              <button type="button" class="hz-bank" data-card-deck="endo"><span class="hz-bank-name">Endo</span><span class="hz-bank-n">${cardPoolForDeck("endo").length}</span></button>
              <button type="button" class="hz-bank" data-card-deck="oms"><span class="hz-bank-name">OMS</span><span class="hz-bank-n">${cardPoolForDeck("oms").length}</span></button>
              <button type="button" class="hz-bank" data-card-deck="ortho_pedo"><span class="hz-bank-name">Ortho/Pedo</span><span class="hz-bank-n">${cardPoolForDeck("ortho_pedo").length}</span></button>
              <button type="button" class="hz-bank" data-card-deck="ethics"><span class="hz-bank-name">Ethics</span><span class="hz-bank-n">${cardPoolForDeck("ethics").length}</span></button>
            </div>
          </section>
        </div>`;
    } else {
      body = `
        <div class="hz-layout">
          ${sortToggle()}
          ${banksBySort()}
        </div>`;
    }

    app.innerHTML = `
      <div class="simple-hub tadarrub-hub">
        <div class="tad-head">
          <div>
            <h1>تدرب</h1>
            <p class="simple-day-sync muted">Today · ${escapeHtml(subjectTitle)} · D${state.day}/${maxDay()}</p>
          </div>
        </div>
        ${searchTop}
        ${subnav}
        ${body}
      </div>`;

    app.querySelectorAll("[data-pane]").forEach((b) => {
      b.onclick = () => {
        state.practicePane = b.getAttribute("data-pane");
        renderPractice();
      };
    });
    app.querySelectorAll("[data-sort]").forEach((b) => {
      b.onclick = () => {
        state.practiceSort = b.getAttribute("data-sort");
        renderPractice();
      };
    });
    app.querySelectorAll("[data-pick-pool]").forEach((b) => {
      b.onclick = () => {
        state.practiceBank = b.getAttribute("data-pick-pool");
        renderPractice();
      };
    });
    app.querySelectorAll(".simple-sz[data-qz]").forEach((b) => {
      b.onclick = () => {
        const mode = b.dataset.mode || "learn";
        const n = +b.dataset.n;
        if (mode === "exam") startQuiz(b.dataset.qz, n, "exam", true, 72);
        else startQuiz(b.dataset.qz, n, "learn", false);
      };
    });
    const runBankSearch = () => {
      const inp = $("#bank-search-q");
      const raw = inp ? inp.value : "";
      state.practiceSearch = raw;
      state.searchHitRan = true;
      const hits = searchQuestionBank(raw, 50);
      state.searchHitResults = hits;
      state.searchHitIds = hits.map((h) => h.q && h.q.id).filter(Boolean);
      renderPractice();
      const inp2 = $("#bank-search-q");
      if (inp2) {
        inp2.focus();
        try {
          inp2.setSelectionRange(inp2.value.length, inp2.value.length);
        } catch (_) {}
      }
    };
    $("#bank-search-go") && ($("#bank-search-go").onclick = runBankSearch);
    $("#bank-search-clear") &&
      ($("#bank-search-clear").onclick = () => {
        state.practiceSearch = "";
        state.searchHitResults = [];
        state.searchHitIds = [];
        state.searchHitRan = false;
        renderPractice();
      });
    $("#bank-search-drill") &&
      ($("#bank-search-drill").onclick = () => {
        if (!(state.searchHitIds || []).length) return;
        startQuiz("search_hits", QUIZ_ALL, "learn", false);
      });
    app.querySelectorAll("[data-hit-ix]").forEach((b) => {
      b.onclick = () => {
        const ix = +b.getAttribute("data-hit-ix");
        const hit = (state.searchHitResults || [])[ix];
        if (!hit || !hit.q) return;
        state.searchHitIds = [hit.q.id];
        startQuiz("search_hits", 1, "learn", false);
      };
    });
    const searchInp = $("#bank-search-q");
    if (searchInp) {
      searchInp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runBankSearch();
        }
      });
    }
    $("#cards-today") && ($("#cards-today").onclick = () => openCards(lessonCardDeck(L)));
    $("#cards-abtal") && ($("#cards-abtal").onclick = () => openCards("abtal_notes"));
    $("#cards-all") && ($("#cards-all").onclick = () => openCards("all"));
    $("#cards-wrong") && ($("#cards-wrong").onclick = () => openCards("wrong"));
    $("#cards-always") && ($("#cards-always").onclick = () => openCards("always"));
    app.querySelectorAll("[data-card-deck]").forEach((b) => {
      b.onclick = () => openCards(b.getAttribute("data-card-deck"));
    });
    $("#ac-open-cards") && ($("#ac-open-cards").onclick = () => openCards("always"));
    const goAlways = () => navigateTo("always", { push: true });
    $("#ac-full-page") && ($("#ac-full-page").onclick = goAlways);
  }

  function exportWrongBook() {
    const items = pool("wrong");
    if (!items.length) {
      alert("Wrong book is empty. Miss some questions in learn mode first.");
      return;
    }
    const lines = items.map((q, i) => {
      const ans = (q.options && q.options[q.answer]) || "";
      return `${i + 1}. [${q.topic || "?"}] ${q.q}\n   → ${ans}\n   ${q.explanation || ""}\n`;
    });
    const text = `SDLE Wrong book export — ${items.length} items — ${new Date().toISOString()}\n\n${lines.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sdle-wrong-book-${items.length}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Full progress backup (all persisted keys). Never deletes content files. */
  function exportFullProgress() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "sdle-study-path",
      keys: {},
    };
    PERSISTED_KEYS.forEach((k) => {
      data.keys[k] = store.get(k, null);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sdle-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importFullProgressFromObject(data) {
    if (!data || typeof data !== "object") throw new Error("Invalid backup file");
    const keys = data.keys && typeof data.keys === "object" ? data.keys : data;
    if (!keys || typeof keys !== "object") throw new Error("No progress keys in file");
    let wrote = 0;
    PERSISTED_KEYS.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(keys, k) && keys[k] != null) {
        if (store.set(k, keys[k])) wrote++;
      }
    });
    if (!wrote) throw new Error("Nothing imported (empty or unreadable keys)");
    return wrote;
  }

  function bindImportProgress(inputEl) {
    if (!inputEl) return;
    inputEl.onchange = () => {
      const file = inputEl.files && inputEl.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result || ""));
          const ok = confirm(
            "Import this backup? It will overwrite progress on THIS browser (stats, wrong book, days, history). Content lessons and MCQ bank are never deleted.\n\nOK = import and reload."
          );
          if (!ok) {
            inputEl.value = "";
            return;
          }
          importFullProgressFromObject(data);
          location.reload();
        } catch (e) {
          alert("Import failed: " + (e && e.message ? e.message : "bad JSON"));
          inputEl.value = "";
        }
      };
      reader.readAsText(file);
    };
  }

  /** Per-topic mock breakdown + optional delta vs previous full mock. */
  function mockTopicBreakdown(qz) {
    const byTopic = {};
    (qz.items || []).forEach((item, i) => {
      const t = item.topic || "mixed";
      if (!byTopic[t]) byTopic[t] = { a: 0, c: 0 };
      byTopic[t].a++;
      if (qz.answers[i] === item.answer) byTopic[t].c++;
    });
    return byTopic;
  }

  function mockFatigue(qz) {
    const n = (qz.items || []).length;
    if (n < 100) return null;
    const mid = Math.floor(n / 2);
    let firstOk = 0;
    let secondOk = 0;
    for (let i = 0; i < mid; i++) {
      if (qz.answers[i] === qz.items[i].answer) firstOk++;
    }
    for (let i = mid; i < n; i++) {
      if (qz.answers[i] === qz.items[i].answer) secondOk++;
    }
    const firstN = mid;
    const secondN = n - mid;
    const firstPct = firstN ? Math.round((100 * firstOk) / firstN) : null;
    const secondPct = secondN ? Math.round((100 * secondOk) / secondN) : null;
    return {
      firstPct,
      secondPct,
      delta: firstPct != null && secondPct != null ? secondPct - firstPct : null,
    };
  }

  function findPriorMock(afterTs) {
    const list = state.history || [];
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      if (!h) continue;
      if (afterTs && h.ts === afterTs) continue;
      if (h.isMock || (h.mode === "exam" && (h.total || 0) >= 100)) return h;
    }
    return null;
  }

  function mockDeltaHtml(current, prior) {
    if (!current || !current.byTopic) return "";
    const topics = Object.keys(current.byTopic).sort();
    if (!topics.length) return "";
    const rows = topics
      .map((t) => {
        const cur = current.byTopic[t] || { a: 0, c: 0 };
        const curPct = cur.a ? Math.round((100 * cur.c) / cur.a) : null;
        let priorPct = null;
        if (prior && prior.byTopic && prior.byTopic[t] && prior.byTopic[t].a) {
          const p = prior.byTopic[t];
          priorPct = Math.round((100 * p.c) / p.a);
        }
        const d = curPct != null && priorPct != null ? curPct - priorPct : null;
        const dLabel =
          d == null ? "—" : d > 0 ? `+${d}% ↑` : d < 0 ? `${d}% ↓` : "0%";
        return `<tr>
          <td>${escapeHtml(t)}</td>
          <td>${priorPct != null ? priorPct + "%" : "—"}</td>
          <td>${curPct != null ? curPct + "%" : "—"}</td>
          <td style="color:${d == null ? "inherit" : d >= 0 ? "var(--accent2)" : "var(--warn)"}">${escapeHtml(dLabel)}</td>
        </tr>`;
      })
      .join("");
    const fatigue = current.fatigue;
    const fatigueLine =
      fatigue && fatigue.firstPct != null
        ? `<p class="muted">Pace check: first half <b>${fatigue.firstPct}%</b> · second half <b>${fatigue.secondPct}%</b>${
            fatigue.delta != null
              ? ` · ${fatigue.delta >= 0 ? "+" : ""}${fatigue.delta}% second-half shift`
              : ""
          }</p>`
        : "";
    return `<div class="mock-delta alert" style="margin-top:14px">
      <strong>Mock domain scores${prior ? " vs previous mock" : ""}</strong>
      <p class="muted">Compare domains — not an official SCFHS report.</p>
      ${fatigueLine}
      <table class="hist-table inv-table" style="margin-top:8px">
        <thead><tr><th>Topic</th><th>Prior</th><th>This mock</th><th>Δ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function feedbackConfig() {
    const c = window.SDLE_FEEDBACK || {};
    return {
      ntfyTopic: (c.ntfyTopic || "sdle-study-path-feedback-xxxova2-k7m9").replace(/[^\w.-]/g, ""),
      email: String(c.email || "").trim(),
      ownerReadHint: c.ownerReadHint || "",
    };
  }

  function feedbackNtfyUrl() {
    return "https://ntfy.sh/" + feedbackConfig().ntfyTopic;
  }

  /** Deliver feedback with NO client login (ntfy + optional email). */
  async function deliverFeedback(payload) {
    const cfg = feedbackConfig();
    const kindLabel = payload.kindLabel;
    const text = [
      "Type: " + kindLabel,
      "From: " + (payload.name || "(anonymous)"),
      "When: " + payload.when,
      "URL: " + payload.appUrl,
      "",
      payload.message,
      "",
      "Device: " + (payload.device || "").slice(0, 180),
    ].join("\n");

    const errors = [];
    let okNtfy = false;
    let okEmail = false;

    // 1) ntfy.sh — free, no login for sender or reader (open topic URL).
    // Use JSON body (not Title/Tags headers): fetch rejects header values with
    // newlines or non-Latin-1 chars → "Invalid value".
    if (cfg.ntfyTopic) {
      try {
        const title = ("[SDLE " + kindLabel + "] " + String(payload.message || ""))
          .replace(/[\r\n\t]+/g, " ")
          .replace(/[^\x20-\x7E]/g, "")
          .trim()
          .slice(0, 90) || ("[SDLE " + kindLabel + "]");
        const res = await fetch("https://ntfy.sh/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: cfg.ntfyTopic,
            title: title,
            message: text,
            priority: 3,
            tags: ["speech_balloon"],
          }),
        });
        if (!res.ok) throw new Error("ntfy HTTP " + res.status);
        okNtfy = true;
      } catch (err) {
        errors.push("ntfy: " + (err && err.message ? err.message : "fail"));
      }
    }

    // 2) Optional email copy via FormSubmit (no login for client; owner confirms email once)
    if (cfg.email && cfg.email.includes("@") && !/@users\.noreply\.github\.com$/i.test(cfg.email)) {
      try {
        const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(cfg.email), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: payload.name || "Anonymous student",
            _subject: "[SDLE Feedback] " + kindLabel,
            _template: "table",
            type: kindLabel,
            message: payload.message,
            app_url: payload.appUrl,
            when: payload.when,
            device: (payload.device || "").slice(0, 240),
            _captcha: "false",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && data.success !== "true" && data.success !== true) {
          throw new Error((data && data.message) || "email HTTP " + res.status);
        }
        okEmail = true;
      } catch (err) {
        errors.push("email: " + (err && err.message ? err.message : "fail"));
      }
    }

    // 3) Remember on this device (not shared — only proof for the sender)
    try {
      const log = store.get("feedbackSentLog", []);
      log.unshift({
        ts: payload.when,
        kind: payload.kind,
        name: payload.name,
        message: payload.message.slice(0, 500),
        okNtfy,
        okEmail,
      });
      store.set("feedbackSentLog", log.slice(0, 40));
    } catch (_) {}

    return { okNtfy, okEmail, errors };
  }

  function renderFeedback() {
    const draft = store.get("feedbackDraft", {
      name: "",
      kind: "bug",
      message: "",
    });
    const cfg = feedbackConfig();
    const ntfyUrl = feedbackNtfyUrl();
    const sentLog = store.get("feedbackSentLog", []);
    const emailOn = !!(cfg.email && cfg.email.includes("@") && !/@users\.noreply\.github\.com$/i.test(cfg.email));

    app.innerHTML = `
      ${backBarHtml("← Back")}
      <h1>Feedback</h1>
      <p class="lead"><strong>No GitHub account. No login.</strong>
        Write below and tap Send — your note is delivered to the maintainer automatically.
        Optional name only. Use this for bugs, wrong MCQs, thin lessons, or mobile problems.</p>

      <section class="feedback-card simple-panel">
        <form id="feedback-form" class="feedback-form" novalidate>
          <label class="fb-field">
            <span>Your name or nickname <em>(optional)</em></span>
            <input type="text" id="fb-name" name="name" maxlength="80" autocomplete="nickname"
              placeholder="e.g. Ahmed" value="${escapeHtml(draft.name || "")}" />
          </label>
          <label class="fb-field">
            <span>Type</span>
            <select id="fb-kind" name="kind">
              <option value="bug" ${draft.kind === "bug" ? "selected" : ""}>Bug / broken thing</option>
              <option value="content" ${draft.kind === "content" ? "selected" : ""}>Wrong content / MCQ / lesson</option>
              <option value="mobile" ${draft.kind === "mobile" ? "selected" : ""}>Mobile / phone layout</option>
              <option value="idea" ${draft.kind === "idea" ? "selected" : ""}>Idea / feature</option>
              <option value="other" ${draft.kind === "other" ? "selected" : ""}>Other</option>
            </select>
          </label>
          <label class="fb-field">
            <span>Your feedback <em>(required)</em></span>
            <textarea id="fb-message" name="message" rows="8" required maxlength="8000"
              placeholder="What happened? Which day/tab/MCQ? What did you expect?">${escapeHtml(draft.message || "")}</textarea>
          </label>
          <p class="muted-hint">Tip: include Day number, tab name, or question text if something is wrong.</p>
          <div class="feedback-actions">
            <button type="submit" class="btn success" id="fb-submit">Send feedback</button>
            <button type="button" class="btn ghost" id="fb-save-draft">Save draft on this device</button>
          </div>
          <p id="fb-status" class="fb-status" role="status" aria-live="polite"></p>
        </form>
      </section>

      <section class="simple-panel" style="margin-top:16px">
        <h3 class="section-label">How the owner reads feedback</h3>
        <p class="lead">Students do <b>not</b> need accounts. You (maintainer) open this inbox anytime:</p>
        <div class="volume-grid">
          <a class="btn success" href="${escapeHtml(ntfyUrl)}" target="_blank" rel="noopener">Open feedback inbox</a>
          <a class="btn ghost" href="${REPO_URL}" target="_blank" rel="noopener">Source code</a>
          <a class="btn ghost" href="${REPO_URL}/blob/main/INTRO.md" target="_blank" rel="noopener">Intro letter</a>
        </div>
        <p class="muted-hint" style="margin-top:10px">
          Inbox link: <code style="word-break:break-all">${escapeHtml(ntfyUrl)}</code><br>
          Email copies: <b>${emailOn ? "ON → " + escapeHtml(cfg.email) : "OFF — set your Gmail in data/feedback_config.js for permanent email archive"}</b><br>
          Free ntfy keeps recent messages; email is better for long-term history.
        </p>
      </section>

      ${
        sentLog.length
          ? `<section class="simple-panel" style="margin-top:16px">
        <h3 class="section-label">Sent from this device (${sentLog.length})</h3>
        <ul class="fb-sent-list">${sentLog
          .slice(0, 8)
          .map(
            (x) =>
              `<li><b>${escapeHtml(x.kind || "")}</b> · ${escapeHtml((x.message || "").slice(0, 120))}
              <span class="muted-hint">${escapeHtml(x.ts || "")} · ${x.okNtfy ? "delivered" : "may have failed"}</span></li>`
          )
          .join("")}</ul>
      </section>`
          : ""
      }`;

    bindBackBar();

    const saveDraft = () => {
      store.set("feedbackDraft", {
        name: ($("#fb-name") && $("#fb-name").value) || "",
        kind: ($("#fb-kind") && $("#fb-kind").value) || "bug",
        message: ($("#fb-message") && $("#fb-message").value) || "",
      });
    };

    $("#fb-save-draft") &&
      ($("#fb-save-draft").onclick = () => {
        saveDraft();
        const st = $("#fb-status");
        if (st) st.textContent = "Draft saved on this phone/computer only (not sent yet).";
      });

    $("#feedback-form") &&
      ($("#feedback-form").onsubmit = async (e) => {
        e.preventDefault();
        const name = (($("#fb-name") && $("#fb-name").value) || "").trim();
        const kind = (($("#fb-kind") && $("#fb-kind").value) || "other").trim();
        const message = (($("#fb-message") && $("#fb-message").value) || "").trim();
        const st = $("#fb-status");
        const btn = $("#fb-submit");
        if (!message || message.length < 8) {
          if (st) st.textContent = "Please write a bit more detail (at least a short sentence).";
          return;
        }
        saveDraft();
        const kindLabel = {
          bug: "Bug",
          content: "Content",
          mobile: "Mobile",
          idea: "Idea",
          other: "Feedback",
        }[kind] || "Feedback";

        if (btn) {
          btn.disabled = true;
          btn.textContent = "Sending…";
        }
        if (st) st.textContent = "Sending — no login needed…";

        const result = await deliverFeedback({
          name,
          kind,
          kindLabel,
          message,
          when: new Date().toISOString(),
          appUrl: typeof location !== "undefined" ? location.href : "",
          device: typeof navigator !== "undefined" ? navigator.userAgent : "",
        });

        if (btn) {
          btn.disabled = false;
          btn.textContent = "Send feedback";
        }

        if (result.okNtfy || result.okEmail) {
          store.set("feedbackDraft", { name, kind, message: "" });
          if ($("#fb-message")) $("#fb-message").value = "";
          if (st) {
            st.innerHTML =
              "<strong>Sent.</strong> The maintainer can read it in the feedback inbox" +
              (result.okEmail ? " and by email" : "") +
              ". Thank you — no account required.";
          }
          // refresh sent list quietly
          setTimeout(() => {
            if (state.view === "feedback") renderFeedback();
          }, 600);
        } else {
          if (st) {
            st.innerHTML =
              "Could not deliver (" +
              escapeHtml((result.errors || []).join("; ") || "network") +
              "). Check internet and try again.";
          }
        }
      });
  }

  function renderProgress() {
    const s = state.stats;
    const pct = s.answered ? Math.round((100 * s.correct) / s.answered) : 0;
    const topics = ["restorative", "perio", "endo", "oms", "ortho_pedo", "ethics", "mixed"];
    const m = maxDay();
    const daysDone = Object.keys(state.dayDone || {}).filter((k) => {
      const d = +k;
      return state.dayDone[k] && d >= 1 && d <= m;
    }).length;

    const histRows = !(state.history || []).length
      ? `<p class="muted">No sessions yet.</p>`
      : `<table class="hist-table inv-table">
        <thead><tr><th>When</th><th>Pool</th><th>Score</th></tr></thead>
        <tbody>
          ${(state.history || [])
            .slice(0, 20)
            .map((h) => {
              const score =
                h.pct != null
                  ? `${h.pct}% (${h.correct}/${h.total})`
                  : h.total != null
                    ? `${h.correct ?? "—"}/${h.total}`
                    : "—";
              const col = h.pct == null ? "" : h.pct >= 80 ? "color:var(--accent2)" : "color:var(--warn)";
              return `<tr>
                <td>${escapeHtml(formatWhen(h.ts))}</td>
                <td>${escapeHtml((h.label || h.topic || "—").slice(0, 40))}</td>
                <td style="${col}"><b>${escapeHtml(score)}</b></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>`;

    const topicRows = topics
      .map((t) => {
        const x = s.byTopic[t] || { a: 0, c: 0 };
        if (!x.a) return "";
        const p = Math.round((100 * x.c) / x.a);
        return `<tr><td>${escapeHtml(t)}</td><td>${x.c}/${x.a}</td><td>${p}%</td></tr>`;
      })
      .filter(Boolean)
      .join("");

    app.innerHTML = `
      <div class="progress-clean">
        <h1>Progress</h1>
        <div class="stat-row">
          <div class="stat-box"><div class="num">${s.answered || 0}</div><div class="lbl">Answered</div></div>
          <div class="stat-box"><div class="num" style="color:${pct >= 80 ? "var(--accent2)" : "var(--warn)"}">${pct}%</div><div class="lbl">Accuracy</div></div>
          <div class="stat-box"><div class="num">${daysDone}/${m}</div><div class="lbl">Days done</div></div>
          <div class="stat-box"><div class="num">${state.wrongBook.length}</div><div class="lbl">Wrong book</div></div>
        </div>
        <p class="muted progress-meta">Today ${state.sessionAnswered} Q · ${state.planLength}-day plan · aim ≥80%</p>

        <section class="simple-panel">
          <h3 class="section-label">By topic</h3>
          ${
            topicRows
              ? `<table><thead><tr><th>Topic</th><th>Correct</th><th>%</th></tr></thead><tbody>${topicRows}</tbody></table>`
              : `<p class="muted">Answer MCQs to fill this.</p>`
          }
        </section>

        <section class="simple-panel">
          <h3 class="section-label">Recent sessions</h3>
          ${histRows}
        </section>

        <p class="hub-foot-links">
          <button type="button" class="btn-link" id="reset">Reset all progress…</button>
        </p>
      </div>`;

    $("#reset").onclick = () => {
      if (
        confirm(
          "Reset progress, stats, wrong book, seen history, session log, and lesson Exam Q&A scores?"
        )
      ) {
        state.stats = { answered: 0, correct: 0, byTopic: {}, bySubtopic: {} };
        state.wrongBook = [];
        state.seenIds = {};
        state.history = [];
        state.stepsDone = {};
        state.dayDone = {};
        state.cardKnown = {};
        state.examQa = {};
        state.sessionAnswered = 0;
        state.sessionDate = todayKey();
        state.planDayAnswered = 0;
        state.planDayVolumeKey = planDayVolumeKeyOf();
        save();
        render();
      }
    };
  }

  /* ——— QUIZ ——— */
  function allQ() {
    // usable:false = quarantined (image-only / polluted extract) — keep in bank for audit, skip in practice
    return (window.QUESTION_BANK || []).filter((q) => q && q.usable !== false);
  }

  /**
   * Preferred MCQs — from «تحديث خطة المذاكرة» (رفيع) + SCFHS SDLE blueprint.
   *
   * أبطال الديجيتال = highly recommended (recalls). Prefer almost all usable أبطال.
   *
   * رفيع study order (plan):
   *   1st — parts 11–19 (mostly أبطال windows + references): 11…19
   *   2nd — parts 7, 5, 10, 9, 1, 3
   *   Extra only (archive default): 2, 4, 6, 8 (بيان / board / e-dental) + 20
   * Study subject-by-subject across files; last 2 weeks = full-file random review.
   *
   * Preferred cut (not full 16k dump):
   *   A) أبطال — nearly all usable (high priority)
   *   B) Curated: free points, premium_*, stream, saud_delta
   *   C) رفيع 11–19 quality full MCQs (core)
   *   D) رفيع 7/5/10/9/1/3 quality full MCQs (second wave)
   * Archive = thin pads + رفيع 2/4/6/8/20 + other low-signal extracts.
   */
  const RAFI_CORE_FIRST = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19]);
  const RAFI_CORE_SECOND = new Set([7, 5, 10, 9, 1, 3]);
  const RAFI_EXTRA_ONLY = new Set([2, 4, 6, 8, 20]);

  function optionPadCount(q) {
    const opts = (q && q.options) || [];
    let n = 0;
    for (let i = 0; i < opts.length; i++) {
      const t = String(opts[i] || "").toLowerCase();
      if (t.includes("not listed") || /^option\s*[a-d]\b/i.test(t)) n++;
    }
    return n;
  }

  function realOptionCount(q) {
    return Math.max(0, ((q && q.options) || []).length - optionPadCount(q));
  }

  function stemLen(q) {
    return String((q && (q.q || q.stem)) || "").trim().length;
  }

  function isCuratedPreferred(q) {
    const s = String((q && q.source) || "");
    const id = String((q && q.id) || "");
    if (s === "always" || s === "saud_delta") return true;
    if (s.startsWith("premium") || s.startsWith("stream")) return true;
    if (id.startsWith("stream") || id.startsWith("pass_")) return true;
    if (/^(op_|per_|end_|fr_|oped|eth|hy|gd_)/.test(id)) return true;
    return false;
  }

  function isAbtalSource(q) {
    const s = String((q && q.source) || "");
    const id = String((q && q.id) || "");
    return s === "abtal" || id.startsWith("ab2") || id.startsWith("abtal");
  }

  function rafiPartNum(q) {
    const s = String((q && q.source) || "");
    const id = String((q && q.id) || "");
    const m = s.match(/^rafi_(\d+)/) || id.match(/^rafi_(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }

  /** أبطال: highly recommended — keep almost everything with a real stem. */
  function isAbtalPreferred(q) {
    if (!isAbtalSource(q)) return false;
    return stemLen(q) >= 10;
  }

  function isRafiPreferred(q) {
    const part = rafiPartNum(q);
    if (part == null || RAFI_EXTRA_ONLY.has(part)) return false;
    const real = realOptionCount(q);
    const sl = stemLen(q);
    const pads = optionPadCount(q);
    // Core first (11–19): slightly looser — plan says start here (references)
    if (RAFI_CORE_FIRST.has(part)) {
      return real >= 3 && sl >= 25 && pads <= 1;
    }
    // Second wave (7,5,10,9,1,3)
    if (RAFI_CORE_SECOND.has(part)) {
      return real >= 4 && pads === 0 && sl >= 35;
    }
    return false;
  }

  function isPreferredMcq(q) {
    if (!q || q.usable === false) return false;
    // Order of importance for study: أبطال → curated → رفيع plan waves
    if (isAbtalPreferred(q)) return true;
    if (isCuratedPreferred(q)) return true;
    if (isRafiPreferred(q)) return true;
    return false;
  }

  const SUBTOPIC_KEYS = new Set([
    "operative",
    "fixed",
    "implant",
    "rpd",
    "complete_denture",
    "materials",
    "restorative_general",
  ]);

  /** ALL / huge counts → entire pool (bank is large; prefer pool "preferred" for study) */
  const QUIZ_ALL = 99999;

  function isSeen(id) {
    return !!(id && state.seenIds && state.seenIds[id]);
  }

  function markSeen(id) {
    if (!id) return;
    if (!state.seenIds) state.seenIds = {};
    state.seenIds[id] = true;
  }

  /** Topic accuracy rows for weak-pack ranking */
  function topicAccuracyList() {
    const keys = ["restorative", "perio", "endo", "oms", "ortho_pedo", "ethics", "mixed"];
    return keys.map((t) => {
      const x = (state.stats.byTopic && state.stats.byTopic[t]) || { a: 0, c: 0 };
      const a = x.a || 0;
      const c = x.c || 0;
      return { topic: t, a, c, pct: a ? (100 * c) / a : null };
    });
  }

  /**
   * Rank topics: practiced & under 80% first (worst first), then least practiced, then strong.
   * Used for Day 11-style weak packs.
   */
  function weakRankedTopics() {
    const list = topicAccuracyList();
    const practicedWeak = list.filter((x) => x.a >= 8 && x.pct != null && x.pct < 80).sort((a, b) => a.pct - b.pct);
    const unpracticed = list.filter((x) => x.a < 8).sort((a, b) => a.a - b.a);
    const practicedStrong = list.filter((x) => x.a >= 8 && x.pct != null && x.pct >= 80).sort((a, b) => a.pct - b.pct);
    return practicedWeak.concat(unpracticed, practicedStrong);
  }

  function weakTopicKeys(n) {
    const ranked = weakRankedTopics();
    const pick = ranked.slice(0, n || 3).map((x) => x.topic);
    // Cold start: exam-weight subjects
    if (!pick.length || ranked.every((x) => x.a === 0)) return ["restorative", "perio", "endo"];
    return pick;
  }

  function smartPackHint() {
    const seenN = Object.keys(state.seenIds || {}).length;
    const unseenN = poolN("unseen");
    const weakKeys = weakTopicKeys(3);
    const ranks = weakRankedTopics()
      .slice(0, 3)
      .map((x) => {
        if (x.a < 8) return `${x.topic} (few: ${x.a})`;
        return `${x.topic} ${Math.round(x.pct)}%`;
      });
    return `Seen ${seenN} · Unseen ${unseenN} · Weak focus: ${ranks.join(" · ") || weakKeys.join(", ")}`;
  }

  /** "unseen" | "unseen:operative" | "dept@scope" (plan: endo across all rafi/abtal) */
  function unseenTopic(base) {
    const b = !base || base === "all" || base === "unseen" || base === "weak" || base === "wrong" ? "all" : base;
    return b === "all" ? "unseen" : "unseen:" + b;
  }

  /**
   * Pool keys:
   *   endo | restorative | …
   *   endo@plan | endo@abtal | endo@rafi_core | endo@rafi_second | endo@rafi_plan | endo@all
   * Scope = which files; dept = subject (خطة: department across files, not file-by-file).
   */
  function parsePoolTopic(topic) {
    const raw = String(topic == null ? "all" : topic);
    if (raw === "unseen") return { base: "all", sourceScope: null, unseenOnly: true };
    if (raw.startsWith("unseen:")) {
      const rest = raw.slice(7) || "all";
      if (rest.includes("@")) {
        const [dept, scope] = rest.split("@");
        return { base: dept || "all", sourceScope: scope || "plan", unseenOnly: true };
      }
      return { base: rest, sourceScope: null, unseenOnly: true };
    }
    if (raw.includes("@")) {
      const [dept, scope] = raw.split("@");
      return { base: dept || "all", sourceScope: scope || "plan", unseenOnly: false };
    }
    return { base: raw, sourceScope: null, unseenOnly: false };
  }

  /** Blueprint department from topic + department + subtopics (رفيع tags both). */
  function matchesDepartment(q, dept) {
    if (!dept || dept === "all") return true;
    const d = String((q && q.department) || "").toLowerCase();
    const t = String((q && q.topic) || "").toLowerCase();
    const st = (q && q.subtopics) || [];
    const has = (s) => st.includes(s);

    if (dept === "endo") return t === "endo" || d === "endo";
    if (dept === "perio") return t === "perio" || d === "perio";
    if (dept === "oms") return t === "oms" || d === "oms";
    if (dept === "ortho_pedo") return t === "ortho_pedo" || d === "ortho_pedo";
    if (dept === "ethics") return t === "ethics" || d === "ethics";
    if (dept === "mixed") return t === "mixed" || d === "mixed";
    if (dept === "operative") {
      if (d === "operative" || has("operative")) return true;
      if (String((q && q.source) || "") === "premium_operative") return true;
      if (t === "restorative" && !has("fixed") && !has("rpd") && !has("implant") && d !== "fixed" && d !== "rpd") {
        /* bare restorative without prostho tags — count as operative-ish only if no prostho dept */
        return d === "" || d === "operative" || has("restorative_general") || has("materials") || has("isolation");
      }
      return false;
    }
    if (dept === "fixed") return d === "fixed" || has("fixed");
    if (dept === "rpd") return d === "rpd" || has("rpd");
    if (dept === "implant") return d === "implant" || has("implant");
    if (dept === "materials") return has("materials") || d === "materials";
    if (dept === "complete_denture") return has("complete_denture");
    if (dept === "restorative") {
      if (t === "restorative") return true;
      if (["operative", "fixed", "rpd", "implant"].includes(d)) return true;
      if (st.some((s) => ["operative", "fixed", "rpd", "implant", "materials", "complete_denture", "restorative_general"].includes(s)))
        return true;
      return false;
    }
    return t === dept || d === dept;
  }

  function inSourceScope(q, scope) {
    if (!scope || scope === "all") return true;
    if (scope === "plan" || scope === "preferred") return isPreferredMcq(q);
    if (scope === "abtal") return isAbtalSource(q);
    if (scope === "rafi_core") {
      const part = rafiPartNum(q);
      return part != null && RAFI_CORE_FIRST.has(part);
    }
    if (scope === "rafi_second") {
      const part = rafiPartNum(q);
      return part != null && RAFI_CORE_SECOND.has(part);
    }
    if (scope === "rafi_plan") {
      /* خطة: 11–19 then 7,5,10,9,1,3 — not 2/4/6/8 */
      const part = rafiPartNum(q);
      return part != null && (RAFI_CORE_FIRST.has(part) || RAFI_CORE_SECOND.has(part));
    }
    if (scope === "rafi") {
      return String((q && q.source) || "").startsWith("rafi_") || String((q && q.id) || "").startsWith("rafi_");
    }
    if (scope === "archive") return !isPreferredMcq(q);
    return true;
  }

  function pool(topic) {
    const { base, sourceScope, unseenOnly } = parsePoolTopic(topic);
    let p = allQ();

    /* Source scope first when using dept@scope (department-first plan) */
    if (sourceScope) {
      p = p.filter((q) => inSourceScope(q, sourceScope));
      if (base && base !== "all") {
        if (base === "operative") {
          p = p.filter((q) => matchesDepartment(q, "operative"));
        } else if (SUBTOPIC_KEYS.has(base)) {
          p = p.filter((q) => matchesDepartment(q, base));
        } else {
          p = p.filter((q) => matchesDepartment(q, base));
        }
      }
      if (unseenOnly) p = p.filter((q) => !isSeen(q.id));
      return p;
    }

    if (base === "wrong") p = state.wrongBook.map((id) => p.find((q) => q.id === id)).filter(Boolean);
    else if (base === "search_hits") {
      const ids = state.searchHitIds || [];
      const byId = new Map(p.map((q) => [q.id, q]));
      p = ids.map((id) => byId.get(id)).filter(Boolean);
    } else if (base === "preferred") p = p.filter((q) => isPreferredMcq(q));
    else if (base === "archive") p = p.filter((q) => !isPreferredMcq(q));
    else if (base === "always_src") p = p.filter((q) => q.source === "always");
    else if (base === "saud_delta") p = p.filter((q) => q.source === "saud_delta");
    else if (base === "abtal") p = p.filter((q) => isAbtalSource(q));
    else if (base === "rafi_core")
      p = p.filter((q) => {
        const part = rafiPartNum(q);
        return part != null && RAFI_CORE_FIRST.has(part);
      });
    else if (base === "rafi_second")
      p = p.filter((q) => {
        const part = rafiPartNum(q);
        return part != null && RAFI_CORE_SECOND.has(part);
      });
    else if (base === "rafi")
      p = p.filter((q) => String(q.source || "").startsWith("rafi_") || String(q.id || "").startsWith("rafi_"));
    else if (base === "stream")
      p = p.filter((q) => String(q.source || "").startsWith("stream"));
    else if (base === "weak") {
      const keys = weakTopicKeys(3);
      p = p.filter((q) => keys.some((k) => matchesDepartment(q, k)));
      const wrongSet = new Set(state.wrongBook || []);
      p = p.slice().sort((a, b) => (wrongSet.has(b.id) ? 1 : 0) - (wrongSet.has(a.id) ? 1 : 0));
    } else if (base === "all" || !base) {
      /* keep all */
    } else if (String(base).includes(",")) {
      const parts = String(base)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const topicSet = new Set(parts.filter((t) => !SUBTOPIC_KEYS.has(t) && t !== "unseen" && t !== "weak"));
      const subSet = new Set(parts.filter((t) => SUBTOPIC_KEYS.has(t)));
      const wantUnseen = parts.includes("unseen");
      p = p.filter((q) => {
        if (wantUnseen && isSeen(q.id)) return false;
        const st = q.subtopics || [];
        const topicOk = !topicSet.size || [...topicSet].some((td) => matchesDepartment(q, td));
        const subOk = !subSet.size || st.some((s) => subSet.has(s)) || [...subSet].some((s) => matchesDepartment(q, s));
        if (topicSet.size && subSet.size) return topicOk && subOk;
        if (subSet.size) return subOk;
        return topicOk;
      });
    } else if (base === "operative") {
      p = p.filter((q) => matchesDepartment(q, "operative"));
    } else if (SUBTOPIC_KEYS.has(base)) {
      p = p.filter((q) => matchesDepartment(q, base));
    } else {
      /* Blueprint topics: use department field too (رفيع tagged both) */
      p = p.filter((q) => matchesDepartment(q, base));
    }

    if (unseenOnly) p = p.filter((q) => !isSeen(q.id));
    return p;
  }

  function poolN(topic) {
    return pool(topic).length;
  }

  /** Normalize paste/search text for MCQ lookup across full bank. */
  function normalizeMcqSearch(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\u200f\u200e\u202a-\u202e]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Search all ~16k MCQs by pasted stem / keywords.
   * Returns [{ q, score }] sorted best-first.
   */
  function searchQuestionBank(rawQuery, limit) {
    const lim = Math.min(Math.max(limit || 40, 1), 80);
    const qNorm = normalizeMcqSearch(rawQuery);
    if (qNorm.length < 3) return [];
    const words = qNorm.split(" ").filter((w) => w.length >= 3);
    const phrase = qNorm.length > 100 ? qNorm.slice(0, 90) : qNorm;
    const shortPhrase = qNorm.slice(0, 48);
    const bank = allQ();
    const hits = [];
    for (let i = 0; i < bank.length; i++) {
      const item = bank[i];
      if (!item || !item.q) continue;
      const stem = normalizeMcqSearch(item.q);
      if (!stem) continue;
      let score = 0;
      if (stem === qNorm) score = 10000;
      else if (stem.includes(qNorm) || qNorm.includes(stem)) score = 8000 + Math.min(stem.length, 200);
      else if (shortPhrase.length >= 12 && stem.includes(shortPhrase)) score = 5000;
      else if (phrase.length >= 16 && stem.includes(phrase)) score = 4000;
      else if (words.length) {
        let hit = 0;
        for (let w = 0; w < words.length; w++) {
          if (stem.includes(words[w])) hit++;
        }
        if (hit === 0) continue;
        score = hit * 100 + (hit === words.length ? 500 : 0);
        /* options / explanation boost */
        const opts = Array.isArray(item.options) ? item.options.join(" ") : "";
        const blob = normalizeMcqSearch(opts + " " + (item.explanation || ""));
        for (let w = 0; w < words.length; w++) {
          if (blob.includes(words[w])) score += 8;
        }
      } else continue;
      if (score > 0) hits.push({ q: item, score });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, lim);
  }

  function bankInventory() {
    return {
      all: poolN("all"),
      preferred: poolN("preferred"),
      archive: poolN("archive"),
      always: poolN("always_src"),
      saud_delta: poolN("saud_delta"),
      abtal: poolN("abtal"),
      rafi_core: poolN("rafi_core"),
      rafi_second: poolN("rafi_second"),
      rafi: poolN("rafi"),
      stream: poolN("stream"),
      restorative: poolN("restorative"),
      operative: poolN("operative"),
      fixed: poolN("fixed"),
      implant: poolN("implant"),
      rpd: poolN("rpd"),
      complete_denture: poolN("complete_denture"),
      materials: poolN("materials"),
      perio: poolN("perio"),
      endo: poolN("endo"),
      oms: poolN("oms"),
      ortho_pedo: poolN("ortho_pedo"),
      ethics: poolN("ethics"),
      mixed: poolN("mixed"),
      wrong: poolN("wrong"),
      unseen: poolN("unseen"),
      unseen_operative: poolN("unseen:operative"),
      unseen_restorative: poolN("unseen:restorative"),
      unseen_perio: poolN("unseen:perio"),
      unseen_endo: poolN("unseen:endo"),
      unseen_oms: poolN("unseen:oms"),
      weak: poolN("weak"),
      seen: Object.keys(state.seenIds || {}).length,
    };
  }

  /** Build size list that scales with pool — never hide volume behind a single 50. */
  function sizeLadder(poolSize, prefer) {
    const candidates = prefer || [25, 50, 100, 150, 200, 300, 500, 750, 1000];
    const out = [];
    for (const n of candidates) {
      if (n <= poolSize) out.push(n);
    }
    // If pool is between rungs, still offer nearest under-pool sizes already added
    if (poolSize >= 20 && !out.includes(50) && poolSize < 50) out.push(Math.min(50, poolSize));
    if (poolSize > 0 && (out.length === 0 || out[out.length - 1] < poolSize)) {
      /* ALL always last */
    }
    return out;
  }

  function volBtn(topic, n, shortLabel, cls) {
    const p = poolN(topic);
    const take = n >= QUIZ_ALL ? p : Math.min(n, p);
    const isAll = n >= QUIZ_ALL;
    const label = isAll ? `${shortLabel} ALL (${p})` : `${shortLabel} ${n}`;
    const disabled = p === 0 ? "disabled" : "";
    const dim = !isAll && n > p ? " ghost" : "";
    return `<button type="button" class="btn vol-btn${dim}${cls ? " " + cls : ""}" data-t="${escapeHtml(topic)}" data-n="${
      isAll ? QUIZ_ALL : n
    }" title="${p} in pool · starts ${take}" ${disabled}>${escapeHtml(label)}<span class="vol-meta">${p}</span></button>`;
  }

  function volBlock(title, topic, sizes, shortLabel) {
    const p = poolN(topic);
    const ladder = (sizes || sizeLadder(p)).filter((n) => n === "ALL" || n <= p || n <= 50);
    const parts = [];
    for (const s of ladder) {
      if (s === "ALL") continue;
      if (typeof s === "number" && s > p && s > 50) continue;
      parts.push(volBtn(topic, s, shortLabel || title, ""));
    }
    parts.push(volBtn(topic, QUIZ_ALL, shortLabel || title, "success"));
    return `<div class="vol-block">
      <div class="vol-head"><strong>${escapeHtml(title)}</strong><span class="vol-pool"><b>${p}</b> questions in pool</span></div>
      <div class="volume-grid">${parts.join("")}</div>
    </div>`;
  }

  function bindVolButtons(root) {
    (root || app).querySelectorAll("button.vol-btn[data-t]").forEach((b) => {
      b.onclick = () => startQuiz(b.dataset.t, +b.dataset.n, "learn", false);
    });
  }

  function inventoryTableHtml(inv) {
    const rows = [
      ["Preferred (أبطال + curated + core رفيع)", inv.preferred || 0],
      ["أبطال (highly recommended)", inv.abtal || 0],
      ["رفيع 11–19 first (plan)", inv.rafi_core || 0],
      ["رفيع 7·5·10·9·1·3 (plan)", inv.rafi_second || 0],
      ["Archive (not preferred)", inv.archive || 0],
      ["Full usable bank", inv.all],
      ["Unseen (never answered)", inv.unseen],
      ["Unseen operative", inv.unseen_operative],
      ["Unseen restorative", inv.unseen_restorative],
      ["Seen (answered once+)", inv.seen],
      ["Weak pack (lowest topics)", inv.weak],
      ["Flashcards loaded", ensureFlashcards().length],
      ["Free points (always)", inv.always],
      ["Saud delta (تلخيص سعود)", inv.saud_delta || 0],
      ["Restorative", inv.restorative],
      ["Operative (subtopic)", inv.operative],
      ["Fixed / Implant / RPD", `${inv.fixed} / ${inv.implant} / ${inv.rpd}`],
      ["Perio", inv.perio],
      ["Endo", inv.endo],
      ["OMS", inv.oms],
      ["Ortho/Pedo", inv.ortho_pedo],
      ["Ethics/Med", inv.ethics],
      ["Mixed", inv.mixed],
      ["Wrong book", inv.wrong],
    ];
    return `<table class="inv-table"><thead><tr><th>Pool</th><th>Count</th></tr></thead><tbody>
      ${rows.map(([a, b]) => `<tr><td>${a}</td><td><b>${b}</b></td></tr>`).join("")}
    </tbody></table>`;
  }

  function runMock(type) {
    const map = {
      25: { topic: "all", count: 25, sec: 72 },
      50: { topic: "all", count: 50, sec: 72 },
      100: { topic: "all", count: 100, sec: 72 },
      150: { topic: "all", count: 150, sec: 72 },
      200: { topic: "all", count: 200, sec: 72 },
      resto40: { topic: "restorative", count: 40, sec: 72 },
      resto50: { topic: "restorative", count: 50, sec: 72 },
      resto100: { topic: "restorative", count: 100, sec: 72 },
      resto150: { topic: "restorative", count: 150, sec: 72 },
      resto200: { topic: "restorative", count: 200, sec: 72 },
      op50: { topic: "operative", count: 50, sec: 72 },
      op100: { topic: "operative", count: 100, sec: 72 },
      op150: { topic: "operative", count: 150, sec: 72 },
      op200: { topic: "operative", count: 200, sec: 72 },
      perio50: { topic: "perio", count: 50, sec: 72 },
      perio100: { topic: "perio", count: 100, sec: 72 },
      endo50: { topic: "endo", count: 50, sec: 72 },
      endo100: { topic: "endo", count: 100, sec: 72 },
      oms50: { topic: "oms", count: 50, sec: 72 },
      oms100: { topic: "oms", count: 100, sec: 72 },
      oms200: { topic: "oms", count: 200, sec: 72 },
      ortho50: { topic: "ortho_pedo", count: 50, sec: 72 },
      ortho100: { topic: "ortho_pedo", count: 100, sec: 72 },
      ethics50: { topic: "ethics", count: 50, sec: 72 },
      fp50: { topic: "always_src", count: 50, sec: 72 },
    };
    const c = map[type] || map[25];
    startQuiz(c.topic, c.count, "exam", true, c.sec);
  }

  function topicLabelOf(topic) {
    if (topic === "always_src") return "Free points";
    if (topic === "saud_delta") return "Saud delta";
    if (topic === "abtal") return "أبطال الديجيتال";
    if (topic === "rafi") return "رفيع المقام";
    if (topic === "stream") return "Stream recalls";
    if (topic === "wrong") return "Wrong book";
    if (topic === "search_hits") return "Search results";
    if (topic === "all") return "Full bank";
    if (topic === "unseen") return "Unseen";
    if (topic === "weak") return `Weak (${weakTopicKeys(3).join("+")})`;
    if (String(topic).startsWith("unseen:")) return "Unseen " + String(topic).slice(7);
    const cat = MCQ_CATEGORIES.find((c) => c.pool === topic);
    if (cat) return cat.label;
    return String(topic);
  }

  function unbindQuizKeys() {
    if (quizKeyHandler) {
      document.removeEventListener("keydown", quizKeyHandler);
      quizKeyHandler = null;
    }
  }

  function bindQuizKeys() {
    unbindQuizKeys();
    quizKeyHandler = (e) => {
      if (state.view !== "quiz" || !state.quiz) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const qz = state.quiz;
      const next = $("#btn-next");
      const showAns = $("#btn-show-ans");
      const locked = qz.mode === "test" && qz.answers[qz.i] != null;
      const answered = (next && !next.hidden) || locked;
      if (answered && (k === "Enter" || k === "n" || k === "N" || k === " " || k === "ArrowRight")) {
        e.preventDefault();
        if (next && !next.hidden) next.click();
        return;
      }
      if (locked && (k === "r" || k === "R") && showAns && !showAns.hidden && !showAns.disabled) {
        e.preventDefault();
        showAns.click();
        return;
      }
      if (answered) return;
      const map = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      if (map[k] != null) {
        e.preventDefault();
        const opts = app.querySelectorAll(".option");
        if (opts[map[k]] && !opts[map[k]].disabled) pick(map[k]);
      }
    };
    document.addEventListener("keydown", quizKeyHandler);
  }

  function startQuiz(topic, count, mode, timed, secPer) {
    let p = pool(topic);
    if (!p.length) {
      const hint = String(topic).startsWith("unseen")
        ? "Unseen pool is empty for this filter — try another subject, Weak pack, Wrong book, or Full bank."
        : topic === "weak"
          ? "Weak pack is empty. Answer more MCQs so topic stats exist, or use subject buttons."
          : "No questions in this pool yet. Try another subject or do more quizzes to fill wrong book.";
      alert(hint);
      return;
    }
    const { base } = parsePoolTopic(topic);
    // Weak: wrong-book items from weak topics first, then shuffle the rest
    if (base === "weak") {
      const wrongSet = new Set(state.wrongBook || []);
      const w = shuffle(p.filter((q) => wrongSet.has(q.id)));
      const rest = shuffle(p.filter((q) => !wrongSet.has(q.id)));
      p = w.concat(rest);
    } else {
      p = shuffle(p);
    }
    const n = !count || count >= QUIZ_ALL ? p.length : Math.min(count, p.length);
    p = p.slice(0, n);
    const topicLabel = topicLabelOf(topic);
    const modeLabel =
      mode === "exam" ? "Mock" : mode === "test" ? "Test" : "Learn";
    state.quiz = {
      items: p,
      i: 0,
      mode,
      timed,
      topic,
      answers: [],
      revealed: [],
      learnOk: 0,
      learnN: 0,
      startedAt: Date.now(),
      seconds: timed ? p.length * (secPer || 60) : null,
      label: `${modeLabel} · ${topicLabel} · ${p.length}Q`,
      returnView:
        state.view && state.view !== "quiz"
          ? state.view
          : mode === "test"
            ? "mcqs"
            : viewStack[viewStack.length - 1] || "today",
    };
    // Push origin so ← Back returns to the tab that started the quiz
    if (state.view && state.view !== "quiz" && viewStack[viewStack.length - 1] !== state.view) {
      viewStack.push(state.view);
      if (viewStack.length > 24) viewStack = viewStack.slice(-24);
      saveViewStack();
    }
    if (timed) startQuizTimer();
    else clearQuizTimer();
    state.view = "quiz";
    renderQuizUI();
  }

  function renderQuizUI() {
    const qz = state.quiz;
    if (!qz) {
      unbindQuizKeys();
      state.view = "today";
      setActiveNav("today");
      render();
      return;
    }
    if (qz.i >= qz.items.length) {
      finishQuiz();
      return;
    }
    const item = qz.items[qz.i];
    const locked = qz.mode === "test" && qz.answers[qz.i] != null;
    const picked = locked ? qz.answers[qz.i] : null;
    const revealed = qz.mode === "test" && qz.revealed && qz.revealed[qz.i];
    const kbHint =
      qz.mode === "test"
        ? "Keys: <b>A B C D</b> answer · <b>R</b> show answer · <b>Enter / N</b> next"
        : qz.mode === "exam"
          ? "Keys: <b>A B C D</b> — exam advances immediately"
          : "Keys: <b>A B C D</b> (or 1–4) answer · <b>Enter / N</b> next";

    const showNext = qz.mode === "test" && locked;
    const showAnsBtn = qz.mode === "test" && locked && !revealed;
    const actionsHtml = `
        <div class="quiz-actions${showNext || qz.mode === "learn" ? " quiz-actions-sticky" : ""}">
          ${
            qz.mode === "test"
              ? `<button class="btn ghost" id="btn-show-ans" ${!showAnsBtn ? "hidden" : ""}>Show answer</button>`
              : ""
          }
          <button class="btn btn-next-main" id="btn-next" ${showNext ? "" : "hidden"}>Next →</button>
        </div>`;

    app.innerHTML = `
      ${backBarHtml("← Back (previous screen)")}
      <div class="q-card q-card-wide">
        <div class="q-meta">
          ${escapeHtml(qz.label)} · ${qz.i + 1} / ${qz.items.length}
          <span class="badge blue">${escapeHtml(item.topic)}</span>
          ${qz.seconds != null ? `<span class="timer" id="quiz-timer">${formatTime(qz.seconds)}</span>` : ""}
        </div>
        <h2 class="q-stem">${escapeHtml(item.q)}</h2>
        <div class="q-layout">
          <div id="opts" class="q-opts">
            ${item.options
              .map((o, idx) => {
                let cls = "option";
                if (locked && idx === picked) cls += " option-picked";
                if (revealed && idx === item.answer) cls += " correct";
                if (revealed && idx === picked && picked !== item.answer) cls += " wrong";
                const dis = locked || revealed ? "disabled" : "";
                return `<button class="${cls}" data-idx="${idx}" ${dis}><strong>${String.fromCharCode(65 + idx)}.</strong> ${escapeHtml(o)}</button>`;
              })
              .join("")}
          </div>
          <div id="feedback" class="q-feedback">${
            revealed
              ? `${formatAnswerFeedback(item, {
                  ok: picked == null ? null : picked === item.answer,
                })}${sdleGptButtonHtml("row")}`
              : locked
                ? `<p class="muted q-feedback-hint">Answer locked. Tap <b>Show answer</b> or <b>Next</b> (bottom bar stays in view).</p>`
                : ""
          }</div>
        </div>
        ${actionsHtml}
        <p class="kb-hint">${kbHint}</p>
      </div>
    `;
    bindBackBar();
    if (!locked) {
      app.querySelectorAll(".option").forEach((btn) => {
        btn.onclick = () => pick(+btn.dataset.idx);
      });
    }
    if (revealed) {
      bindSdleGptButtons(app, () => contextFromQuizItem(item, picked));
    }
    const goNext = () => {
      qz.i++;
      renderQuizUI();
    };
    const next = $("#btn-next");
    if (next && showNext) next.onclick = goNext;
    const showBtn = $("#btn-show-ans");
    if (showBtn && qz.mode === "test") {
      showBtn.onclick = () => {
        if (qz.answers[qz.i] == null) return;
        if (!qz.revealed) qz.revealed = [];
        qz.revealed[qz.i] = true;
        renderQuizUI();
      };
    }
    bindQuizKeys();
  }

  function pick(idx) {
    const qz = state.quiz;
    if (!qz) return;
    const item = qz.items[qz.i];
    if (qz.mode === "exam") {
      qz.answers[qz.i] = idx;
      qz.i++;
      renderQuizUI();
      return;
    }
    if (qz.mode === "test") {
      if (qz.answers[qz.i] != null) return;
      qz.answers[qz.i] = idx;
      const ok = idx === item.answer;
      qz.learnN = (qz.learnN || 0) + 1;
      if (ok) qz.learnOk = (qz.learnOk || 0) + 1;
      record(item, ok);
      renderQuizUI();
      return;
    }
    // learn mode — already answered this item
    if ($("#btn-next") && !$("#btn-next").hidden) return;
    const ok = idx === item.answer;
    qz.learnN = (qz.learnN || 0) + 1;
    if (ok) qz.learnOk = (qz.learnOk || 0) + 1;
    record(item, ok);
    app.querySelectorAll(".option").forEach((b) => {
      b.disabled = true;
      const i = +b.dataset.idx;
      if (i === item.answer) b.classList.add("correct");
      if (i === idx && !ok) b.classList.add("wrong");
    });
    const fb = $("#feedback");
    if (fb) {
      fb.innerHTML = `${formatAnswerFeedback(item, { ok })}${sdleGptButtonHtml("row")}`;
      bindSdleGptButtons(fb, () => contextFromQuizItem(item, idx));
    }
    const next = $("#btn-next");
    if (next) {
      next.hidden = false;
      next.classList.add("btn-next-main");
      const bar = next.closest(".quiz-actions");
      if (bar) bar.classList.add("quiz-actions-sticky");
      next.onclick = () => {
        qz.i++;
        renderQuizUI();
      };
    }
  }

  function record(item, ok) {
    bumpVolume();
    state.stats.answered++;
    if (ok) state.stats.correct++;
    const t = item.topic || "mixed";
    if (!state.stats.byTopic[t]) state.stats.byTopic[t] = { a: 0, c: 0 };
    state.stats.byTopic[t].a++;
    if (ok) state.stats.byTopic[t].c++;
    if (!state.stats.bySubtopic) state.stats.bySubtopic = {};
    (item.subtopics || []).forEach((st) => {
      if (!st) return;
      if (!state.stats.bySubtopic[st]) state.stats.bySubtopic[st] = { a: 0, c: 0 };
      state.stats.bySubtopic[st].a++;
      if (ok) state.stats.bySubtopic[st].c++;
    });
    markSeen(item.id);
    if (!ok) {
      if (!state.wrongBook.includes(item.id)) state.wrongBook.push(item.id);
    } else {
      state.wrongBook = state.wrongBook.filter((id) => id !== item.id);
    }
    save();
  }

  function finishQuiz() {
    clearQuizTimer();
    unbindQuizKeys();
    const qz = state.quiz;
    if (!qz) return;
    let correct = 0;
    if (qz.mode === "exam") {
      qz.items.forEach((item, i) => {
        const ans = qz.answers[i];
        const ok = ans === item.answer;
        if (ans != null) record(item, ok);
        if (ok) correct++;
      });
    } else {
      // learn + test: already recorded on lock/pick
      correct = qz.learnOk || 0;
    }
    const total =
      qz.mode === "exam"
        ? qz.items.length
        : qz.mode === "test"
          ? qz.items.length
          : qz.learnN || qz.items.length;
    const pct =
      qz.mode === "exam"
        ? total
          ? Math.round((100 * correct) / total)
          : null
        : qz.mode === "test"
          ? total
            ? Math.round((100 * correct) / Math.max(qz.learnN || total, 1))
            : null
          : qz.learnN
            ? Math.round((100 * (qz.learnOk || 0)) / qz.learnN)
            : null;
    // test mode: score over answered; if user finished all, learnN === items.length
    const displayTotal = qz.mode === "test" ? qz.learnN || qz.items.length : total;
    const displayCorrect = correct;
    const displayPct =
      displayTotal > 0 ? Math.round((100 * displayCorrect) / displayTotal) : pct;
    const sec = Math.round((Date.now() - (qz.startedAt || Date.now())) / 1000);
    const itemCount = (qz.items && qz.items.length) || 0;
    const isMock = qz.mode === "exam" && itemCount >= 100;
    const byTopicMock = isMock ? mockTopicBreakdown(qz) : null;
    const fatigue = isMock ? mockFatigue(qz) : null;
    const sessionTs = Date.now();
    const sessionEntry = {
      ts: sessionTs,
      mode: qz.mode || "learn",
      label: qz.label,
      topic: qz.topic,
      total: itemCount || displayTotal,
      answered: qz.mode === "exam" ? (qz.answers || []).filter((a) => a != null).length : qz.learnN || 0,
      correct: displayCorrect,
      pct: displayPct,
      sec,
    };
    if (isMock) {
      sessionEntry.isMock = true;
      sessionEntry.byTopic = byTopicMock;
      if (fatigue) sessionEntry.fatigue = fatigue;
    }
    const priorMock = isMock ? findPriorMock(null) : null;
    logSession(sessionEntry);
    save();
    const showReview = qz.mode === "exam" || qz.mode === "test";
    const backView = qz.returnView || (qz.mode === "test" ? "mcqs" : viewStack[viewStack.length - 1] || "today");
    const backLabel =
      backView === "mcqs"
        ? "← Back to MCQs"
        : backView === "practice"
          ? "← Back to Extra practice"
          : backView === "always"
            ? "← Back to Always-comes"
            : backView === "pass"
              ? "← Back to Pass plan"
              : backView === "progress"
                ? "← Back to Progress"
                : "← Back";
    const deltaBlock = isMock ? mockDeltaHtml(sessionEntry, priorMock) : "";
    app.innerHTML = `
      ${backBarHtml(backLabel)}
      <div class="q-card">
        <h1>Session complete</h1>
        ${
          displayPct != null
            ? `<div class="stat-box" style="margin:16px 0"><div class="num" style="color:${
                displayPct >= 80 ? "var(--accent2)" : "var(--warn)"
              }">${displayPct}%</div><div class="lbl">${displayCorrect} / ${displayTotal} · ${formatDur(
                sec
              )}</div></div>
               <p class="lead">${displayPct >= 80 ? "On target for 80%+." : "Review below, then wrong book."} Logged in Progress history.</p>`
            : `<p class="lead">Session finished (${formatDur(sec)}). Check Progress for history + score.</p>`
        }
        ${deltaBlock}
        ${nextBestActionHtml()}
        <div class="volume-grid">
          <button class="btn" id="back">${backLabel}</button>
          <button class="btn ghost" id="wb">Wrong book</button>
          <button class="btn ghost" id="to-hist">Progress history</button>
          ${qz.mode === "test" ? `<button class="btn ghost" id="again">Retake same pool</button>` : ""}
        </div>
      </div>
      ${
        showReview
          ? `<div class="mcq-review" style="margin-top:16px">${qz.items
              .map((item, i) => {
                const ans = qz.answers[i];
                const ok = ans === item.answer;
                const skipped = ans == null;
                return `<div class="rule" style="border-left-color:${
                  skipped ? "var(--muted)" : ok ? "var(--accent2)" : "var(--danger)"
                }">
                  <strong>${skipped ? "SKIP" : ok ? "OK" : "MISS"} · ${escapeHtml(item.topic)}</strong>
                  <span>${escapeHtml(item.q)}</span>
                  <div class="explain">Your pick: ${
                    skipped ? "—" : escapeHtml(item.options[ans] || "")
                  }</div>
                  ${formatAnswerFeedback(item, {
                    ok: skipped ? null : ok,
                  })}
                </div>`;
              })
              .join("")}</div>`
          : ""
      }
    `;
    const topicRetake = qz.topic;
    state.quiz = null;
    bindBackBar();
    bindVolButtons(app);
    $("#back").onclick = () => {
      // Prefer stack, fall back to returnView
      if (viewStack.length) goBack();
      else navigateTo(backView, { push: false });
    };
    $("#wb").onclick = () => {
      /* Don’t force 20 — open builder on wrong book count step */
      state.practiceBuild = { step: "count", kind: "mcq", topic: "wrong" };
      navigateTo("practice", { push: true });
    };
    $("#to-hist") &&
      ($("#to-hist").onclick = () => {
        state.view = "progress";
        setActiveNav("progress");
        render();
      });
    $("#again") &&
      ($("#again").onclick = () => {
        startMcqTest(topicRetake, QUIZ_ALL);
      });
  }

  /* ——— CARDS ——— */
  function unbindCardKeys() {
    if (cardKeyHandler) {
      document.removeEventListener("keydown", cardKeyHandler);
      cardKeyHandler = null;
    }
  }

  function renderCardsUI() {
    unbindQuizKeys();
    const deck = state._cardDeck || lessonCardDeck();
    const total = ensureFlashcards().length;
    const poolKey = deck + ":" + total + ":" + (state.wrongBook || []).length;
    if (state._cardPoolKey !== poolKey || !Array.isArray(state._cardPool) || !state._cardPool.length) {
      state._cardPool = shuffle(cardPoolForDeck(deck));
      state._cardPoolKey = poolKey;
      state.cardIx = 0;
    }
    let pool = state._cardPool;
    if (!pool.length) {
      app.innerHTML = `
        ${backBarHtml("← Back")}
        <h1>Flashcards</h1>
        <div class="alert">No cards. Hard-refresh (Ctrl+Shift+R). Need notes_bank + highyield.</div>`;
      bindBackBar();
      return;
    }
    if (state.cardIx >= pool.length) state.cardIx = 0;
    const c = pool[state.cardIx];
    const knownN = pool.filter((x) => state.cardKnown[x.id]).length;
    const decks = [
      "always",
      "abtal_notes",
      "restorative",
      "perio",
      "endo",
      "oms",
      "ortho_pedo",
      "ethics",
      "wrong",
      "unknown",
      "all",
    ];
    const deckLabel = {
      always: "Always",
      abtal_notes: "أبطال الديجيتال",
      restorative: "Restorative",
      perio: "Perio",
      endo: "Endo",
      oms: "OMS",
      ortho_pedo: "Ortho/Pedo",
      ethics: "Ethics",
      wrong: "Wrong book",
      unknown: "Unknown",
      all: "All",
    };
    const srcLabel =
      c.src === "abtal_note"
        ? "أبطال الديجيتال"
        : c.src === "wrong_book"
          ? "Wrong book"
          : c.src === "always_comes"
            ? "Always-comes"
            : c.src && c.src !== "note"
              ? String(c.src)
              : "Core";
    app.innerHTML = `
      ${backBarHtml("← Back")}
      <h1>Flashcards <span class="badge">${state.cardIx + 1}/${pool.length}</span>
        <span class="badge green">${knownN} known</span></h1>
      <p class="lead" dir="rtl">
        ${total} بطاقة — أساسية، ملاحظات أبطال الديجيتال/رفيع، ودفتر الأخطاء.
        المجموعة: <b>${escapeHtml(deckLabel[deck] || deck)}</b>
      </p>
      <div class="volume-grid" style="margin-bottom:10px">
        ${decks
          .map(
            (d) =>
              `<button type="button" class="btn sm ${d === deck ? "" : "ghost"} deck-pick" data-deck="${d}">${escapeHtml(deckLabel[d] || d)} (${cardPoolForDeck(d).length})</button>`
          )
          .join("")}
      </div>
      <div class="card-face" id="flip" tabindex="0">
        <div class="q-meta">${escapeHtml(srcLabel)} · ${escapeHtml(c.deck || "card")}</div>
        <h2 id="cf" style="line-height:1.45">${escapeHtml(c.front)}</h2>
        <div id="cb" class="explain" hidden><strong>Answer:</strong> ${escapeHtml(c.back)}</div>
      </div>
      <div class="volume-grid">
        <button class="btn ghost" id="show">Show</button>
        <button class="btn success" id="know">Know (1)</button>
        <button class="btn" id="again" style="background:#6b3a3a">Again (2)</button>
        <button class="btn" id="cnext">Next (N)</button>
      </div>
      <p class="kb-hint">Space/Enter flip · 1 Know · 2 Again · N Next</p>
    `;
    const show = () => {
      const el = $("#cb");
      if (el) el.hidden = false;
    };
    $("#flip").onclick = show;
    $("#show").onclick = show;
    $("#cnext").onclick = () => {
      state.cardIx = (state.cardIx + 1) % pool.length;
      renderCardsUI();
    };
    $("#know").onclick = () => {
      state.cardKnown[c.id] = true;
      state.cardIx = (state.cardIx + 1) % pool.length;
      save();
      renderCardsUI();
    };
    $("#again").onclick = () => {
      delete state.cardKnown[c.id];
      state.cardIx = (state.cardIx + 1) % pool.length;
      save();
      renderCardsUI();
    };
    app.querySelectorAll(".deck-pick").forEach((b) => {
      b.onclick = () => {
        state._cardDeck = b.dataset.deck;
        state.cardIx = 0;
        state._cardPoolKey = "";
        renderCardsUI();
      };
    });
    bindBackBar();
    unbindCardKeys();
    cardKeyHandler = (e) => {
      if (state.view !== "cards") return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key;
      if (k === " " || k === "Enter") {
        e.preventDefault();
        show();
      } else if (k === "1") {
        e.preventDefault();
        $("#know") && $("#know").click();
      } else if (k === "2") {
        e.preventDefault();
        $("#again") && $("#again").click();
      } else if (k === "n" || k === "N" || k === "ArrowRight") {
        e.preventDefault();
        $("#cnext") && $("#cnext").click();
      }
    };
    document.addEventListener("keydown", cardKeyHandler);
  }

  /* init */
  // One-time: old focusMode hid tabs. After chrome-safe CSS, restore is OK.
  try {
    if (!store.get("focusModeCssSafe", false)) {
      store.set("focusMode", false);
      store.set("focusModeCssSafe", true);
    }
    state.focusMode = !!store.get("focusMode", false);
  } catch (_) {
    state.focusMode = false;
  }
  try {
    assertBoot();
  } catch (e) {
    console.error(e);
    return;
  }
  // Sync daily goal + focus timer from active track day unless user overrode goal
  try {
    const meta0 = trackMeta();
    if (meta0.dailyGoal && !store.get("dailyGoalUserOverride", false)) {
      state.dailyGoal = meta0.dailyGoal;
    }
  } catch (_) {}
  ensureFlashcards();
  paintMainNav();
  setActiveNav(TAB_VIEWS.includes(state.view) ? state.view : "today");
  // First paint: timer must match plan (not a hard-coded 45:00 for every template)
  try {
    const savedRem = store.get("pomoRemaining", null);
    const savedMode = store.get("pomoMode", "work");
    syncPomoFromPlan({ force: !pomo.running });
    // Keep remaining only if it still fits the new work block (same mode work)
    if (savedRem != null && savedMode === "work" && savedRem <= pomo.workSec && savedRem > 0) {
      pomo.remaining = savedRem;
      store.set("pomoRemaining", pomo.remaining);
    }
  } catch (_) {
    syncPomoFromPlan({ force: true });
  }
  render();
  paintPomoBar();
  window.addEventListener("resize", syncPomoStickyTop);
  requestAnimationFrame(syncPomoStickyTop);

  /* ——— Install app (PWA) — full screen, no browser chrome ——— */
  (function setupInstallPrompt() {
    const DISMISS_KEY = "installDismissUntil";
    const INSTALLED_KEY = "installDone";

    function isStandalone() {
      try {
        if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
        if (window.navigator.standalone === true) return true;
      } catch (_) {}
      return false;
    }

    function dismissed() {
      const until = +store.get(DISMISS_KEY, 0) || 0;
      return until > Date.now();
    }

    function isIos() {
      const ua = navigator.userAgent || "";
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }

    function isMobileUa() {
      return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    }

    /** Don’t cover “Choose your plan” — wait until user picked a pace. */
    function planReady() {
      return !!store.get("planPickedExplicit", false) || !!store.get("planChosen", false);
    }

    function removeBanner() {
      const el = document.getElementById("sdle-install-banner");
      if (el) el.remove();
    }

    function showBanner(opts) {
      if (isStandalone() || store.get(INSTALLED_KEY, false) || dismissed()) return;
      if (document.getElementById("sdle-install-banner")) return;
      if (!planReady()) return;
      const ios = !!(opts && opts.ios);
      const canNative = !!(opts && opts.canNative);
      const manual = !!(opts && opts.manual);
      const el = document.createElement("div");
      el.id = "sdle-install-banner";
      el.className = "install-banner";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-label", "Install app");
      let title = "Install this app?";
      let text =
        "Add to home screen or desktop — full screen, hide browser bars, more study space.";
      if (ios) {
        title = "Install SDLE on your phone";
        text = "Full screen study — hide the browser bar. Tap <b>Share</b> → <b>Add to Home Screen</b>.";
      } else if (manual) {
        title = isMobileUa() ? "Install SDLE?" : "Install on this computer?";
        text = isMobileUa()
          ? "Browser menu → <b>Install app</b> / <b>Add to Home screen</b> — full screen, no address bar."
          : "Chrome/Edge: address bar <b>Install</b> icon, or menu → <b>Install SDLE…</b> — opens like an app (no tabs/URL bar).";
      }
      el.innerHTML = `
        <div class="install-banner-inner">
          <p class="install-banner-title">${title}</p>
          <p class="install-banner-text">${text}</p>
          <div class="install-banner-actions">
            <button type="button" class="btn ghost sm" data-install-dismiss>Not now</button>
            ${
              canNative
                ? `<button type="button" class="btn success sm" data-install-go>Install</button>`
                : `<button type="button" class="btn success sm" data-install-ok>Got it</button>`
            }
          </div>
        </div>`;
      document.body.appendChild(el);
      const dismiss = () => {
        store.set(DISMISS_KEY, Date.now() + 14 * 24 * 60 * 60 * 1000);
        removeBanner();
      };
      el.querySelector("[data-install-dismiss]") &&
        (el.querySelector("[data-install-dismiss]").onclick = dismiss);
      const ok = el.querySelector("[data-install-ok]");
      if (ok) ok.onclick = dismiss;
      const go = el.querySelector("[data-install-go]");
      if (go && opts && opts.deferred) {
        go.onclick = async () => {
          try {
            opts.deferred.prompt();
            const choice = await opts.deferred.userChoice;
            if (choice && choice.outcome === "accepted") store.set(INSTALLED_KEY, true);
            else store.set(DISMISS_KEY, Date.now() + 7 * 24 * 60 * 60 * 1000);
          } catch (_) {
            store.set(DISMISS_KEY, Date.now() + 3 * 24 * 60 * 60 * 1000);
          }
          removeBanner();
        };
      }
    }

    /** Retry until plan is picked, then show (max ~2 min). */
    function whenPlanReady(fn, tries) {
      const left = tries == null ? 60 : tries;
      if (planReady()) {
        fn();
        return;
      }
      if (left <= 0) return;
      setTimeout(() => whenPlanReady(fn, left - 1), 2000);
    }

    if (isStandalone()) {
      document.documentElement.classList.add("sdle-standalone");
      document.body.classList.add("sdle-standalone");
      return;
    }

    /* Register service worker (needed for install criteria on many browsers) */
    if ("serviceWorker" in navigator) {
      const swUrl = new URL("sw.js", window.location.href).href;
      navigator.serviceWorker.register(swUrl, { scope: new URL("./", window.location.href).pathname }).catch(() => {});
    }

    let deferred = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e;
      /* After plan pick so it does not cover first-page chooser */
      whenPlanReady(() => setTimeout(() => showBanner({ canNative: true, deferred }), 800));
    });

    window.addEventListener("appinstalled", () => {
      store.set(INSTALLED_KEY, true);
      removeBanner();
    });

    /* iOS Safari: no BIP — guide Share → Add to Home Screen */
    if (isIos() && !isStandalone() && !dismissed()) {
      whenPlanReady(() => setTimeout(() => showBanner({ ios: true }), 1200));
    }

    /* Phone/PC browser without BIP (or BIP late): still ask once after plan pick */
    if (!isIos() && !dismissed() && !store.get(INSTALLED_KEY, false)) {
      whenPlanReady(() =>
        setTimeout(() => {
          if (!document.getElementById("sdle-install-banner")) {
            if (deferred) showBanner({ canNative: true, deferred });
            else showBanner({ manual: true });
          }
        }, 4500)
      );
    }
  })();
})();
