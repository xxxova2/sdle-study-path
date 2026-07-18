/**
 * Full Playwright review of SDLE Study Path app.
 * Run: node scripts/playwright_app_review.mjs
 * Requires: server on BASE (default http://127.0.0.1:8765)
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.SDLE_BASE || "http://127.0.0.1:8765";
const OUT = path.join(ROOT, "data", "generated", "playwright_review");
const SHOTS = path.join(OUT, "screenshots");

fs.mkdirSync(SHOTS, { recursive: true });

const findings = [];
function ok(area, msg, extra = {}) {
  findings.push({ sev: "ok", area, msg, ...extra });
  console.log(`  OK  [${area}] ${msg}`);
}
function warn(area, msg, extra = {}) {
  findings.push({ sev: "warn", area, msg, ...extra });
  console.log(` WARN [${area}] ${msg}`);
}
function fail(area, msg, extra = {}) {
  findings.push({ sev: "fail", area, msg, ...extra });
  console.log(` FAIL [${area}] ${msg}`);
}
function info(area, msg, extra = {}) {
  findings.push({ sev: "info", area, msg, ...extra });
  console.log(` INFO [${area}] ${msg}`);
}

async function shot(page, name) {
  const p = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

async function consoleCollector(page) {
  const errors = [];
  const warnings = [];
  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    if (t === "error") errors.push(text);
    if (t === "warning") warnings.push(text);
  });
  page.on("pageerror", (err) => errors.push(String(err.message || err)));
  return { errors, warnings };
}

async function waitApp(page) {
  await page.waitForSelector("#app", { timeout: 15000 });
  await page.waitForFunction(
    () =>
      window.QUESTION_BANK &&
      window.QUESTION_BANK.length > 100 &&
      window.LESSONS &&
      window.LESSONS.length >= 14,
    { timeout: 20000 }
  );
}

async function clickNav(page, view) {
  await page.click(`nav.simple-nav button[data-view="${view}"]`);
  await page.waitForTimeout(250);
}

async function main() {
  console.log(`\n=== SDLE Playwright review ===\nBase: ${BASE}\n`);

  // Health check
  try {
    const r = await fetch(`${BASE}/index.html`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    ok("server", `index.html reachable (${r.status})`);
  } catch (e) {
    fail("server", `Cannot reach ${BASE}: ${e.message}`);
    writeReport();
    process.exit(1);
  }

  for (const asset of [
    "css/app.css",
    "js/app.js",
    "data/lessons.js",
    "data/questions.js",
    "data/highyield.js",
  ]) {
    const r = await fetch(`${BASE}/${asset}`);
    if (r.ok) ok("assets", `${asset} ${r.status} (${r.headers.get("content-length") || "?"} B)`);
    else fail("assets", `${asset} → ${r.status}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const logs = await consoleCollector(page);

  // --- Load ---
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle", timeout: 60000 });
  try {
    await waitApp(page);
    ok("load", "App booted with banks");
  } catch (e) {
    fail("load", `App failed to boot: ${e.message}`);
    await shot(page, "00_load_fail");
    await browser.close();
    writeReport();
    process.exit(1);
  }

  const meta = await page.evaluate(() => {
    const bank = window.QUESTION_BANK || [];
    const usable = bank.filter((q) => q && q.usable !== false);
    const unusable = bank.length - usable.length;
    const op = usable.filter(
      (q) =>
        (q.subtopics || []).includes("operative") ||
        q.topic === "restorative"
    );
    const always = usable.filter((q) => q.source === "always");
    const opAns = [0, 0, 0, 0];
    usable
      .filter((q) => q.source === "premium_operative")
      .forEach((q) => opAns[q.answer]++);
    return {
      bank: bank.length,
      usable: usable.length,
      unusable,
      always: always.length,
      lessons: (window.LESSONS || []).length,
      day1: (window.LESSONS || []).find((l) => l.day === 1),
      flashcards: (window.FLASHCARDS || []).length,
      alwaysComes: (window.ALWAYS_COMES_READ || []).length,
      passProtocol: !!window.PASS_PROTOCOL,
      plan14: (window.PLAN_14 || []).length,
      opAns,
    };
  });

  info("data", `Bank ${meta.bank} (usable ${meta.usable}, quarantine ${meta.unusable})`);
  info("data", `Always-source MCQs ${meta.always} · lessons ${meta.lessons} · cards ${meta.flashcards}`);
  info("data", `ALWAYS_COMES_READ ${meta.alwaysComes} · PLAN_14 ${meta.plan14} · PASS_PROTOCOL ${meta.passProtocol}`);
  info("data", `premium_operative answer dist ${JSON.stringify(meta.opAns)}`);

  if (meta.bank < 2000) warn("data", `Bank smaller than expected: ${meta.bank}`);
  else ok("data", `Bank size OK (${meta.bank})`);
  if (meta.usable < 2200) warn("data", `Usable pool low: ${meta.usable}`);
  else ok("data", `Usable pool OK (${meta.usable})`);
  if (meta.always < 50) fail("data", `Free-point (always) pool too small: ${meta.always}`);
  else ok("data", `Free-point pool ${meta.always}`);
  if (!meta.day1) fail("data", "Day 1 lesson missing");
  else {
    ok("data", `Day 1: ${meta.day1.title}`);
    const qs = meta.day1.quizSets || [];
    if (qs.length < 3) warn("day1", `Only ${qs.length} quiz sets`);
    else ok("day1", `${qs.length} quiz sets`);
    const vids = meta.day1.videos || [];
    if (vids.length !== 7) warn("day1", `Expected 7 videos, got ${vids.length}`);
    else ok("day1", "7 videos listed");
    const reading = meta.day1.reading || "";
    if (reading.length < 20000) warn("day1", `Reading thin: ${reading.length} chars`);
    else ok("day1", `Reading ${reading.length} chars`);
  }

  const opMax = Math.max(...meta.opAns);
  const opSum = meta.opAns.reduce((a, b) => a + b, 0);
  if (opSum > 0 && opMax / opSum > 0.9) fail("data", "premium_operative still answer-biased");
  else if (opSum > 0) ok("data", "premium_operative answer positions balanced");

  await shot(page, "01_today_default");

  // --- Chrome: 6 plan tabs always + focus mode geometry ---
  const tabCount = await page.locator("#main-nav button").count();
  if (tabCount === 6) ok("chrome", "main-nav has 6 plan tabs");
  else fail("chrome", `main-nav tab count ${tabCount} (want 6)`);

  const strip = await page.locator(".step-strip .step-chip").count();
  if (strip >= 4) ok("chrome", `step strip chips: ${strip}`);
  else warn("chrome", `step strip chips low: ${strip}`);

  // open quiz via strip
  const quizChip = page.locator('.step-chip[data-step="quiz"]');
  if ((await quizChip.count()) > 0) {
    await quizChip.click();
    await page.waitForTimeout(150);
    const quizOpen = await page.locator('.step[data-step="quiz"].open').count();
    if (quizOpen === 1) ok("chrome", "step strip opens Quiz");
    else warn("chrome", "step strip did not open Quiz");
  }

  // focus mode must keep tabs visible
  await page.click("#focus-toggle");
  await page.waitForTimeout(100);
  const focusGeom = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("#main-nav button")];
    return buttons.map((b) => {
      const r = b.getBoundingClientRect();
      const s = getComputedStyle(b);
      return {
        h: r.height,
        vis: s.visibility,
        pe: s.pointerEvents,
        disp: s.display,
      };
    });
  });
  const allVisible =
    focusGeom.length === 6 &&
    focusGeom.every((g) => g.h > 0 && g.vis !== "hidden" && g.pe !== "none" && g.disp !== "none");
  if (allVisible) ok("chrome", "focus mode: 6 tabs still visible + clickable geometry");
  else fail("chrome", "focus mode hid or collapsed plan tabs", { focusGeom });
  await shot(page, "01b_focus_mode_tabs");
  // exit focus if still on
  const ft = await page.locator("#focus-toggle").innerText();
  if (/exit/i.test(ft)) await page.click("#focus-toggle");

  // --- Nav views ---
  const views = [
    ["today", "Today"],
    ["days", "All days"],
    ["pass", "Pass plan"],
    ["always", "Always-comes"],
    ["practice", "Extra practice"],
    ["progress", "Progress"],
  ];

  for (const [view, label] of views) {
    const beforeErr = logs.errors.length;
    await clickNav(page, view);
    const html = await page.locator("#app").innerHTML();
    const text = await page.locator("#app").innerText();
    await shot(page, `02_nav_${view}`);

    if (!html || html.length < 20) fail("nav", `${label}: empty #app`);
    else ok("nav", `${label}: rendered (${text.split("\n")[0].slice(0, 60)})`);

    // active button
    const active = await page.locator(`nav.simple-nav button[data-view="${view}"]`).getAttribute("class");
    if (active && active.includes("active")) ok("nav", `${label}: nav active class`);
    else warn("nav", `${label}: missing active class on button`);

    if (logs.errors.length > beforeErr) {
      fail("nav", `${label}: console errors`, {
        errors: logs.errors.slice(beforeErr),
      });
    }
  }

  // --- Pass plan deep ---
  await clickNav(page, "pass");
  const passText = await page.locator("#app").innerText();
  await shot(page, "03_pass_plan");
  for (const needle of [
    "Pass",
    "free",
    "80%",
    "542",
  ]) {
    if (passText.toLowerCase().includes(needle.toLowerCase()) || passText.includes(needle))
      ok("pass", `Contains “${needle}”`);
    else warn("pass", `Missing expected “${needle}” in Pass plan`);
  }

  const passBtns = [
    "#pass-fp50",
    "#pass-fp-all",
    "#pass-resto100",
    "#pass-op100",
    "#pass-wrong",
  ];
  for (const sel of passBtns) {
    const n = await page.locator(sel).count();
    if (n === 1) ok("pass", `Button ${sel} present`);
    else warn("pass", `Button ${sel} count=${n}`);
  }

  // Click free-point 50 from Pass plan
  let quizOk = false;
  if ((await page.locator("#pass-fp50").count()) === 1) {
    await page.click("#pass-fp50");
    await page.waitForTimeout(400);
    const qText = await page.locator("#app").innerText();
    await shot(page, "04_quiz_free_points");
    const hasQ =
      (await page.locator(".q-stem, .question, .quiz-q, #quiz, .opt, .option, button.opt").count()) >
        0 ||
      /question|option|correct|score|Q\s*\d/i.test(qText);
    if (hasQ || qText.length > 80) {
      ok("quiz", "Free-point drill started from Pass plan");
      quizOk = true;
    } else {
      fail("quiz", "Free-point drill did not show question UI", {
        preview: qText.slice(0, 200),
      });
    }

    // Try answering one question if options visible
    const optBtns = page.locator(
      "#app button.opt, #app .options button, #app .opt, #app label.option, #app .choice"
    );
    const optCount = await optBtns.count();
    info("quiz", `Option-like controls: ${optCount}`);
    if (optCount >= 4) {
      await optBtns.nth(0).click();
      await page.waitForTimeout(200);
      await shot(page, "05_quiz_answered");
      ok("quiz", "Clicked first option");
    } else {
      // broader clickable
      const anyOpts = page.locator("#app button").filter({ hasText: /./ });
      const n = await anyOpts.count();
      info("quiz", `Generic buttons in quiz: ${n}`);
      if (n >= 4) {
        // skip nav-like
        for (let i = 0; i < Math.min(n, 12); i++) {
          const t = (await anyOpts.nth(i).innerText()).trim();
          if (t.length > 2 && t.length < 200 && !/pass|today|days|progress|back/i.test(t)) {
            await anyOpts.nth(i).click();
            await page.waitForTimeout(200);
            ok("quiz", `Clicked quiz control: “${t.slice(0, 40)}”`);
            await shot(page, "05_quiz_answered");
            break;
          }
        }
      } else warn("quiz", "Could not find 4 option buttons to click");
    }
  }

  // Exit quiz if possible
  const backCandidates = ["#back-today", "button:has-text('Back')", "button:has-text('Exit')", "button:has-text('Today')"];
  for (const sel of backCandidates) {
    if ((await page.locator(sel).count()) > 0) {
      try {
        await page.locator(sel).first().click({ timeout: 2000 });
        await page.waitForTimeout(200);
        ok("quiz", `Exited via ${sel}`);
        break;
      } catch {
        /* continue */
      }
    }
  }

  // --- Always-comes ---
  await clickNav(page, "always");
  const acText = await page.locator("#app").innerText();
  await shot(page, "06_always");
  if (/rubber|kennedy|ian|mta|cleaning/i.test(acText)) ok("always", "Always-comes rules visible");
  else warn("always", "Always-comes content looks thin", { preview: acText.slice(0, 150) });
  if ((await page.locator("#ac-drill50").count()) === 1) {
    ok("always", "Drill free-point MCQs 50 button present");
  } else warn("always", "ac-drill50 missing");

  // --- All days → Day 1 ---
  await clickNav(page, "days");
  await shot(page, "07_all_days");
  const daysText = await page.locator("#app").innerText();
  if (/Day\s*1|Operative/i.test(daysText)) ok("days", "Day 1 visible in All days");
  else warn("days", "Day 1 not obvious in list");

  // Click day 1 card/button
  let day1Opened = false;
  const day1Selectors = [
    'button:has-text("Day 1")',
    'button:has-text("Operative")',
    '[data-day="1"]',
    ".day-card:has-text('1')",
    "a:has-text('Day 1')",
  ];
  for (const sel of day1Selectors) {
    const c = await page.locator(sel).count();
    if (c > 0) {
      await page.locator(sel).first().click();
      await page.waitForTimeout(400);
      day1Opened = true;
      ok("day1", `Opened Day 1 via ${sel}`);
      break;
    }
  }
  if (!day1Opened) {
    // try evaluating state
    await page.evaluate(() => {
      if (window.__sdleOpenDay) window.__sdleOpenDay(1);
    });
    // fallback: set state via exposed? not available — try click first day button
    const firstDayBtn = page.locator("#app button, #app .card, #app .day").first();
    if ((await page.locator("#app button").count()) > 0) {
      // find button containing "1"
      const btns = page.locator("#app button");
      const n = await btns.count();
      for (let i = 0; i < n; i++) {
        const t = await btns.nth(i).innerText();
        if (/^\s*1\b|Day\s*1|Operative/i.test(t)) {
          await btns.nth(i).click();
          await page.waitForTimeout(400);
          day1Opened = true;
          ok("day1", `Opened via button text: ${t.slice(0, 40)}`);
          break;
        }
      }
    }
  }

  // Today view should show current day — set day to 1 via localStorage if app uses it
  await clickNav(page, "today");
  // Try day selector
  const daySelect = page.locator("#day-select, select#day, select[name='day']");
  if ((await daySelect.count()) > 0) {
    await daySelect.selectOption({ label: /1/ }).catch(() => daySelect.selectOption("1").catch(() => null));
    await page.waitForTimeout(300);
  }
  // Try buttons that set day
  const setDay1 = page.locator("button, a, .chip").filter({ hasText: /^1$|Day 1/ });
  if ((await setDay1.count()) > 0) {
    await setDay1.first().click().catch(() => null);
    await page.waitForTimeout(300);
  }

  // Force day 1 through localStorage keys commonly used
  await page.evaluate(() => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (/sdle|prometric|study/i.test(k)) {
          const v = localStorage.getItem(k);
          try {
            const o = JSON.parse(v);
            if (o && typeof o === "object") {
              if ("day" in o) o.day = 1;
              if ("currentDay" in o) o.currentDay = 1;
              localStorage.setItem(k, JSON.stringify(o));
            }
          } catch {
            /* */
          }
        }
      }
      // direct known keys
      for (const k of ["sdle-state", "sdle_state", "state", "sdle-prep"]) {
        const v = localStorage.getItem(k);
        if (!v) continue;
        try {
          const o = JSON.parse(v);
          o.day = 1;
          o.currentDay = 1;
          localStorage.setItem(k, JSON.stringify(o));
        } catch {
          /* */
        }
      }
    } catch {
      /* */
    }
  });
  await page.reload({ waitUntil: "networkidle" });
  await waitApp(page);
  await clickNav(page, "today");
  await page.waitForTimeout(300);

  // Read state.day from app if exposed
  const todayInfo = await page.evaluate(() => {
    const appText = document.querySelector("#app")?.innerText || "";
    return {
      text: appText.slice(0, 1500),
      hasReading: /ADHD Day|Operative|pomodoro|rubber dam|critical pH/i.test(appText),
      hasQuiz: /Block 1|Operative 50|quiz|MCQ/i.test(appText),
      hasVideo: /lec\.?19|VERIFIED|video/i.test(appText),
      hasCards: /card|flash/i.test(appText),
    };
  });
  await shot(page, "08_today_day1");

  if (todayInfo.hasReading) ok("day1", "Today view shows lesson reading signals");
  else warn("day1", "Today view may not show Day 1 reading", {
    preview: todayInfo.text.slice(0, 200),
  });
  if (todayInfo.hasQuiz) ok("day1", "Quiz blocks visible on Today");
  else warn("day1", "Quiz blocks not obvious on Today");
  if (todayInfo.hasVideo) ok("day1", "Video section visible");
  else warn("day1", "Videos not obvious on Today");

  // Open Day 1 via All days more carefully
  await clickNav(page, "days");
  const dayCards = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("#app button, #app .day-card, #app [data-day], #app a, #app .card")];
    return nodes.map((el, i) => ({
      i,
      tag: el.tagName,
      text: (el.innerText || "").slice(0, 80),
      day: el.getAttribute("data-day"),
      id: el.id,
      cls: el.className,
    }));
  });
  info("days", `Clickable nodes: ${dayCards.length}`);
  const d1 = dayCards.find(
    (n) => n.day === "1" || /^day\s*1\b/i.test(n.text) || /operative dentistry/i.test(n.text)
  );
  if (d1) {
    // click by index among buttons
    await page.evaluate((idx) => {
      const nodes = [...document.querySelectorAll("#app button, #app .day-card, #app [data-day], #app a, #app .card")];
      nodes[idx]?.click();
    }, d1.i);
    await page.waitForTimeout(500);
    await shot(page, "09_day1_detail");
    const t = await page.locator("#app").innerText();
    if (/Operative|ADHD Day|rubber dam|150/i.test(t)) ok("day1", "Day 1 detail content loaded");
    else warn("day1", "Day 1 detail content unexpected", { preview: t.slice(0, 200) });

    // Try Block 1 quiz if present
    const block1 = page.locator("button").filter({ hasText: /Block 1|Operative 50|50 \(learn\)/i });
    if ((await block1.count()) > 0) {
      await block1.first().click();
      await page.waitForTimeout(500);
      await shot(page, "10_day1_block1_quiz");
      const qt = await page.locator("#app").innerText();
      if (qt.length > 50) ok("day1", "Block 1 quiz launched");
      else fail("day1", "Block 1 quiz empty");

      // Answer one and check feedback in learn mode
      const buttons = page.locator("#app button");
      const bn = await buttons.count();
      let clicked = false;
      for (let i = 0; i < bn; i++) {
        const t = (await buttons.nth(i).innerText()).trim();
        if (t.length > 5 && t.length < 180 && !/back|exit|skip|next|today|pass|days/i.test(t)) {
          await buttons.nth(i).click();
          clicked = true;
          await page.waitForTimeout(300);
          break;
        }
      }
      if (clicked) {
        await shot(page, "11_day1_quiz_feedback");
        ok("day1", "Answered one Block 1 item");
      }
    } else warn("day1", "No Block 1 quiz button found on day detail");
  } else {
    warn("days", "Could not locate Day 1 card", { sample: dayCards.slice(0, 8) });
  }

  // --- Practice view ---
  await clickNav(page, "practice");
  await shot(page, "12_practice");
  const prac = await page.locator("#app").innerText();
  if (/operative|restorative|perio|endo|mock|50|100/i.test(prac)) ok("practice", "Practice pools visible");
  else warn("practice", "Practice view thin");

  // --- Progress ---
  await clickNav(page, "progress");
  await shot(page, "13_progress");
  const prog = await page.locator("#app").innerText();
  if (/wrong|score|progress|session|0/i.test(prog)) ok("progress", "Progress view rendered");
  else warn("progress", "Progress view unexpected");

  // --- Mobile viewport ---
  await page.setViewportSize({ width: 390, height: 844 });
  await clickNav(page, "pass");
  await page.waitForTimeout(200);
  await shot(page, "14_mobile_pass");
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
  if (overflow.overflowX) warn("mobile", `Horizontal overflow on mobile (${overflow.scrollWidth}>${overflow.clientWidth})`);
  else ok("mobile", "No major horizontal overflow on Pass plan");

  await clickNav(page, "today");
  await shot(page, "15_mobile_today");

  // --- Top stats ---
  await page.setViewportSize({ width: 1280, height: 900 });
  const topStats = await page.locator("#top-stats").innerText().catch(() => "");
  info("ui", `Top stats: ${topStats.slice(0, 120) || "(empty)"}`);

  // --- Console summary ---
  const realErrors = logs.errors.filter(
    (e) =>
      !/favicon/i.test(e) &&
      !/Download the React DevTools/i.test(e)
  );
  if (realErrors.length === 0) ok("console", "No page errors");
  else {
    for (const e of realErrors.slice(0, 15)) fail("console", e);
  }
  if (logs.warnings.length) info("console", `${logs.warnings.length} console warnings`);

  // --- Usable filter smoke ---
  const filterCheck = await page.evaluate(() => {
    const bank = window.QUESTION_BANK || [];
    const bad = bank.filter((q) => q.usable === false);
    // if app exposes nothing, just confirm bank flag exists
    return {
      quarantined: bad.length,
      sample: bad.slice(0, 3).map((q) => q.id),
      picStillInBank: bad.some((q) => /pic of/i.test(q.q || "")),
    };
  });
  if (filterCheck.quarantined >= 20) ok("filter", `${filterCheck.quarantined} quarantined in bank`);
  else warn("filter", `Expected ~26 quarantined, got ${filterCheck.quarantined}`);

  await browser.close();
  writeReport();
}

function writeReport() {
  const summary = {
    ok: findings.filter((f) => f.sev === "ok").length,
    warn: findings.filter((f) => f.sev === "warn").length,
    fail: findings.filter((f) => f.sev === "fail").length,
    info: findings.filter((f) => f.sev === "info").length,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    summary,
    findings,
    screenshotsDir: SHOTS,
  };
  const jsonPath = path.join(OUT, "report.json");
  const mdPath = path.join(OUT, "REPORT.md");
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const lines = [
    `# SDLE App Playwright Review`,
    ``,
    `Generated: ${report.generatedAt}`,
    `Base: ${BASE}`,
    ``,
    `## Summary`,
    ``,
    `| Severity | Count |`,
    `|----------|------:|`,
    `| OK | ${summary.ok} |`,
    `| WARN | ${summary.warn} |`,
    `| FAIL | ${summary.fail} |`,
    `| INFO | ${summary.info} |`,
    ``,
    `## Findings`,
    ``,
  ];
  for (const f of findings) {
    lines.push(`- **${f.sev.toUpperCase()}** [${f.area}] ${f.msg}`);
  }
  lines.push(``, `## Screenshots`, ``, `See \`${path.relative(ROOT, SHOTS)}/\``, ``);
  fs.writeFileSync(mdPath, lines.join("\n"));

  console.log(`\n=== SUMMARY: ${summary.ok} ok · ${summary.warn} warn · ${summary.fail} fail ===`);
  console.log(`Report: ${mdPath}`);
  console.log(`JSON:   ${jsonPath}`);
  console.log(`Shots:  ${SHOTS}\n`);

  if (summary.fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
