/**
 * Plan tracks: 14 / 30 / 45 / 60 (2 mo) / 90 (3 mo).
 * Content depth lives in LESSONS (14 ADHD textbooks). Tracks only map
 * calendar day → lessonDay + mode + volume targets for ≥80% practice.
 */
(function (w) {
  const PASS_TARGET = "≥80% practice accuracy";
  const EXAM =
    "SDLE 200 MCQs · ~4h · pass 542/800 · restorative ~40% · perio + prosthesis heavy";

  const GOAL = {
    light: "Protect sleep; free points only; no new rabbit holes",
    mock: "Timed accuracy → ≥80%; write every miss",
    review: "Wrong book + weak only; protect strong topics",
    volume: "Hit daily Q goal; wrong book after each miss",
    learn: "Finish lesson blocks + hit daily Q goal",
  };

  function row(day, lessonDay, mode, phase, dailyGoal, note) {
    return {
      day,
      lessonDay,
      mode,
      phase,
      dailyGoal,
      note: note || "",
      goalLine: GOAL[mode] || GOAL.learn,
    };
  }

  /** 14-day: one calendar day = one full lesson day. */
  const TRACK_14 = [];
  for (let d = 1; d <= 14; d++) {
    let phase, dailyGoal, mode;
    if (d <= 4) {
      phase = "A — Restorative score-maker";
      dailyGoal = 150;
      mode = d === 4 ? "volume" : "learn";
    } else if (d <= 9) {
      phase = "B — Blueprint subjects";
      dailyGoal = 120;
      mode = "learn";
    } else if (d <= 13) {
      phase = "C — Mocks + wrong book";
      dailyGoal = 150;
      mode = "mock";
    } else {
      phase = "D — Light + logistics";
      dailyGoal = 50;
      mode = "light";
    }
    TRACK_14.push(row(d, d, mode, phase, dailyGoal, null));
  }

  /** 30-day spaced (canonical). */
  const T30_SPEC = [
    { lessonDay: 1, mode: "learn", phase: "A — Restorative", dailyGoal: 80, note: "Operative read A–D + videos start" },
    { lessonDay: 1, mode: "volume", phase: "A — Restorative", dailyGoal: 100, note: "Operative MCQ volume + finish videos" },
    { lessonDay: 2, mode: "learn", phase: "A — Restorative", dailyGoal: 80, note: "Fixed + implant basics" },
    { lessonDay: 2, mode: "volume", phase: "A — Restorative", dailyGoal: 90, note: "Fixed/implant MCQs" },
    { lessonDay: 3, mode: "learn", phase: "A — Restorative", dailyGoal: 80, note: "RPD / CD / materials" },
    { lessonDay: 3, mode: "volume", phase: "A — Restorative", dailyGoal: 90, note: "RPD/CD/materials MCQs" },
    { lessonDay: 4, mode: "volume", phase: "A — Restorative", dailyGoal: 100, note: "Mixed restorative timed" },
    { lessonDay: 1, mode: "review", phase: "A — Restorative", dailyGoal: 60, note: "Operative wrong-book + free points" },
    { lessonDay: 2, mode: "review", phase: "A — Restorative", dailyGoal: 60, note: "Fixed wrong-book spaced" },
    { lessonDay: 4, mode: "mock", phase: "A — Restorative", dailyGoal: 100, note: "Restorative mini-mock 50–100" },
    { lessonDay: 5, mode: "learn", phase: "B — Blueprint", dailyGoal: 80, note: "Perio core" },
    { lessonDay: 5, mode: "volume", phase: "B — Blueprint", dailyGoal: 100, note: "Perio MCQ volume" },
    { lessonDay: 6, mode: "learn", phase: "B — Blueprint", dailyGoal: 80, note: "Endo core" },
    { lessonDay: 6, mode: "volume", phase: "B — Blueprint", dailyGoal: 90, note: "Endo MCQs" },
    { lessonDay: 7, mode: "learn", phase: "B — Blueprint", dailyGoal: 80, note: "OMS / path" },
    { lessonDay: 7, mode: "volume", phase: "B — Blueprint", dailyGoal: 90, note: "OMS MCQs" },
    { lessonDay: 8, mode: "learn", phase: "B — Blueprint", dailyGoal: 70, note: "Ethics / med / IC" },
    { lessonDay: 8, mode: "volume", phase: "B — Blueprint", dailyGoal: 80, note: "Ethics free points + bank" },
    { lessonDay: 9, mode: "learn", phase: "B — Blueprint", dailyGoal: 70, note: "Ortho / pedo" },
    { lessonDay: 9, mode: "volume", phase: "B — Blueprint", dailyGoal: 80, note: "Ortho/pedo MCQs + weak pack" },
    { lessonDay: 10, mode: "mock", phase: "C — Mocks", dailyGoal: 120, note: "Full mixed timed sets" },
    { lessonDay: 11, mode: "mock", phase: "C — Mocks", dailyGoal: 120, note: "Weak + unseen volume" },
    { lessonDay: 12, mode: "mock", phase: "C — Mocks", dailyGoal: 150, note: "Near-exam 150–200" },
    { lessonDay: 5, mode: "review", phase: "C — Mocks", dailyGoal: 70, note: "Perio + endo spaced weak" },
    { lessonDay: 1, mode: "review", phase: "C — Mocks", dailyGoal: 80, note: "Resto maintenance" },
    { lessonDay: 13, mode: "mock", phase: "C — Mocks", dailyGoal: 150, note: "Full mock day" },
    { lessonDay: 13, mode: "volume", phase: "C — Mocks", dailyGoal: 100, note: "Wrong book empty-out" },
    { lessonDay: 14, mode: "light", phase: "D — Light", dailyGoal: 40, note: "Logistics + free points only" },
    { lessonDay: 14, mode: "light", phase: "D — Light", dailyGoal: 40, note: "Sleep + always-comes skim" },
    { lessonDay: 14, mode: "light", phase: "D — Light", dailyGoal: 30, note: "Exam day readiness — no new banks" },
  ];

  const TRACK_30 = T30_SPEC.map((s, i) =>
    row(i + 1, s.lessonDay, s.mode, s.phase, s.dailyGoal, s.note)
  );

  /**
   * Stretch a base track to targetLen by inserting review / light / volume
   * maintenance days (never drops base steps; only inserts).
   */
  function stretchTrack(base, targetLen, label) {
    if (base.length === targetLen) {
      return base.map((r, i) => ({ ...r, day: i + 1 }));
    }
    if (base.length > targetLen) {
      return base.slice(0, targetLen).map((r, i) => ({ ...r, day: i + 1 }));
    }
    const out = base.map((r) => ({ ...r }));
    const scoreMakerLessons = [1, 2, 3, 4, 5]; // resto + perio first
    let insertIx = 0;
    while (out.length < targetLen) {
      const i = insertIx % Math.max(1, out.length - 3);
      const pivot = out[Math.min(i + 1, out.length - 1)];
      const ld = scoreMakerLessons[insertIx % scoreMakerLessons.length];
      const modes = ["review", "volume", "review", "light"];
      const mode = modes[insertIx % modes.length];
      const phase =
        ld <= 4
          ? "A — Restorative + prosthesis"
          : ld === 5
            ? "B — Perio focus"
            : pivot.phase || "C — Spaced maintenance";
      const goal = mode === "light" ? 40 : mode === "review" ? 55 : 70;
      const note =
        mode === "light"
          ? `${label}: free points + rest`
          : mode === "review"
            ? `${label}: wrong book + L${ld} weak`
            : `${label}: volume L${ld}`;
      out.splice(i + 1, 0, {
        day: 0,
        lessonDay: ld,
        mode,
        phase,
        dailyGoal: goal,
        note,
        goalLine: GOAL[mode],
      });
      insertIx++;
      if (insertIx > 500) break;
    }
    return out.slice(0, targetLen).map((r, i) => ({ ...r, day: i + 1 }));
  }

  /**
   * Longer calm tracks: learn → volume → review per high-weight lesson,
   * then mocks, then light. Built for readers who need notebook pace.
   */
  function buildCalmTrack(totalDays) {
    const steps = [];
    // Score-maker blocks first (resto, fixed/prosthesis, perio)
    const blocks = [
      { ld: 1, phase: "A — Restorative (operative)", modes: ["learn", "volume", "volume", "review"] },
      { ld: 2, phase: "A — Prosthesis (fixed/implant)", modes: ["learn", "volume", "review"] },
      { ld: 3, phase: "A — Prosthesis (RPD/CD/mat)", modes: ["learn", "volume", "review"] },
      { ld: 4, phase: "A — Mixed restorative", modes: ["volume", "mock", "review"] },
      { ld: 5, phase: "B — Perio", modes: ["learn", "volume", "volume", "review"] },
      { ld: 6, phase: "B — Endo", modes: ["learn", "volume", "review"] },
      { ld: 7, phase: "B — OMS / path", modes: ["learn", "volume", "review"] },
      { ld: 8, phase: "B — Ethics / med / IC", modes: ["learn", "volume", "review"] },
      { ld: 9, phase: "B — Ortho / pedo", modes: ["learn", "volume", "review"] },
    ];
    const goals = { learn: 70, volume: 80, review: 55, mock: 100, light: 35 };
    for (const b of blocks) {
      for (const mode of b.modes) {
        steps.push({
          lessonDay: b.ld,
          mode,
          phase: b.phase,
          dailyGoal: goals[mode] || 70,
          note: `${mode} · lesson ${b.ld}`,
        });
      }
    }
    // Mock / maintenance tail
    const mockTail = [
      { lessonDay: 10, mode: "mock", phase: "C — Mocks", dailyGoal: 100, note: "Mixed timed" },
      { lessonDay: 11, mode: "mock", phase: "C — Mocks", dailyGoal: 120, note: "Weak + unseen" },
      { lessonDay: 12, mode: "mock", phase: "C — Mocks", dailyGoal: 150, note: "Near-exam" },
      { lessonDay: 1, mode: "review", phase: "C — Resto maintenance", dailyGoal: 60, note: "Resto wrong book" },
      { lessonDay: 5, mode: "review", phase: "C — Perio maintenance", dailyGoal: 60, note: "Perio wrong book" },
      { lessonDay: 2, mode: "review", phase: "C — Prosthesis maintenance", dailyGoal: 60, note: "Fixed/RPD weak" },
      { lessonDay: 13, mode: "mock", phase: "C — Full mock", dailyGoal: 150, note: "Full mock day" },
      { lessonDay: 13, mode: "volume", phase: "C — Wrong book", dailyGoal: 80, note: "Empty wrong book" },
      { lessonDay: 14, mode: "light", phase: "D — Light", dailyGoal: 40, note: "Free points only" },
      { lessonDay: 14, mode: "light", phase: "D — Light", dailyGoal: 35, note: "Always-comes skim" },
      { lessonDay: 14, mode: "light", phase: "D — Exam eve", dailyGoal: 30, note: "Sleep + logistics" },
    ];
    for (const m of mockTail) steps.push(m);

    let track = steps.map((s, i) =>
      row(i + 1, s.lessonDay, s.mode, s.phase, s.dailyGoal, s.note)
    );
    if (track.length < totalDays) {
      track = stretchTrack(track, totalDays, totalDays + "d");
    } else if (track.length > totalDays) {
      track = stretchTrack(track, totalDays, totalDays + "d");
    }
    return track;
  }

  const TRACK_45 = stretchTrack(TRACK_30, 45, "45d");
  const TRACK_60 = buildCalmTrack(60);
  const TRACK_90 = buildCalmTrack(90);

  const ALLOWED = [14, 30, 45, 60, 90];

  function normalizeLength(length) {
    const n = +length;
    // Unknown / missing → 30 (default track), not 14 blitz
    return ALLOWED.indexOf(n) >= 0 ? n : 30;
  }

  function getTrack(length) {
    const n = normalizeLength(length);
    if (n === 90) return TRACK_90;
    if (n === 60) return TRACK_60;
    if (n === 45) return TRACK_45;
    if (n === 30) return TRACK_30;
    return TRACK_14;
  }

  /**
   * Total study hours for a calendar day — differs by plan length + mode.
   * 14d blitz ≈ full ADHD day; 90d is notebook pace.
   */
  const HOURS_BY_PLAN = {
    14: { learn: 8, volume: 7, review: 5, mock: 6.5, light: 2 },
    30: { learn: 5, volume: 4.5, review: 3.5, mock: 5, light: 1.5 },
    45: { learn: 4, volume: 3.5, review: 3, mock: 4, light: 1.5 },
    60: { learn: 3, volume: 3, review: 2.5, mock: 3.5, light: 1.25 },
    90: { learn: 2.5, volume: 2.5, review: 2, mock: 3, light: 1 },
  };

  /** Focus timer (work block minutes) — shorter on long calm plans so resets feel honest. */
  const FOCUS_MIN_BY_PLAN = {
    14: 45,
    30: 40,
    45: 35,
    60: 30,
    90: 25,
  };

  function dayHours(length, mode) {
    const n = normalizeLength(length);
    const table = HOURS_BY_PLAN[n] || HOURS_BY_PLAN[14];
    const m = (mode || "learn").toLowerCase();
    return table[m] != null ? table[m] : table.learn;
  }

  function focusMinutes(length) {
    const n = normalizeLength(length);
    return FOCUS_MIN_BY_PLAN[n] || 45;
  }

  /**
   * Ordered timed steps for one calendar day (how to read / watch / solve).
   * Minutes sum ≈ dayHours * 60 (breaks excluded from total hours label).
   */
  function daySchedule(length, mode, dailyGoal, note) {
    const n = normalizeLength(length);
    const m = (mode || "learn").toLowerCase();
    const totalH = dayHours(n, m);
    const goal = dailyGoal || 80;
    const focus = focusMinutes(n);
    const howToRead =
      n <= 14
        ? "Slow read: one section → STOP → restate hinge → notebook line. Do not skim the whole lesson first."
        : n <= 45
          ? "Read only the open step blocks for this mode. Notebook one line per hinge. Stop when timer ends."
          : "Calm pace: 1–2 sections max per focus block. Write hinges. Volume/review days skip full re-read.";

    let steps;
    if (m === "volume") {
      steps = [
        { key: "quiz", label: "Solve MCQs first", min: Math.round(totalH * 60 * 0.55), detail: `Hit ≥${goal} Q · wrong book after each miss` },
        { key: "cards", label: "Cards (weak only)", min: Math.round(totalH * 60 * 0.1), detail: "10–15 min max on weak cards" },
        { key: "always", label: "Free points skim", min: Math.round(totalH * 60 * 0.1), detail: "Say 8–12 always-comes out loud" },
        { key: "read", label: "Light re-read (only if cold)", min: Math.round(totalH * 60 * 0.15), detail: "Bold lines + Exam Q&A only — not full textbook" },
        { key: "video", label: "Optional video gap-fill", min: Math.round(totalH * 60 * 0.1), detail: "Only listed videos you skipped" },
      ];
    } else if (m === "review") {
      steps = [
        { key: "quiz", label: "Wrong book + weak pack", min: Math.round(totalH * 60 * 0.5), detail: `≥${goal} Q · empty wrong book first` },
        { key: "always", label: "Free points if ethics/med weak", min: Math.round(totalH * 60 * 0.15), detail: "25–50 free-point MCQs" },
        { key: "cards", label: "Cards on weak topics", min: Math.round(totalH * 60 * 0.15), detail: "Only decks you miss" },
        { key: "read", label: "Re-read hinges only", min: Math.round(totalH * 60 * 0.15), detail: "Not whole lesson — notebook lines" },
        { key: "video", label: "Skip videos unless blank", min: Math.round(totalH * 60 * 0.05), detail: "Optional 1 short clip" },
      ];
    } else if (m === "mock") {
      steps = [
        { key: "always", label: "Warm free points (max 25)", min: 15, detail: "Warm only — no rabbit holes" },
        { key: "mock", label: "Timed mock / exam pace", min: Math.round(totalH * 60 * 0.55), detail: "~72s/Q · answer every item" },
        { key: "quiz", label: "Wrong book after mock", min: Math.round(totalH * 60 * 0.2), detail: "One-line hinge per miss" },
        { key: "cards", label: "Cards on misses", min: Math.round(totalH * 60 * 0.1), detail: "Quick pass" },
        { key: "read", label: "No new theory mid-day", min: Math.round(totalH * 60 * 0.05), detail: "Only if a hinge is blank" },
      ];
    } else if (m === "light") {
      steps = [
        { key: "always", label: "Always-comes out loud", min: Math.round(totalH * 60 * 0.4), detail: "20 rules · notebook only if miss" },
        { key: "cards", label: "Light cards", min: Math.round(totalH * 60 * 0.25), detail: "Optional" },
        { key: "quiz", label: "≤50 free-point MCQs", min: Math.round(totalH * 60 * 0.25), detail: "Stop if anxious" },
        { key: "read", label: "Logistics only", min: Math.round(totalH * 60 * 0.1), detail: "ID · Mumaris · sleep ≥7h · no new banks" },
      ];
    } else {
      // learn — order: read → watch → cards → solve
      const readShare = n <= 14 ? 0.35 : n <= 45 ? 0.3 : 0.28;
      const vidShare = n <= 14 ? 0.25 : 0.22;
      const cardShare = 0.08;
      const quizShare = 1 - readShare - vidShare - cardShare - 0.05;
      steps = [
        { key: "read", label: "Read today’s lesson (in app)", min: Math.round(totalH * 60 * readShare), detail: howToRead },
        { key: "video", label: "Watch listed videos only", min: Math.round(totalH * 60 * vidShare), detail: "1.25–1.5× · pause on bold rules · phone away" },
        { key: "cards", label: "Flashcards", min: Math.max(10, Math.round(totalH * 60 * cardShare)), detail: "Known / again — no perfectionism" },
        { key: "quiz", label: "Solve MCQs (learn mode)", min: Math.round(totalH * 60 * quizShare), detail: `≥${goal} Q · write every miss` },
        { key: "always", label: "Free points close-out", min: Math.round(totalH * 60 * 0.05), detail: "8 rules out loud + optional 25 Q" },
      ];
    }

    // Normalize tiny mins
    steps = steps
      .map((s) => ({ ...s, min: Math.max(5, s.min || 5) }))
      .filter((s) => s.min > 0);

    const sumMin = steps.reduce((a, s) => a + s.min, 0);
    return {
      planLength: n,
      mode: m,
      totalHours: totalH,
      totalMinutes: sumMin,
      focusMinutes: focus,
      dailyGoal: goal,
      note: note || "",
      howToRead,
      steps,
      hoursLabel: totalH % 1 === 0 ? `${totalH} h` : `${totalH} h`,
      timerLabel: `${focus} min focus`,
    };
  }

  function planDayMeta(length, day) {
    const track = getTrack(length);
    const d = Math.max(1, Math.min(day || 1, track.length));
    const base = track[d - 1] || track[0];
    if (!base) return {};
    const sched = daySchedule(length, base.mode, base.dailyGoal, base.note);
    return {
      ...base,
      hours: sched.totalHours,
      hoursLabel: sched.hoursLabel,
      focusMinutes: sched.focusMinutes,
      schedule: sched,
    };
  }

  function maxPlanDay(length) {
    return normalizeLength(length);
  }

  function lessonDayFor(length, calendarDay) {
    return planDayMeta(length, calendarDay).lessonDay;
  }

  w.PLAN_TRACKS = {
    passTarget: PASS_TARGET,
    exam: EXAM,
    allowed: ALLOWED,
    hoursByPlan: HOURS_BY_PLAN,
    focusMinByPlan: FOCUS_MIN_BY_PLAN,
    14: TRACK_14,
    30: TRACK_30,
    45: TRACK_45,
    60: TRACK_60,
    90: TRACK_90,
  };
  w.getPlanTrack = getTrack;
  w.planDayMeta = planDayMeta;
  w.maxPlanDay = maxPlanDay;
  w.lessonDayFor = lessonDayFor;
  w.normalizePlanLength = normalizeLength;
  w.daySchedule = daySchedule;
  w.dayHours = dayHours;
  w.focusMinutes = focusMinutes;
})(typeof window !== "undefined" ? window : globalThis);
