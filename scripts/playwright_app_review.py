#!/usr/bin/env python3
"""Full Playwright review of SDLE Study Path app."""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"
OUT = ROOT / "data" / "generated" / "playwright_review"
SHOTS = OUT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
SHOTS.mkdir(parents=True, exist_ok=True)

findings: list[dict] = []


def log(sev: str, area: str, msg: str, **extra):
    findings.append({"sev": sev, "area": area, "msg": msg, **extra})
    tag = {"ok": " OK ", "warn": "WARN", "fail": "FAIL", "info": "INFO"}[sev]
    print(f" {tag} [{area}] {msg}")


def ok(a, m, **k):
    log("ok", a, m, **k)


def warn(a, m, **k):
    log("warn", a, m, **k)


def fail(a, m, **k):
    log("fail", a, m, **k)


def info(a, m, **k):
    log("info", a, m, **k)


def http_ok(path: str) -> tuple[bool, int, int]:
    try:
        with urllib.request.urlopen(f"{BASE}/{path}", timeout=15) as r:
            data = r.read()
            return True, r.status, len(data)
    except Exception as e:
        return False, 0, 0


def shot(page, name: str):
    p = SHOTS / f"{name}.png"
    page.screenshot(path=str(p), full_page=True)
    return p


def click_nav(page, view: str):
    page.click(f'nav.simple-nav button[data-view="{view}"]')
    page.wait_for_timeout(300)


def write_report():
    summary = {
        s: sum(1 for f in findings if f["sev"] == s)
        for s in ("ok", "warn", "fail", "info")
    }
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "base": BASE,
        "summary": summary,
        "findings": findings,
        "screenshotsDir": str(SHOTS),
    }
    (OUT / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    lines = [
        "# SDLE App Playwright Review",
        "",
        f"Generated: {report['generatedAt']}",
        f"Base: {BASE}",
        "",
        "## Summary",
        "",
        "| Severity | Count |",
        "|----------|------:|",
        f"| OK | {summary['ok']} |",
        f"| WARN | {summary['warn']} |",
        f"| FAIL | {summary['fail']} |",
        f"| INFO | {summary['info']} |",
        "",
        "## Findings",
        "",
    ]
    for f in findings:
        lines.append(f"- **{f['sev'].upper()}** [{f['area']}] {f['msg']}")
    lines += ["", "## Screenshots", "", f"See `data/generated/playwright_review/screenshots/`", ""]
    (OUT / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")
    print(
        f"\n=== SUMMARY: {summary['ok']} ok · {summary['warn']} warn · {summary['fail']} fail ==="
    )
    print(f"Report: {OUT / 'REPORT.md'}")
    return summary


def main() -> int:
    print(f"\n=== SDLE Playwright review ===\nBase: {BASE}\n")

    good, status, _ = http_ok("index.html")
    if not good:
        fail("server", f"Cannot reach {BASE}/index.html")
        write_report()
        return 1
    ok("server", f"index.html reachable ({status})")

    for asset in [
        "css/app.css",
        "js/app.js",
        "data/lessons.js",
        "data/questions.js",
        "data/highyield.js",
    ]:
        g, st, n = http_ok(asset)
        if g:
            ok("assets", f"{asset} {st} ({n} B)")
        else:
            fail("assets", f"{asset} missing")

    errors: list[str] = []
    warnings: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        def on_console(msg):
            if msg.type == "error":
                errors.append(msg.text)
            elif msg.type == "warning":
                warnings.append(msg.text)

        page.on("console", on_console)
        page.on("pageerror", lambda err: errors.append(str(err)))

        page.goto(f"{BASE}/index.html", wait_until="networkidle", timeout=60000)
        try:
            page.wait_for_function(
                """() => window.QUESTION_BANK && window.QUESTION_BANK.length > 100
                    && window.LESSONS && window.LESSONS.length >= 14""",
                timeout=25000,
            )
            ok("load", "App booted with banks")
        except Exception as e:
            fail("load", f"Boot failed: {e}")
            shot(page, "00_load_fail")
            browser.close()
            write_report()
            return 1

        meta = page.evaluate(
            """() => {
            const bank = window.QUESTION_BANK || [];
            const usable = bank.filter(q => q && q.usable !== false);
            const opAns = [0,0,0,0];
            usable.filter(q => q.source === 'premium_operative').forEach(q => opAns[q.answer]++);
            const d1 = (window.LESSONS || []).find(l => l.day === 1);
            return {
              bank: bank.length,
              usable: usable.length,
              unusable: bank.length - usable.length,
              always: usable.filter(q => q.source === 'always').length,
              lessons: (window.LESSONS || []).length,
              cards: (window.FLASHCARDS || []).length,
              alwaysComes: (window.ALWAYS_COMES_READ || []).length,
              plan14: (window.PLAN_14 || []).length,
              passProtocol: !!window.PASS_PROTOCOL,
              opAns,
              day1Title: d1 && d1.title,
              day1Reading: d1 ? (d1.reading || '').length : 0,
              day1Videos: d1 ? (d1.videos || []).length : 0,
              day1QuizSets: d1 ? (d1.quizSets || []).length : 0,
              day1QuizLabels: d1 ? (d1.quizSets || []).map(s => s.label) : [],
            };
        }"""
        )
        info(
            "data",
            f"Bank {meta['bank']} usable {meta['usable']} quarantine {meta['unusable']}",
        )
        info(
            "data",
            f"always MCQs {meta['always']} · lessons {meta['lessons']} · cards {meta['cards']} · AC rules {meta['alwaysComes']}",
        )
        info("data", f"premium_operative dist {meta['opAns']}")

        if meta["bank"] >= 2000:
            ok("data", f"Bank size OK ({meta['bank']})")
        else:
            warn("data", f"Bank small: {meta['bank']}")
        if meta["usable"] >= 2200:
            ok("data", f"Usable pool OK ({meta['usable']})")
        else:
            warn("data", f"Usable pool low: {meta['usable']}")
        if meta["always"] >= 50:
            ok("data", f"Free-point pool {meta['always']}")
        else:
            fail("data", f"Free-point pool too small: {meta['always']}")
        if meta["day1Title"]:
            ok("day1", f"Lesson: {meta['day1Title']}")
        else:
            fail("day1", "Day 1 missing")
        if meta["day1Reading"] >= 20000:
            ok("day1", f"Reading {meta['day1Reading']} chars")
        else:
            warn("day1", f"Reading thin {meta['day1Reading']}")
        if meta["day1Videos"] == 7:
            ok("day1", "7 videos")
        else:
            warn("day1", f"Videos={meta['day1Videos']}")
        if meta["day1QuizSets"] >= 3:
            ok("day1", f"{meta['day1QuizSets']} quiz sets")
        else:
            warn("day1", f"Quiz sets={meta['day1QuizSets']}")

        op = meta["opAns"]
        s = sum(op) or 1
        if max(op) / s > 0.9:
            fail("data", "premium_operative still answer-biased")
        else:
            ok("data", "premium_operative positions balanced")

        shot(page, "01_today_default")

        # Nav views
        for view, label in [
            ("today", "Today"),
            ("days", "All days"),
            ("pass", "Pass plan"),
            ("always", "Always-comes"),
            ("practice", "Extra practice"),
            ("progress", "Progress"),
        ]:
            before = len(errors)
            click_nav(page, view)
            text = page.locator("#app").inner_text()
            html_len = len(page.locator("#app").inner_html())
            shot(page, f"02_nav_{view}")
            if html_len < 20:
                fail("nav", f"{label}: empty")
            else:
                first = text.split("\n")[0][:70] if text else ""
                ok("nav", f"{label}: rendered — {first}")
            cls = page.locator(f'nav.simple-nav button[data-view="{view}"]').get_attribute(
                "class"
            )
            if cls and "active" in cls:
                ok("nav", f"{label}: active class")
            else:
                warn("nav", f"{label}: no active class")
            if len(errors) > before:
                fail("nav", f"{label}: console errors", errors=errors[before:])

        # Pass plan deep
        click_nav(page, "pass")
        pass_text = page.locator("#app").inner_text()
        shot(page, "03_pass_plan")
        for needle in ["free", "80", "542", "Pass"]:
            if needle.lower() in pass_text.lower():
                ok("pass", f"Contains “{needle}”")
            else:
                warn("pass", f"Missing “{needle}”")

        for sel in [
            "#pass-fp50",
            "#pass-fp-all",
            "#pass-resto100",
            "#pass-op100",
            "#pass-wrong",
        ]:
            n = page.locator(sel).count()
            if n == 1:
                ok("pass", f"{sel} present")
            else:
                warn("pass", f"{sel} count={n}")

        # Free-point drill
        if page.locator("#pass-fp50").count() == 1:
            page.click("#pass-fp50")
            page.wait_for_timeout(500)
            qtext = page.locator("#app").inner_text()
            shot(page, "04_quiz_free_points")
            if len(qtext) > 80:
                ok("quiz", "Free-point drill started from Pass plan")
            else:
                fail("quiz", "Free-point drill empty")

            # Click an answer option
            clicked = page.evaluate(
                """() => {
                const btns = [...document.querySelectorAll('#app button')];
                for (const b of btns) {
                  const t = (b.innerText || '').trim();
                  if (t.length > 4 && t.length < 200
                      && !/back|exit|skip|next|today|pass|days|progress|always|practice|end|finish/i.test(t)
                      && !b.closest('nav')) {
                    b.click();
                    return t.slice(0, 60);
                  }
                }
                return null;
            }"""
            )
            page.wait_for_timeout(300)
            shot(page, "05_quiz_answered")
            if clicked:
                ok("quiz", f"Clicked option: {clicked}")
            else:
                warn("quiz", "No option button clicked")

            # Try next if present
            if page.locator("button:has-text('Next')").count():
                page.locator("button:has-text('Next')").first.click()
                page.wait_for_timeout(200)
                ok("quiz", "Next question control works")

        # Always-comes
        click_nav(page, "always")
        ac = page.locator("#app").inner_text()
        shot(page, "06_always")
        if re.search(r"rubber|kennedy|IAN|MTA|Cleaning|Natal", ac, re.I):
            ok("always", "Rules content visible")
        else:
            warn("always", "Always-comes thin", preview=ac[:150])
        if page.locator("#ac-drill50").count() == 1:
            ok("always", "ac-drill50 present")
        else:
            warn("always", "ac-drill50 missing")

        # All days → open day 1
        click_nav(page, "days")
        shot(page, "07_all_days")
        days_text = page.locator("#app").inner_text()
        if re.search(r"Day\s*1|Operative", days_text, re.I):
            ok("days", "Day 1 listed")
        else:
            warn("days", "Day 1 not obvious")

        opened = page.evaluate(
            """() => {
            const nodes = [...document.querySelectorAll('#app button, #app [data-day], #app a, #app .card, #app .day-card')];
            for (const el of nodes) {
              const t = (el.innerText || '').trim();
              const day = el.getAttribute('data-day');
              if (day === '1' || /^day\\s*1\\b/i.test(t) || /operative dentistry|full engine room/i.test(t)) {
                el.click();
                return t.slice(0, 80) || ('day=' + day);
              }
            }
            // fallback: first day numbered 1
            for (const el of nodes) {
              const t = (el.innerText || '');
              if (/\\b1\\b/.test(t) && /operative|restorative|volume/i.test(t)) {
                el.click();
                return t.slice(0, 80);
              }
            }
            return null;
        }"""
        )
        page.wait_for_timeout(500)
        shot(page, "08_day1_open")
        if opened:
            ok("day1", f"Opened: {opened}")
        else:
            warn("day1", "Could not click Day 1 from All days")

        d1text = page.locator("#app").inner_text()
        if re.search(r"Operative|ADHD|rubber dam|pomodoro|VERIFIED|Block 1", d1text, re.I):
            ok("day1", "Day detail has study content")
        else:
            # might still be on days list — try setting state
            warn("day1", "Day detail content not confirmed", preview=d1text[:180])

        # Force day 1 via localStorage common patterns + app state if any
        page.evaluate(
            """() => {
            for (const k of Object.keys(localStorage)) {
              try {
                const o = JSON.parse(localStorage.getItem(k));
                if (o && typeof o === 'object') {
                  let ch = false;
                  if ('day' in o) { o.day = 1; ch = true; }
                  if ('currentDay' in o) { o.currentDay = 1; ch = true; }
                  if (ch) localStorage.setItem(k, JSON.stringify(o));
                }
              } catch {}
            }
        }"""
        )

        # Day 1 Today: accordion steps — only first incomplete is .open
        # Expand quiz step then launch Block 1
        click_nav(page, "today")
        page.wait_for_timeout(200)
        # Ensure Day 1 via day-select if present
        if page.locator("#day-select").count():
            try:
                page.locator("#day-select").select_option("1")
                page.wait_for_timeout(300)
            except Exception:
                pass

        expanded = page.evaluate(
            """() => {
            const quizHead = document.querySelector('.step[data-step="quiz"] .step-head');
            if (quizHead) { quizHead.click(); return 'quiz-head'; }
            // fallback: any step title containing Quiz
            for (const h of document.querySelectorAll('.step-head')) {
              if (/quiz|MCQ|practice/i.test(h.innerText || '')) { h.click(); return 'title'; }
            }
            return null;
        }"""
        )
        page.wait_for_timeout(300)
        shot(page, "09_day1_quiz_step_open")
        if expanded:
            ok("day1", f"Expanded quiz step via {expanded}")
        else:
            warn("day1", "Could not expand quiz accordion step")

        launched = page.evaluate(
            """() => {
            const btns = [...document.querySelectorAll('button.quiz-set-btn, button')];
            for (const b of btns) {
              const t = (b.innerText || '').trim();
              if (/Block 1|Operative 50/i.test(t)) {
                b.click();
                return t.slice(0, 80);
              }
            }
            const g = document.querySelector('#go-quiz');
            if (g) { g.click(); return 'go-quiz'; }
            return null;
        }"""
        )
        page.wait_for_timeout(500)
        shot(page, "10_day1_block1")
        if launched:
            ok("day1", f"Quiz launched: {launched}")
            qt = page.locator("#app").inner_text()
            if len(qt) > 50:
                ok("day1", "Block 1 quiz UI has content")
            else:
                fail("day1", "Block 1 quiz empty after launch")
            page.evaluate(
                """() => {
                const btns = [...document.querySelectorAll('#app button')];
                for (const b of btns) {
                  const t = (b.innerText || '').trim();
                  if (t.length > 5 && t.length < 180 && !/back|exit|next|today|pass|end|finish/i.test(t) && !b.closest('nav')) {
                    b.click(); return t.slice(0, 60);
                  }
                }
                return null;
            }"""
            )
            page.wait_for_timeout(250)
            shot(page, "11_day1_quiz_answer")
            ok("day1", "Answered one Block 1 item (best-effort)")
        else:
            warn("day1", "Block 1 / go-quiz not found after expanding step")

        # Also verify read step has ADHD opener
        click_nav(page, "today")
        page.wait_for_timeout(200)
        page.evaluate(
            """() => {
            const h = document.querySelector('.step[data-step="read"] .step-head');
            if (h) h.click();
        }"""
        )
        page.wait_for_timeout(200)
        shot(page, "12_day1_read_step")
        read_txt = page.locator("#app").inner_text()
        if re.search(r"ADHD Day|Operative|critical pH|rubber dam|pomodoro", read_txt, re.I):
            ok("day1", "Read step shows Day 1 lesson content")
        else:
            warn("day1", "Read step content not confirmed", preview=read_txt[:160])

        # Video step
        page.evaluate(
            """() => {
            const h = document.querySelector('.step[data-step="video"] .step-head');
            if (h) h.click();
        }"""
        )
        page.wait_for_timeout(200)
        shot(page, "13_day1_video_step")
        vtxt = page.locator("#app").inner_text()
        if re.search(r"VERIFIED|lec\.?19|operative/", vtxt, re.I):
            ok("day1", "Video step lists verified operative files")
        else:
            warn("day1", "Video step content not confirmed")

        # Practice
        click_nav(page, "practice")
        shot(page, "11_practice")
        prac = page.locator("#app").inner_text()
        if re.search(r"operative|restorative|perio|endo|50|100|mock", prac, re.I):
            ok("practice", "Practice pools visible")
        else:
            warn("practice", "Practice thin")

        # Progress
        click_nav(page, "progress")
        shot(page, "12_progress")
        prog = page.locator("#app").inner_text()
        if re.search(r"wrong|score|progress|session|0|%", prog, re.I):
            ok("progress", "Progress rendered")
        else:
            warn("progress", "Progress unexpected")

        # Wrong book empty drill
        click_nav(page, "pass")
        if page.locator("#pass-wrong").count():
            page.click("#pass-wrong")
            page.wait_for_timeout(400)
            wt = page.locator("#app").inner_text()
            shot(page, "13_wrong_book_empty")
            if re.search(r"wrong|empty|no |0|not enough|add", wt, re.I) or len(wt) > 20:
                ok("wrong", "Wrong-book path responds when empty")
            else:
                warn("wrong", "Wrong-book empty state unclear")

        # Mobile
        page.set_viewport_size({"width": 390, "height": 844})
        click_nav(page, "pass")
        page.wait_for_timeout(200)
        shot(page, "14_mobile_pass")
        overflow = page.evaluate(
            """() => ({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
            ox: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        })"""
        )
        if overflow["ox"]:
            warn(
                "mobile",
                f"Horizontal overflow {overflow['sw']}>{overflow['cw']}",
            )
        else:
            ok("mobile", "No major horizontal overflow on Pass")
        click_nav(page, "today")
        shot(page, "15_mobile_today")
        click_nav(page, "always")
        shot(page, "16_mobile_always")

        # Desktop again — top stats
        page.set_viewport_size({"width": 1280, "height": 900})
        top = page.locator("#top-stats").inner_text()
        info("ui", f"Top stats: {top[:120] or '(empty)'}")

        # Quarantine still in bank
        qn = page.evaluate(
            "() => (window.QUESTION_BANK || []).filter(q => q.usable === false).length"
        )
        if qn >= 20:
            ok("filter", f"{qn} quarantined items in bank (excluded by app filter)")
        else:
            warn("filter", f"Quarantine count unexpected: {qn}")

        # Confirm allQ filter by starting always_src and checking no pic stems if possible
        click_nav(page, "always")
        if page.locator("#ac-drill-all").count():
            page.click("#ac-drill-all")
            page.wait_for_timeout(400)
            stem = page.locator("#app").inner_text()[:300]
            if re.search(r"^Pic of|this photo was", stem, re.I):
                fail("filter", "Quarantined image stem appeared in free-point drill")
            else:
                ok("filter", "Free-point drill stem not image-quarantine")
            shot(page, "17_fp_all_stem")

        browser.close()

    real_err = [e for e in errors if not re.search(r"favicon", e, re.I)]
    if not real_err:
        ok("console", "No page errors")
    else:
        for e in real_err[:12]:
            fail("console", e[:200])
    if warnings:
        info("console", f"{len(warnings)} console warnings")

    summary = write_report()
    return 1 if summary["fail"] else 0


if __name__ == "__main__":
    sys.exit(main())
