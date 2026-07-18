# MCQs Tab + Full-Bank Test Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level **MCQs** tab that lists every usable bank item by subject (plus **All**), runs each selection as a real sequential test (no auto-reveal), lets the user optionally **Show answer** (correct choice + why), and shows an overall score + review when the set finishes.

**Architecture:** Keep the single offline SPA (`sdle-prep`). Reuse `QUESTION_BANK` + `pool()` + quiz state machine; introduce a third quiz mode `mode: "test"` (between current `learn` = instant feedback and `exam` = no feedback until end). New hub view `renderMcqs()` + nav tab `data-view="mcqs"`. Do **not** thin the bank: category **All** and per-topic **All** launch the full filtered pool (`count = QUIZ_ALL`). Explanation policy is strict: UI may only present “why” text that is tagged as hinge-safe; official-citation upgrade is a phased content pipeline (no fake SCFHS citations).

**Tech Stack:** Vanilla JS SPA (`js/app.js`, `index.html`, `css/app.css`), `window.QUESTION_BANK` in `data/questions.js`, SPA gate `scripts/check_spa_invariants.sh`, optional small Node integrity script.

---

## Spec (what “done” means)

### User-facing

1. **New main tab:** `MCQs` (always visible with the other plan tabs; never hidden by focus mode).
2. **Categories on the hub** (with live counts from `poolN`):
   - **All** (~2507 usable today)
   - **Restorative** (topic)
   - **Operative** (subtopic purity — existing `operative` pool)
   - **Perio**
   - **Endo**
   - **OMS**
   - **Ortho / Pedo**
   - **Ethics / Med**
   - **Mixed**
   - **Fixed / Implant / RPD / Materials / Complete denture** (subtopics — secondary row)
   - **Free points** (`always_src`)
   - **Saud delta** (`saud_delta`)
   - **Wrong book**
3. Choosing a category (e.g. Perio) shows:
   - Pool size (e.g. “288 MCQs”)
   - Primary CTA: **Start full test** → runs **every** usable Q in that pool (shuffled once at start)
   - Optional secondary: **Start N** (50 / 100 / 150) for shorter sessions — full test remains the default emphasis
4. **During a question (test mode):**
   - Show stem + A–D
   - User selects one option → selection locks (highlight chosen only; **no green/red**, **no explanation**)
   - Buttons: **Next** (required to advance) and **Show answer** (optional)
   - **Show answer** reveals: correct letter/text + **Why** (see explanation policy) + optional source tag
   - Whether or not they revealed, their pick still counts for scoring
5. **After last question:**
   - Overall **% correct**, correct/total, time spent
   - Logged to Progress history
   - Full review list (OK/MISS + stem + correct answer + why) — like current exam finish review
   - Shortcuts: Wrong book, back to MCQs hub, Progress
6. **All resources in one bank:** Runtime uses **only** `window.QUESTION_BANK` (already merges always-comes, أبطال, premium packs, stream, Saud delta). External PDFs/links are study sources; they are not separate parallel banks in the SPA. Quarantined `usable:false` items stay out of tests (image-only / polluted).

### Explicit non-goals (this plan)

- Not rewriting Extra practice / 14-day plan (they stay; MCQs is the dedicated testing hub).
- Not importing the **680p / 438 (2023)** student dump in this feature (still low ROI; bank completeness for *current* sources is already the priority).
- Not inventing official citations that do not exist in data.
- Not building a server/backend.

---

## Current state (facts that drive design)

| Area | Today | Gap vs request |
|------|--------|----------------|
| Nav | 6 tabs (`TAB_VIEWS`) | No **MCQs** tab |
| Full bank by subject | Extra practice volume buttons | Buried under “practice”; always **learn** mode |
| Learn mode | Instant green/red + explanation on pick | Violates “show answer only if user wants” |
| Exam mode | No mid-Q feedback; review only at end | No per-question optional reveal |
| End score | Yes (`finishQuiz`) | Learn mode review list missing; exam has it |
| Bank size | ~2507 usable / 2533 total | Already “thousands”; do not thin |
| Explanations | All items have *some* text; **~1/2507** mention official bodies | Cannot honestly claim “official-only why” without a content pipeline |

**Critical honesty:** Shipping “Show answer → why from official resources only” requires either (A) a gated explanation field, or (B) a multi-day rewrite of ~2500 hinges against SCFHS guide / standard dental textbooks. This plan ships **(A) immediately** and **(B) as phased content tasks** so the UI never lies.

---

## Design decisions (locked)

### D1 — Third quiz mode: `"test"`

| Mode | When pick | Show answer | Score when |
|------|-----------|-------------|------------|
| `learn` | Instant feedback (keep for Today / Extra practice teach loops) | Always | As you go |
| `exam` | Silent, auto-advance | Only in end review | End |
| **`test` (new)** | Lock choice; stay on Q | **Only if user taps Show answer** | End (+ running optional) |

`startQuiz(topic, count, mode, timed, secPer)` gains `mode: "test"`. MCQs hub **only** launches `test` (untimed by default; optional timed later).

### D2 — Category map (single source in app.js)

```js
const MCQ_CATEGORIES = [
  { id: "all", label: "All MCQs", pool: "all" },
  { id: "restorative", label: "Restorative", pool: "restorative" },
  { id: "operative", label: "Operative", pool: "operative" },
  { id: "perio", label: "Perio", pool: "perio" },
  { id: "endo", label: "Endo", pool: "endo" },
  { id: "oms", label: "OMS / Path", pool: "oms" },
  { id: "ortho_pedo", label: "Ortho / Pedo", pool: "ortho_pedo" },
  { id: "ethics", label: "Ethics / Med", pool: "ethics" },
  { id: "mixed", label: "Mixed", pool: "mixed" },
  { id: "fixed", label: "Fixed", pool: "fixed" },
  { id: "implant", label: "Implant", pool: "implant" },
  { id: "rpd", label: "RPD", pool: "rpd" },
  { id: "complete_denture", label: "Complete denture", pool: "complete_denture" },
  { id: "materials", label: "Materials", pool: "materials" },
  { id: "always_src", label: "Free points", pool: "always_src" },
  { id: "saud_delta", label: "Saud delta", pool: "saud_delta" },
  { id: "wrong", label: "Wrong book", pool: "wrong" },
];
```

Reuse existing `pool()` — no re-filter logic.

### D3 — “All MCQs” means full usable pool

- `startQuiz("all", QUIZ_ALL, "test", false)`  
- Same for `startQuiz("perio", QUIZ_ALL, "test", false)`  
- Performance: DOM is **one question at a time** (already). 900+ Q resto test is fine; only memory is `state.quiz.items` array of object refs (OK). Warn once if pool > 300: “This is a long set (~N Q). Progress is saved per answer.”

### D4 — Explanation policy (no fake authority)

Add optional fields on items (back-compat; missing = current behavior gated):

```ts
// Conceptual schema extension
{
  explanation: string,           // existing free text
  explainTier?: "official" | "guideline" | "community" | "unverified",
  explainRefs?: string[],        // e.g. ["SCFHS SDLE Applicant Guide 2025", "AAP staging 2017"]
}
```

**UI rules for Show answer / Why:**

1. Always show **correct option** (objective from bank `answer` index).
2. **Why** text:
   - If `explainTier === "official" | "guideline"` → show explanation + refs.
   - If `community` / missing / `unverified` → show explanation under label **“Study hinge (community / bank — not an official SCFHS citation)”** so we do not claim official status.
3. Never display a fabricated “SCFHS says…” line.

**Content pipeline (phased, after UI works):**

- Priority order for upgrading tiers: Always-comes → Saud delta free-points style → high-frequency resto/perio → rest.
- Allowed reference classes: SCFHS SDLE Applicant Guide / blueprint weights; widely accepted specialty consensus (e.g. 2017 perio staging/grading); standard textbook facts when universally non-controversial (e.g. reprocessing order, nifedipine hyperplasia).  
- **Not** allowed as “official”: pure أبطال/Saud ✅ without hinge verification.

### D5 — Nav / Extra practice relationship

- **MCQs** = serious full-set testing hub (this feature).
- **Extra practice** stays as volume / timed mock launcher (can later deep-link “Open in MCQs”).
- SPA invariant: tab count **6 → 7**.

### D6 — Progress / wrong book

- `record(item, ok)` on each pick in test mode (when they lock an answer), same as learn — wrong book + seenIds update immediately.
- `finishQuiz` for `test` mirrors **exam** end UI (score + full review list), using `qz.answers[]`.

---

## Files to touch

| File | Responsibility |
|------|----------------|
| `index.html` | 7th tab button `data-view="mcqs"` |
| `js/app.js` | `TAB_VIEWS`, `render()`, `renderMcqs()`, `pick`/`renderQuizUI`/`finishQuiz` for `test` mode, category config, labels |
| `css/app.css` | MCQ hub cards, locked option, reveal panel (minimal) |
| `scripts/check_spa_invariants.sh` | Expect 7 tabs; optional bank floor unchanged |
| `data/questions.js` | No mass rewrite in UI PR; optional later `explainTier`/`explainRefs` |
| `scripts/tag_explanation_tiers.py` (new, phase 2) | Heuristic + manual map for tiers |
| `docs/DESIGN-chrome-sync-ui.md` | Reachability note (short) |
| `analysis/bank_stats.json` | Only if content scripts run |

**Do not** split `app.js` unless it becomes unmaintainable mid-task; match existing monolith style.

---

## UX wireframe (text)

```
[ Today | All days | Pass plan | Always-comes | Extra practice | MCQs* | Progress ]

MCQs — full bank tests
Lead: Pick a subject. Full test = every usable MCQ in that pool.
      Answers stay hidden unless you tap Show answer. Score at the end.

┌ All MCQs · 2507 ──────────┐  ┌ Perio · 288 ─────────────┐
│ [ Start full test ]       │  │ [ Start full test ]      │
│ 50 · 100 · 150 (optional) │  │ 50 · 100 · 150           │
└───────────────────────────┘  └──────────────────────────┘
… cards for each category …

── during Q ──
Mock-style card: Perio test · 12 / 288
Stem…
[A] …  [B] …  (user picked B — locked, neutral)
[ Show answer ]   [ Next → ]

── Show answer open ──
Correct: C. …
Why: … (tier badge)
Source tag: abtal | saud_delta | …

── finish ──
76% · 219 / 288 · 2h 10m
Review list…
```

---

### Task 1: Nav + empty MCQs hub shell

**Files:**
- Modify: `sdle-prep/index.html`
- Modify: `sdle-prep/js/app.js` (`TAB_VIEWS`, `render`, new `renderMcqs` stub)
- Modify: `sdle-prep/scripts/check_spa_invariants.sh` (tab count 7)

- [ ] **Step 1:** Add tab in `index.html` after Extra practice (or before Progress):

```html
<button type="button" data-view="mcqs">MCQs</button>
```

- [ ] **Step 2:** Update `TAB_VIEWS` to include `"mcqs"`.

- [ ] **Step 3:** In `render()` switch, add `else if (state.view === "mcqs") renderMcqs();`

- [ ] **Step 4:** Implement `renderMcqs()` minimal: title + lead + `bankInventory` total count (no start yet).

- [ ] **Step 5:** Change invariant `TAB_N -eq 6` → `7` and success message.

- [ ] **Step 6:** Verify: `bash scripts/check_spa_invariants.sh` passes; open `http://localhost:8765`, click **MCQs**, hub appears, other 6 tabs still work.

---

### Task 2: Category cards + full-pool launch (still can use exam/learn temporarily)

**Files:**
- Modify: `js/app.js` — `MCQ_CATEGORIES`, `renderMcqs`, `topicLabelOf`, bind start buttons

- [ ] **Step 1:** Add `MCQ_CATEGORIES` constant (as in D2).

- [ ] **Step 2:** Render a card per category with `poolN(cat.pool)` badge; if 0, disable Start.

- [ ] **Step 3:** Primary button → `startQuiz(cat.pool, QUIZ_ALL, "test", false)` (mode may no-op until Task 3 — temporarily use `"exam"` only if needed for smoke, but prefer implementing Task 3 same session).

- [ ] **Step 4:** Secondary chips 50/100/150 → `startQuiz(cat.pool, n, "test", false)`.

- [ ] **Step 5:** Manual check: Perio full test length equals `poolN("perio")`; All equals `poolN("all")`.

---

### Task 3: Implement `mode: "test"` in quiz engine

**Files:**
- Modify: `js/app.js` — `startQuiz` label, `renderQuizUI`, `pick`, `finishQuiz`, `leaveQuizOrCards`, keyboard handler

- [ ] **Step 1:** Label: `Test · ${topicLabel} · ${n}Q`.

- [ ] **Step 2:** `pick(idx)` for `mode === "test"`:
  - Ignore if already locked (`qz.answers[qz.i] != null`)
  - Store `qz.answers[qz.i] = idx`
  - Disable all options; mark chosen with class `option-picked` (not correct/wrong)
  - Show `#btn-next` and `#btn-show-ans`
  - Do **not** call `record` yet **or** call `record` only once when locking (prefer record on lock so wrong book updates if they quit early — document choice: **record on lock**)

- [ ] **Step 3:** `Show answer` handler:
  - Add classes correct/wrong like learn
  - Fill `#feedback` with correct option + why via `formatWhy(item)` helper (Task 4)
  - Hide/disable show button after open; set `qz.revealed[i] = true`

- [ ] **Step 4:** Next advances `qz.i++` → `renderQuizUI`. Do not auto-advance on pick.

- [ ] **Step 5:** Keyboard: A–D only if not locked; Enter/N next when locked; `R` optional for reveal.

- [ ] **Step 6:** `finishQuiz` for `test`:
  - Score from `answers[]` vs `item.answer` (if not already fully recorded, ensure double-record safe — if recorded on lock, use `learnOk`-style counters OR recompute from answers without double-incrementing stats)
  - **Preferred scoring:** record once on lock; finish uses same counters as learn (`learnOk`/`learnN`) **or** recompute pct from answers without calling `record` again
  - End UI: same review list as exam mode (`OK/MISS` + explanation)
  - Back button → `state.view = "mcqs"` (not today)

- [ ] **Step 7:** Mid-quit via nav: if `mode === "test"` and any answers, `logSession` partial like learn.

- [ ] **Step 8:** Manual: 5-Q perio mini (temporary count) — pick without reveal → next; pick + reveal → next; finish score matches.

---

### Task 4: `formatWhy(item)` + honest tier display

**Files:**
- Modify: `js/app.js` only for UI helper

- [ ] **Step 1:** Implement:

```js
function formatWhy(item) {
  const tier = item.explainTier || "unverified";
  const body = item.explanation || "No hinge text stored for this item.";
  const refs = Array.isArray(item.explainRefs) ? item.explainRefs : [];
  const official = tier === "official" || tier === "guideline";
  const badge = official
    ? `<span class="tier-badge tier-ok">Guideline / official-style</span>`
    : `<span class="tier-badge tier-comm">Study hinge — not an official SCFHS citation</span>`;
  const refHtml = refs.length
    ? `<div class="src-line">Refs: ${refs.map(escapeHtml).join(" · ")}</div>`
    : "";
  return `${badge}<div class="explain"><strong>Why:</strong> ${escapeHtml(body)}</div>${refHtml}
    <div class="src-line muted">Bank source: ${escapeHtml(item.source || "?")}</div>`;
}
```

- [ ] **Step 2:** Use in Show answer + finish review for `test` mode.

- [ ] **Step 3:** CSS for `.tier-badge`, `.option-picked`.

---

### Task 5: Polish hub + long-set warning + Progress labels

**Files:**
- Modify: `js/app.js`, `css/app.css`

- [ ] **Step 1:** Before `startQuiz` when `n > 300`, `confirm("Full test: N questions. Continue?")`.

- [ ] **Step 2:** Session log label includes `Test · Perio · 288Q` so Progress is readable.

- [ ] **Step 3:** Hub shows inventory table row for each main category.

- [ ] **Step 4:** Optional link from Extra practice: “Prefer full subject tests? Open MCQs tab.”

---

### Task 6: Verification gate (no thinning)

**Files:**
- Create: `scripts/check_mcq_hub.sh` (or extend SPA script)

- [ ] **Step 1:** Assert `pool` sizes: sum of exclusive topics ≈ usable (allow overlap only for subtopics).

- [ ] **Step 2:** Assert `saud_delta` + `always` + `abtal` + premiums still present in `questions.js` (source counts > 0).

- [ ] **Step 3:** Assert no filter in MCQs hub uses artificial caps (no `slice(0, 50)` on full test path).

- [ ] **Step 4:** Run `bash scripts/check_spa_invariants.sh`.

- [ ] **Step 5:** Browser smoke: MCQs → Perio full (user may cancel long confirm after checking N) → All shows ~2507.

---

### Task 7 (Phase 2 content — after UI ships): Explanation tier pipeline

**Files:**
- Create: `scripts/tag_explanation_tiers.py`
- Modify: `data/questions.js` (or layered `data/generated/explain_tiers.json` merged at runtime)

- [ ] **Step 1:** Auto-tag: if explanation empty → `unverified`; if matches always-comes rules → `guideline` + ref SCFHS/community free-point; if contains only “From تلخيص سعود…” → `community`.

- [ ] **Step 2:** Manually upgrade top **100** free-point / always-comes items with `explainTier: "guideline"` and real refs (SCFHS guide, standard IC order, drug hyperplasia triad, etc.).

- [ ] **Step 3:** Document in `data/raw/SOURCE_WORKFLOW.md`: how to promote a hinge to guideline tier.

- [ ] **Step 4:** Do **not** mark أبطال stems as `official` without independent verification.

---

### Task 8 (Optional later): More bank intake

Only if user still wants “every resource” beyond current bank:

| Source | Action |
|--------|--------|
| Mar–June / Dec–Feb / Sep / Oct أبطال | Already primary bank (`abtal`) |
| Saud delta | Already `saud_delta` |
| Stream Google Doc | Already `stream_*` |
| Rafi 16/19 full PDFs | Not fully in bank — separate import project |
| 680p 438 | **Defer** (2023 noise) |

This feature plan **does not block** on Rafi/438 import.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| User believes all “Why” text is SCFHS official | Tier badges + never invent citations |
| 900Q resto session crash / fatigue | One-Q DOM; confirm dialog; optional N chips |
| Double-count stats on finish | Record-once-on-lock; finish recomputes display only |
| Nav overcrowding on mobile | CSS wrap already on `.simple-nav`; short label `MCQs` |
| SPA invariant / Playwright break | Bump tab count; update smoke lists |
| Confusing vs Extra practice | Clear lead copy: MCQs = full subject tests |

---

## Implementation order (summary)

1. Nav shell + invariant (Task 1)  
2. Category cards + full pool counts (Task 2)  
3. `test` mode engine + show answer (Task 3)  
4. Why formatter + CSS (Task 4)  
5. Polish + long-set warn (Task 5)  
6. Automated gates (Task 6)  
7. Content tier pipeline (Task 7 — can start after 1–6 usable)  

---

## Spec coverage checklist

| Requirement | Task |
|-------------|------|
| Extra tab MCQs | 1 |
| Categorize by type + All | 2 |
| Treat as normal test | 3 |
| Hide answer unless user asks | 3 |
| Show answer + why | 3–4 |
| Official-only why (honest) | 4 + 7 |
| Perio lists all perio / score at end | 2–3 |
| Same for all categories + All | 2–3 |
| All MCQs from all in-app resources | 2 + 6 (no thin) + note on links/PDFs |
| Plan first / no premature impl | This document |

---

## Self-review

- No TBD placeholders for engine behavior; content phase is explicit Phase 2.  
- `test` mode naming consistent across tasks.  
- `pool` / `QUIZ_ALL` / `TAB_VIEWS` match codebase.  
- Official-citation constraint handled without blocking UI ship.

---

## Execution handoff

**Plan complete** (this file). When you approve implementation:

1. **Subagent-driven** — one task per subagent + review between tasks  
2. **Inline** — implement Tasks 1–6 in this session with checkpoints  

**Not started:** no product code changes beyond this plan document until you say go.
