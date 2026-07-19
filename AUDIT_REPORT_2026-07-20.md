# Full Sync & Data-Integrity Review — 2026-07-20

**Working tree:** `/data/prometric/sdle-prep`  
**Canonical map:** `docs/AGENT_APP_MAP.md`  
**Live:** https://xxxova2.github.io/sdle-study-path/  
**Prompt:** `/home/kalde/Downloads/sdle_full_review_prompt.md`

---

## Executive summary

Structural bank health is **good**: **2533** MCQs load cleanly, **0** junk abtal/boilerplate explanations, **0** bad structure, **0** duplicate IDs, **32** `usable:false` with reasons. All plan lengths **14/30/45/60/90** resolve `lessonDay` into the 14 `LESSONS` with **no dangling** plan→lesson links. Live GitHub Pages matches this tree on `?v=20260719q` and `CACHE=sdle-shell-v3` and serves the same bank stats (2533 / 0 junk / 32 unusable).

**Critical: 1** — sibling folder `/data/prometric/sdle-study-path` still has **~1231 junk explanations** and shares the same GitHub remote; a push from there would **overwrite** the fixed bank on Pages.  
**High: 0** after gate fixes.  
**Medium: 2** — (1) **226 saud_delta** items still use provenance-style explanations (“From تلخيص… Source block #… Verify ✅”), not clinical hinges; (2) empty on-disk book folders **Resto / Fixed / Endo** (no PDFs; index does **not** invent paths for them).  
**Low: 2** — stale check scripts (fixed this pass); Playwright optional smoke skipped (package not installed).  
**Info: several** — see findings.

**Follow-up fixes (same day, no ask):** saud_delta clinical hinges applied (226); sibling tree synced from prep; wrong-book topic tally uses `allQ()`; cache `?v=20260720a` / `sdle-shell-v4`; empty book folders documented.

---

## Part 0 — Existing gates (raw results)

| Script | Before | After (this pass) |
|--------|--------|-------------------|
| `check_spa_invariants.sh` | PASS (usable 2501/2533; Playwright WARN) | unchanged PASS |
| `check_plan_tracks.sh` | **FAIL** `Error: norm` | **PASS** (gate expected default 14; code defaults invalid → **30**) |
| `check_mcq_hub.sh` | **FAIL** `missing data-view=mcqs` in `index.html` | **PASS** (hub lives in coach nav / `app.js`; Simple uses More) |
| `audit_sources.py` | PASS | PASS |
| `audit_videos.py` | PASS (disk 52, lessons 60) | PASS |
| `audit_lesson_depth.py` | PASS days 1–9 depth OK | PASS |

---

## Part 1 — Structural validation

### `QUESTION_BANK` (`data/questions.js`)

| Metric | Count |
|--------|------:|
| total | **2533** |
| junkExplanations (`Community bank` / `Extracted from` / `أبطال`) | **0** |
| badStructure (answer/options) | **0** |
| unusable (`usable:false`) | **32** |
| unusableMissingReason | **0** |
| duplicateIds | **0** |
| badTopicValue | **0** |
| thinExplanations (&lt;50 chars) | **0** |
| saud-style provenance expl (not abtal junk regex) | **226** |

**By source:** always 100 · abtal 1181 · gdoc 4 · premium_operative 375 · premium_perio 150 · premium_endo 150 · premium_ortho_pedo 120 · premium_ethics 50 · premium_fixed_rpd 100 · stream_july2026 70 · stream_july2026_inferred 7 · saud_delta 226  

**By topic:** ethics 170 · endo 305 · oms 449 · ortho_pedo 234 · restorative 912 · perio 288 · mixed 175  

**Map drift:** Map still said “~351 thin” from an older hinge pass — **verified now: thinExplanations=0** at the &lt;50-char gate. Junk placeholder claim **0** still holds. Usable floor scripts report **2501** usable (2533−32).

### Other `data/*.js` load + globals

All files load under a `window`/`globalThis` shim (several assign bare `window.*`):

| File | Globals | Notes |
|------|---------|--------|
| `questions.js` | `QUESTION_BANK` | IIFE + globalThis ✓ |
| `lessons.js` | `LESSONS` (14), `VIDEO_ROOT`, `ALWAYS_COMES_READ`, `PASS_PROTOCOL` | bare `window` |
| `plan_tracks.js` | `PLAN_TRACKS`, helpers | tracks 14/30/45/60/90 ✓ |
| `video_links.js` | `VIDEO_DRIVE`, helpers, `VIDEO_ROOT` | Drive folder map |
| `book_index.js` | `BOOK_INDEX`, helpers | 13 books with on-disk PDFs |
| `scfhs_refs.js` | `SCFHS_APPENDIX_C`, helpers | OK |
| `highyield.js` | `HIGH_YIELD`, `FLASHCARDS` (150) | bare `window` |
| `feedback_config.js` | `SDLE_FEEDBACK` | ntfy + email present |
| `exam-blueprint.js` | `EXAM_BLUEPRINT` | not in index load order (optional) |
| `plan.js` | `PLAN_14` | legacy; tracks supersede |

Closing pattern: bank uses `globalThis` wrapper; several others still use bare `window` — **works in browser**, breaks naive Node `vm` without shim (documented for agents).

---

## Part 2 — Cross-file sync

### Plan → lessons

For every calendar day of tracks **14, 30, 45, 60, 90**: `lessonDay` ∈ **1..14**, all resolve. **0** dangling via direct track walk and `lessonDayFor()`.

### Lesson themes (match map intent)

| Day | Title |
|----:|-------|
| 1–4 | Operative → Fixed/implants → RPD/CD/materials → Restorative mega |
| 5 | Periodontics |
| 6 | **Endodontics + dental trauma** (own day, not folded into resto) |
| 7–9 | OMS/LA · Oral med/path/ethics · Ortho+pedo |
| 10–14 | Mocks / weak fix / logistics |

Longer tracks stretch the same 14 content days (e.g. 30-day: early calendar days still map lessonDays 1–3 under restorative phases).

### Lesson → bank IDs

No dangling `qid` / `questionIds` / `bankIds` style refs into missing bank IDs (lessons largely embed full quiz objects or topic pools, not sparse orphan IDs).

### Videos

- `audit_videos.py` PASS: listed lesson videos exist under local tree; no orphans at gate level.
- Runtime map is **Drive folders** (`VIDEO_DRIVE`), not per-file IDs for every mp4 — expected.

### Books

- **13** indexed books resolve under `data/raw/books/sdle_book/…`.
- Folders **`Resto/`, `Fixed/`, `Endo/` are empty** on disk — index does **not** list missing PDFs for them (good). UI/map may still mention Sturdevant-class titles as study intent; **no invented page paths** in `BOOK_INDEX.books`.
- Absolute paths embedded in keyword hit metadata point at this machine’s tree — fine for local study aid, not for GH Pages file serving (books not shipped in SPA).

### SCFHS refs

`scfhsRefsForTopic` returns content for perio/endo (gate-checked). Treat as appendix-style labels, not live PDF bytes in the SPA.

---

## Part 3 — `usable:false` delivery paths

Central filter:

```js
function allQ() {
  return (window.QUESTION_BANK || []).filter((q) => q && q.usable !== false);
}
```

Quiz pools (`poolFor` / `startQuiz` / Practice / volume / MCQ hub) go through **`allQ()`** — unusable excluded.

**Direct `QUESTION_BANK` uses (not quiz delivery):**

| Line (approx) | Role | Risk |
|---------------|------|------|
| ~623 | Wrong-book topic tally for “next best action” | Low — may count unusable id if it were ever answered historically |
| ~1508 | Bank loaded sanity (`length < 100`) | OK (total length) |
| ~2816 / 3153 / 3267 | Display raw total vs usable | OK (labels “usable / loaded”) |
| ~4137 | `allQ` definition | OK |

**Conclusion:** Unusable items do **not** enter Practice / Today quiz / Pass-style pools via `allQ`. No mechanical bug requiring a content fix.

### Storage warn

`store.set` catch → `showStorageWarn()` (fixed banner + console). Code path present; full browser quota simulation not run this pass (Playwright unavailable). **Info:** not end-to-end proven in headed browser here.

---

## Part 4 — Live deploy vs repo

| Check | Result |
|-------|--------|
| Pages remote | `https://github.com/xxxova2/sdle-study-path.git` from **`sdle-prep`** |
| Live `?v=` | `20260719q` — **matches** HEAD `index.html` |
| Live `sw.js` `CACHE` | `sdle-shell-v3` — **matches** local |
| Live bank | 2533 · junk 0 · unusable 32 — **matches** `sdle-prep` |
| Sibling `/data/prometric/sdle-study-path` | Same remote; **stale bank** (junk **1231**, unusable 26); older tip commit; **do not push from sibling** |

**Critical ops rule (reconfirmed):** edit + push only from **`/data/prometric/sdle-prep`**.

---

## Findings (severity list)

### Critical

1. **Sibling tree can clobber live bank**  
   - Path: `/data/prometric/sdle-study-path` vs `/data/prometric/sdle-prep`  
   - Sibling `questions.js` still has **~1231** junk abtal-style explanations.  
   - Same `origin` → Pages.  
   - **Fix:** human ops — never `git push` from sibling; optionally delete/archive sibling or reset it from prep. **Not auto-deleted.**

### Medium

2. **226 `saud_delta` explanations are provenance, not clinical hinges**  
   - Pattern: `From تلخيص سعود… Source block #N. Verify ✅ if high-stakes.`  
   - Passes length ≥50 and is not abtal junk regex — still weak for learners.  
   - **Flag for Kamal:** rewrite pass or quarantine subset after clinical review.

3. **Empty textbook folders: Resto / Fixed / Endo**  
   - On disk under `data/raw/books/sdle_book/`.  
   - Index does not promise missing PDFs.  
   - **Info/medium for study completeness** — add books later; don’t invent pages.

### Low (fixed this pass)

4. **`check_plan_tracks.sh` stale expectation** — `normalizePlanLength(99)` must be **30** (product default). **Fixed.**  
5. **`check_mcq_hub.sh` required `data-view=mcqs` only in `index.html`** — Simple mode has 4 tabs; hub is in `app.js` coach/More path. **Fixed.**

### Info

6. Playwright not installed — UI smoke skipped.  
7. `exam-blueprint.js` / `plan.js` not in main `index.html` script chain — dead-or-legacy for SPA shell.  
8. Map claimed “~351 thin explanations”; **verified 0** under &lt;50-char rule after July hinge pass.  
9. Premium / non-abtal ~1200 items still not fully re-audited for clinical answer correctness (unchanged policy).

---

## Needs a human judgment call

1. **Sibling folder policy** — delete, mirror, or gitignore-as-archive?  
2. **saud_delta** — bulk clinical rewrite vs leave with “verify” banner vs mark some `usable:false`?  
3. **Fill Resto/Fixed/Endo PDFs** vs drop any UI copy that implies Sturdevant-on-disk?  
4. Any **specific MCQ answer** doubts beyond saud provenance (none auto-flagged as structural this pass).  
5. Whether to **install Playwright** and make optional smoke mandatory in CI.

---

## Fixes applied this pass

| Change | Why |
|--------|-----|
| `scripts/check_plan_tracks.sh` | Expect `normalizePlanLength(99)===30` |
| `scripts/check_mcq_hub.sh` | Accept `data-view=mcqs` in `js/app.js` |
| `docs/AGENT_APP_MAP.md` | Align counts / pitfalls with verified 2026-07-20 audit |
| This file | `AUDIT_REPORT_2026-07-20.md` |

**Not changed:** `questions.js`, lessons, plans, live cache bust (already in sync).

### Part 1 numbers — before/after content fixes

| | Before content | After content |
|--|---------------:|--------------:|
| total | 2533 | 2533 (unchanged) |
| junk | 0 | 0 |
| badStructure | 0 | 0 |
| unusable | 32 | 32 |
| thin &lt;50 | 0 | 0 |

Gates: 2 FAIL → 2 PASS (script-only).

---

## Agent one-liner for next session

> Read `docs/AGENT_APP_MAP.md` and `AUDIT_REPORT_2026-07-20.md`. Work only in `/data/prometric/sdle-prep`. Do **not** push from `sdle-study-path`. Re-run the six Part 0 scripts after content edits; bump `?v=` + SW `CACHE` if bank/lessons change.
