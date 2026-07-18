# Pass-80 tracks + book-backed MCQ/refs Implementation Plan

> **For agentic workers:** Execute task-by-task. Checkboxes track progress.

**Goal:** Time-efficient SDLE path (≥80% practice target) with user-chosen **14 or 30 days**, SCFHS Appendix C–backed “why” refs on MCQs, and readings synced to the same topic→book map — without inventing page-level SCFHS citations.

**Architecture:** Keep the proven **14 deep LESSONS** (ADHD textbooks). Add **plan tracks** that map calendar days → lesson content days. Inject **SCFHS suggested textbook titles** at runtime into `formatWhy` and lesson footers from one JSON-derived JS module. Partial local SDLE Book PDFs remain offline study assets; app never claims fake page numbers.

**Tech Stack:** Vanilla SPA (`index.html` + `js/app.js` + data JS), localStorage, existing bank.

---

## Principles (logic)

1. **+80% is practice accuracy + blueprint volume**, not more PDFs. Free points → restorative mass → wrong book → timed 200.
2. **14 vs 30:** same content depth; 30-day = lower daily volume + more spaced review/mocks. Lessons stay 14 full texts.
3. **Truth in citations:** Appendix C = *suggested study refs* (SCFHS disclaimer on sheet). Hinge text stays bank/community unless `explainTier` is official/guideline.
4. **Single source of truth for topic→books:** `data/scfhs_refs.js` used by MCQs + readings + pass page.
5. **No bulk 1017-book download** in-app; curated titles only.

---

## File map

| File | Role |
|------|------|
| `data/scfhs_refs.js` | Appendix C + `scfhsRefsForTopic(topic)` |
| `data/plan_tracks.js` | `PLAN_TRACKS` 14/30, helpers |
| `js/app.js` | `planLength`, maxDay, lesson map, formatWhy, UI |
| `index.html` | Load new scripts before app.js |
| `scripts/check_plan_tracks.sh` | Gates |
| `data/raw/books/**` | Offline books (already partial) |

---

### Task 1: SCFHS refs module

- [x] Create `data/scfhs_refs.js` from Appendix C image inventory
- [x] Export topic aliases → short citation strings

### Task 2: Plan tracks 14/30

- [x] Create `data/plan_tracks.js` with day meta, goals, lessonDay, dailyGoal
- [x] 30-day = spaced content + mock/weak/light days

### Task 3: App wiring

- [x] state.planLength, maxPlanDay(), planDayMeta(), lesson() via lessonDay
- [x] Day picker + All days + top bar use maxPlanDay
- [x] Track switcher on Today / All days / Pass / Progress
- [x] formatWhy appends SCFHS suggested refs by topic
- [x] Reading footer: same refs + pass-80 micro-protocol

### Task 4: Verify

- [x] SPA load order + usable bank floor + `scripts/check_plan_tracks.sh`
- [x] Manual logic: day 15 on 30-track maps to OMS lesson

### Out of scope this pass (honest)

- Full OCR of 1017 Drive textbooks into every MCQ explanation
- Guaranteeing real SCFHS exam pass (we target **practice ≥80%** + efficient path)
- Auto-download remaining virus-scanned large PDFs without browser cookies
