# Follow-up to AUDIT_REPORT_2026-07-20 — gap close

**Date:** 2026-07-20  
**Tree:** `/data/prometric/sdle-prep`  
**Artifacts:** `data/generated/browser_proof/`

---

## 1. Live browser MCQ + localStorage persistence

**Method:** Headed-equivalent Chromium from Playwright cache (`chromium-1148`), live URL `https://xxxova2.github.io/sdle-study-path/`. Not “code looks right” — raw `localStorage` dumps.

### Simple mode (run 1 — `results.json`)

**BEFORE_any_mcq**
```
stats: null
history: null
planLength: "14"
simpleMode: "true"
```

**AFTER_simple_mcqs** (answered MCQs; restorative path; options clicked including real stems)
```
stats: {"answered":2,"correct":0,"byTopic":{"restorative":{"a":2,"c":0}},"bySubtopic":{"rpd":{"a":1,"c":0},"operative":{"a":1,"c":0}}}
history: [{"ts":1784496537443,"mode":"learn","label":"Learn · Full bank · 100Q (partial)","topic":"all","total":100,"answered":2,"correct":0,"pct":0,"sec":3}]
seenIds: {"fr_boost_046":true,"op_boost_089":true}
wrongBook: ["fr_boost_046","op_boost_089"]
planLength: "14"
simpleMode: "true"
```

**AFTER_reload** (same session profile, full page reload)
```
stats: {"answered":2,"correct":0,"byTopic":{"restorative":{"a":2,"c":0}},"bySubtopic":{"rpd":{"a":1,"c":0},"operative":{"a":1,"c":0}}}
history: [{"ts":1784496537443,"mode":"learn","label":"Learn · Full bank · 100Q (partial)","topic":"all","total":100,"answered":2,"correct":0,"pct":0,"sec":3}]
```
→ **Identical** stats + history after reload.

### Coach mode (run 2 — `mcq_persist.json`)

Topics **endo** + **ethics** (plus endo MCQ hub test mode).

**COACH_after_ethics** (before reload)
```
stats: {"answered":4,"correct":1,"byTopic":{"endo":{"a":2,"c":0},"ethics":{"a":2,"c":1}},"bySubtopic":{"irrigant":{"a":1,"c":0},"access":{"a":1,"c":0}}}
history: [{"ts":1784496694809,"mode":"test","label":"Test · Endo · 50Q (partial)","topic":"endo","total":50,"answered":2,"correct":0,"pct":0,"sec":4}]
seenIds: {"end_boost_063":true,"end_boost_032":true,"saud_delta_074":true,"pass_fp_001":true}
wrongBook: ["end_boost_063","end_boost_032","saud_delta_074"]
planLength: "14"
simpleMode: "false"
```

**COACH_after_reload**
```
stats: {"answered":4,"correct":1,"byTopic":{"endo":{"a":2,"c":0},"ethics":{"a":2,"c":1}},"bySubtopic":{"irrigant":{"a":1,"c":0},"access":{"a":1,"c":0}}}
history: [{"ts":1784496694809,"mode":"test","label":"Test · Endo · 50Q (partial)","topic":"endo","total":50,"answered":2,"correct":0,"pct":0,"sec":4}]
```
→ **Identical** after reload. Topics covered across runs: **restorative, endo, ethics** (≥3).

Files: `data/generated/browser_proof/results.json`, `mcq_persist.json`.

---

## 2. showStorageWarn() — real throw path

Monkeypatched `Storage.prototype.setItem` / `localStorage.setItem` to throw `QuotaExceededError`, then navigated so `store.set` ran.

**Console (paste):**
```
[warning] sdle store.set failed: viewStack QuotaExceededError
[warning] sdle: localStorage write failed (quota or private mode)
[warning] sdle store.set failed: stats QuotaExceededError
[warning] sdle store.set failed: history QuotaExceededError
… (also day, planLength, wrongBook, seenIds, …)
```

**Banner DOM (paste):**
```html
<div id="sdle-storage-warn" role="alert" style="position: fixed; bottom: 12px; left: 12px; right: 12px; z-index: 9999; background: rgb(127, 29, 29); color: rgb(255, 255, 255); padding: 10px 14px; border-radius: 8px; font: 14px / 1.4 system-ui, sans-serif; box-shadow: rgba(0, 0, 0, 0.4) 0px 4px 20px;">Could not save progress (storage full or private mode). Free space or leave private browsing.</div>
```

**Screenshot:** `data/generated/browser_proof/storage_warn.png`

**Source that fires it** (`js/app.js`):
```7:44:js/app.js
  function showStorageWarn() {
    ...
        "Could not save progress (storage full or private mode). Free space or leave private browsing.";
  ...
    set(k, v) {
      try {
        localStorage.setItem("sdle3_" + k, JSON.stringify(v));
        return true;
      } catch (e) {
        ...
        showStorageWarn();
        return false;
      }
    },
```

---

## 3. Pass pack / Always / wrong-book → `allQ()` (exact lines)

### Shared filter
```4135:4137:js/app.js
  function allQ() {
    // usable:false = quarantined ...
    return (window.QUESTION_BANK || []).filter((q) => q && q.usable !== false);
  }
```

### Pool (every delivery path starts here)
```4220:4224:js/app.js
  function pool(topic) {
    const { base, unseenOnly } = parsePoolTopic(topic);
    let p = allQ();
    if (base === "wrong") p = state.wrongBook.map((id) => p.find((q) => q.id === id)).filter(Boolean);
    else if (base === "always_src") p = p.filter((q) => q.source === "always");
```

### Pass pack UI → volume buttons → startQuiz → pool
- `renderPass()` at **line 2803**; ROI buttons:
```2864:2870:js/app.js
        ${volBtn("always_src", 50, "Free points", "success")}
        ${volBtn("always_src", QUIZ_ALL, "Free points ALL", "success")}
        ...
        ${volBtn("wrong", QUIZ_ALL, "Wrong book", "ghost")}
```
- `volBtn` **4325**; bind:
```4353:4356:js/app.js
  function bindVolButtons(root) {
    (root || app).querySelectorAll("button.vol-btn[data-t]").forEach((b) => {
      b.onclick = () => startQuiz(b.dataset.t, +b.dataset.n, "learn", false);
```
- `startQuiz` **4471**:
```4471:4472:js/app.js
  function startQuiz(topic, count, mode, timed, secPer) {
    let p = pool(topic);
```

### Always tab
- `renderAlways()` **2976**; drills:
```3008:3010:js/app.js
          ${volBtn("always_src", 25, "Practice 25", "")}
          ${volBtn("always_src", 50, "Practice 50", "")}
          ${volBtn("always_src", QUIZ_ALL, "Practice ALL", "success")}
```
Same `volBtn` → `startQuiz` → `pool("always_src")` → **`allQ()` then `source==="always"`**.

### Wrong-book resurfacing
1. **Quiz delivery:** `pool("wrong")` line **4223** — maps wrongBook ids **through** the `allQ()` array (`p.find`); unusable IDs drop out (`filter(Boolean)`).
2. **Export:** `exportWrongBook` **3595–3596** uses `pool("wrong")` (same filter).
3. **Suggestion tally:** `nextBestAction` **622–623** uses `allQ().find` for topic bias (not raw bank).
4. **Weak pack prioritization:** `startQuiz` **4484–4487** reorders weak pool with wrongBook set, but weak pool itself already came from `pool` → `allQ()`.

**Not low risk — confirmed:** wrong-book *quiz* items cannot be unusable if they are only resolved via `pool("wrong")`.

---

## 4. planLength=14 after check_plan_tracks fix

**Product code** (`data/plan_tracks.js` **204–208**):
```js
function normalizeLength(length) {
  const n = +length;
  // Unknown / missing → 30 (default track), not 14 blitz
  return ALLOWED.indexOf(n) >= 0 ? n : 30;
}
```
`ALLOWED = [14, 30, 45, 60, 90]`.

**App boot** (`js/app.js` **148–161**): reads `store.get("planLength", 30)` then `normalizePlanLength(...)`.

**Node proof:**
```
saved 14 -> 14
saved 30 -> 30
saved 90 -> 90
saved 99 invalid -> 30
```

**Gate change only** (`scripts/check_plan_tracks.sh`):
```
if(... normalizePlanLength(99)!==30) throw new Error("norm");
```
Previously expected `!==14`. **No runtime path changed for valid 14.** Existing `sdle3_planLength=14` stays **14**. Live browser dumps above kept `"planLength":"14"` through the whole session.

---

## 5. Actual `docs/AGENT_APP_MAP.md` diff (commit 110baef)

```diff
- | `data/questions.js` | `window.QUESTION_BANK` | Full MCQ array (~2533) |
+ | `data/questions.js` | `window.QUESTION_BANK` | Full MCQ array (**2533** verified 2026-07-20; **2501** usable) |

- - July 2026 pass: ... **0** junk placeholders remaining at that pass.
- - ~**32** items may be `usable: false` (image-dependent).
- - The other ~**1200** items already had unique explanations (premium/saud/hy) and were **not** all re-audited in that pass.
+ - July 2026 pass: ... **0** junk placeholders remaining (re-verified **2026-07-20** full audit).
+ - **32** items `usable: false` (image-dependent) — all have `exclude_reason`.
+ - **0** explanations under 50 chars; **226** `saud_delta` Why texts rewritten to clinical hinges (**2026-07-20**); **0** remaining provenance-style saud blocks.
+ - The other ~**1200** premium/always items already had unique explanations and were **not** all re-audited for answer correctness in that pass.
+ - Full integrity write-up: `AUDIT_REPORT_2026-07-20.md` (repo root).

- 3. **Two folders** (`sdle-prep` vs `sdle-study-path`) — confirm which remote `git push` updates Pages.
+ 3. **Two folders** (`sdle-prep` vs `sdle-study-path`) — **push only from `sdle-prep`**. Sibling can lag with thousands of junk explanations and the **same** GitHub remote (would clobber Pages).
```

**This follow-up** also updates sibling lines to `sdle-study-path.ARCHIVED-DO-NOT-PUSH` (see §7).

Full: `git show 110baef -- docs/AGENT_APP_MAP.md`

---

## 6. Where “~351 thin explanations” came from

**Not in `AGENT_APP_MAP.md`.**  
`rg 351 docs/AGENT_APP_MAP.md` → no hits (only the word “thin” in “thin `store.get` wrappers”).  
Original map commit `cfa63cb` also has **no** `351`.

**Actual source:** prior agent session compaction / hinge pass notes:

- Session summary: “~351 thin but real hinges remain”
- Compaction segment: `thin (<80 chars) 351` and “expand the 351 thin ones”
- Path: `.../compaction/segment_001.md` lines ~3713, ~3789, ~3795

**Meaning:** count of explanations **&lt;80 chars** after the July abtal rewrite — **not** the audit’s &lt;50-char gate (which was **0**). The audit report incorrectly attributed “map claimed ~351”; the map never said that — **session notes did**. Corrected here.

---

## 7. Sibling rename (structural anti-clobber)

```text
Before: /data/prometric/sdle-study-path
After:  /data/prometric/sdle-study-path.ARCHIVED-DO-NOT-PUSH
```

```bash
# verified
test ! -e /data/prometric/sdle-study-path && echo 'no active sibling path'
# archive present; prep remains canonical
ls /data/prometric/ | grep sdle
# sdle-prep
# sdle-study-path.ARCHIVED-DO-NOT-PUSH
```

Prep had full SPA content + map + bank before rename. Archive still has a `.git` remote; **do not push from archive**.

---

## 8. saud_delta top tier

### Exposure ranking
**No multi-user `stats`/`history` store exists server-side.** Client history is per-browser only.

**Proxy used this pass:** SCFHS-ish blueprint weight (restorative 0.40 first — matches Pass ROI / most-served pools) then shorter hinge first.

Top 30 IDs written to `data/generated/mcq_fix/_saud_top30.json`.  
Remainder flagged in `data/generated/mcq_fix/_saud_rest_flagged.json` (**196** items — hinge present, not re-upgraded this pass).

### Top tier rewrite
`out_saud_top30.json` applied via `apply_mcq_fixes.py` (`force: true`).

Sample lengths after apply: **338–462** chars (was ~135–223 for those ids).  
All 226 still **0** provenance. Rest **not** quarantined.

---

## Cache / ship
- `index.html` `?v=20260720b` (this follow-up bank touch)
- Browser proof artifacts under `data/generated/browser_proof/`
