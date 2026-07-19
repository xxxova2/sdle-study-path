# SDLE Study Path — agent map

**Purpose of this file:** Give another AI (or human) enough architecture + operational truth to edit the app without rediscovering the repo.

| | |
|--|--|
| **Product** | Free browser SPA for **KSA SDLE** (Saudi Dental Licensure Exam / SCFHS Prometric-style) |
| **Live** | https://xxxova2.github.io/sdle-study-path/ |
| **GitHub** | https://github.com/xxxova2/sdle-study-path |
| **Working tree (this machine)** | `/data/prometric/sdle-prep` (canonical for recent work) |
| **Sibling folder** | `/data/prometric/sdle-study-path` may lag — **edit and push from `sdle-prep`** unless told otherwise |
| **Stack** | Static HTML/CSS/JS only — **no build step, no framework, no backend** |
| **Not** | Official SCFHS software; not a paid Qbank API |

---

## 30-second mental model

1. `index.html` loads data scripts → then `js/app.js`.
2. `app.js` is a single IIFE: **views**, **localStorage state**, **MCQ runner**, **plan/day path**.
3. Content lives in `data/*.js` as `window.*` globals (not ES modules).
4. Progress is **client-only** (`localStorage` keys `sdle3_*`).
5. GitHub Pages serves the **repo root** (same files as local). Optional `dist/` via `scripts/pack_deploy.sh`.

```
index.html
  ├── css/app.css
  ├── data/highyield.js, scfhs_refs.js, plan_tracks.js, video_links.js,
  │         book_index.js, lessons.js, questions.js, feedback_config.js
  ├── js/app.js          ← almost all UI logic
  ├── sw.js              ← PWA shell cache
  └── manifest.webmanifest
```

---

## Runtime globals (must stay script-tag compatible)

| File | Global | Role |
|------|--------|------|
| `data/questions.js` | `window.QUESTION_BANK` | Full MCQ array (~2533) |
| `data/lessons.js` | `window.LESSONS` | Day lessons (readings, quizzes, cards, video ids) |
| `data/plan_tracks.js` | `window.PLAN_TRACKS`, helpers | Schedules for plan lengths 14/30/45/60/90 |
| `data/highyield.js` | high-yield meta / bank mining notes | Blueprint emphasis, source notes |
| `data/video_links.js` | Drive video URL map | No video binaries in repo |
| `data/book_index.js` | Local PDF keyword index | Study aid links only |
| `data/scfhs_refs.js` | SCFHS-ish reference snippets | Shown on explanations when not placeholder |
| `data/feedback_config.js` | ntfy / FormSubmit endpoints | Feedback form (no login) |

**Pattern for every data file:**

```js
(function (w) {
  w.SOMETHING = ...;
})(typeof window !== "undefined" ? window : globalThis);
```

Do **not** convert to `import`/`export` without changing `index.html` and deploy.

---

## UI modes and navigation

### Simple mode (default)

`localStorage` `sdle3_simpleMode` defaults **true**.

Bottom/top nav: **Today · Practice · Progress · More**

| Tab | What student sees |
|-----|-------------------|
| **Today** | Current plan day: read → videos → cards → quiz; plan chooser if not picked |
| **Practice** | Extra MCQs by topic / volume builder |
| **Progress** | Scores, wrong book, history, readiness |
| **More** | Days list, Pass pack, Always, full MCQ hub, Feedback, switch to Coach |

### Coach mode

`simpleMode === false` — fuller original tab set (Days, Pass, Always, Extra, MCQs, Feedback, etc.). Same content, more entry points.

### Navigation stack

- `navigateTo(view, { push, replace })`, `goBack()`, `viewStack` in store.
- Views include: `today`, `practice`, `progress`, `more`, `days`, `mcqs`, `pass`, `always`, `cards`, …

Main chrome: `#main-nav` filled by `paintMainNav()`. Content: `#app`.

---

## Plan system

- Plan lengths: **14, 30, 45, 60, 90** days (`planLength` in store).
- Default for **new** installs: **30** (existing users keep saved length).
- `data/plan_tracks.js` maps calendar day → `lessonDay`, mode (`learn` / review / etc.), daily Q goal, phase labels.
- `lessonDay` indexes into `LESSONS` (content day), not always equal to plan day on long tracks.
- Related store keys: `planChosen`, `planPickedExplicit`, `day`, `dayDone`, `stepsDone`, `planDayAnswered`, `dailyGoal`, …

**Do not hardcode “always 14 days.”** Multi-track is intentional.

---

## MCQ bank (`data/questions.js`)

### Schema (typical item)

```js
{
  id: "ab2_…",           // stable string id
  topic: "restorative",  // ethics | endo | oms | ortho_pedo | restorative | perio | mixed
  difficulty: "exam",    // easy | medium | hard | exam | …
  q: "Stem text…",
  options: ["A","B","C","D"],  // length 4
  answer: 0,             // 0-based index
  explanation: "Clinical hinge…",
  source: "abtal",       // provenance
  subtopics: [],
  usable: true           // optional; false = quarantine (image-only / broken)
}
```

### Approximate composition (~2533 total)

| ID prefix / source | ~Count | Meaning |
|--------------------|-------:|---------|
| `hy*` / always | 40–100 | High-yield / “always comes” style |
| `ab*` / **abtal** | **~1181** | Community أبطال PDF extracts (largest slice) |
| `op*` premium_operative | 375 | Generated premium restorative |
| `per*` premium_perio | 150 | Premium perio |
| `end*` premium_endo | 150 | Premium endo |
| `oped*` premium_ortho_pedo | 120 | Ortho + pedo |
| `eth*` premium_ethics | 50 | Ethics / IC / LA |
| `fr*` premium_fixed_rpd | 100 | Fixed / RPD |
| `stream*` stream_july2026 | ~77 | Google Doc live stream |
| `saud*` saud_delta | 226 | رفيع / Saud delta recalls |
| `pass*` | 60 | Pass pack |
| `gd*` | 4 | GDoc odds |

**Topics:** restorative heaviest (~900), then oms, endo, perio, ortho_pedo, ethics, mixed.

### Critical policy: community keys are not ground truth

- أبطال PDFs use ✅ marks; **OCR and community answers are often wrong**.
- App explanations must be **clinical/board-standard hinges**, not “Extracted from أبطال…”.
- July 2026 pass: bulk rewrite of ~**1305** placeholder explanations; **~457** answer indices flipped vs old community keys; **0** junk placeholders remaining at that pass.
- ~**32** items may be `usable: false` (image-dependent).
- The other ~**1200** items already had unique explanations (premium/saud/hy) and were **not** all re-audited in that pass.

### Explanation UI helpers (`js/app.js`)

- `isPlaceholderExplanation(text)` — detects abtal junk / too-short Why.
- `formatWhy` / explanation rendering — **suppresses wrong textbook footers** on placeholders; real hinges can show SCFHS/book refs.

### How to fix MCQs safely

1. Prefer fix by **stable `id`**, not by stem text alone (duplicates exist).
2. Set `answer` to **0–3** matching **current** `options` order (options may have been shuffled historically).
3. Write a real `explanation` (≥ ~50–80 chars, clinical hinge).
4. Pipeline helpers:
   - `scripts/auto_clinical_hinges.py` — rule-based attempts
   - `scripts/apply_mcq_fixes.py` — merge `data/generated/mcq_fix/out_*.json` → `questions.js`
   - `scripts/fix_bank_quality.py` — older structural bank fixes
5. After large bank edits: bump **`?v=`** on scripts in `index.html` and often bump `CACHE` in `sw.js`.

```bash
# Apply out_*.json fixes
python3 scripts/apply_mcq_fixes.py
# Validate load
node -e "const fs=require('fs');const vm=require('vm');const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('data/questions.js','utf8'),c);console.log(c.QUESTION_BANK.length);"
```

### Source PDFs / extracts (local, often gitignored or huge)

Under `/data/prometric/` and `data/raw/`:

- أبطال PDFs: Sep 2025, Oct 2025, DEC 2025–FEB 2026, Mar–June 2026  
- Text extracts: `data/raw/*.txt`, `google_doc_stream_abtal.txt`, `saud_delta.txt`  
- Curated textbooks: `data/raw/books/sdle_book/` (McCracken, OM path, Malamed, perio, ortho, pedo, …)  
- **Sturdevant** may be referenced in UI copy but Resto folder can be empty on disk — don’t invent page numbers.

Workflow detail: `data/raw/SOURCE_WORKFLOW.md`, `SOURCE_REGISTRY.json`.

---

## Lessons (`data/lessons.js`)

- Large file (~7k lines): array of day objects.
- Each lesson typically has: title, reading HTML/blocks, quiz sets, flashcard decks, video references, exam Q&A hooks.
- **Endodontics is its own track** (e.g. day ~6), **not** buried only under restorative.
- Days 1–4 emphasis restorative; day 5 perio — confirm in `plan_tracks` + lessons before rewriting plans.
- Expanding a day: skill `/sdle-day` or project skill under `.grok/skills/sdle-day` if present; run video/lesson audits after.

---

## Videos

- **No lecture files in git.** Links point at **Google Drive**.
- Catalog: `data/generated/video_catalog.json` (built by `scripts/build_video_catalog.py`).
- Runtime map: `data/video_links.js`.
- Local tree may mirror Drive under `/data/prometric/prometric/` (large).
- Gates: `scripts/audit_videos.py`, `scripts/audit_sources.py`.

---

## State / persistence

Prefix: **`sdle3_`** + key via thin `store.get` / `store.set` wrappers.

Important keys:

| Key | Role |
|-----|------|
| `simpleMode` | Simple vs Coach UI |
| `planLength` | 14–90 |
| `planChosen` / `planPickedExplicit` | Onboarding |
| `day` | Current plan day |
| `dayDone` / `stepsDone` | Checklists |
| `stats` | Per-question / aggregate scoring |
| `wrongBook` | Missed items |
| `seenIds` | Exposure |
| `history` | Session log |
| `cardKnown` | Flashcards |
| `pomo*` | Focus timer |
| `feedbackDraft` / `feedbackSentLog` | Feedback form |
| `viewStack` | Back navigation |

Quota / private mode failures: warn via `showStorageWarn()` — don’t assume writes always succeed.

---

## PWA

- `manifest.webmanifest` + `sw.js` (`CACHE` e.g. `sdle-shell-v3`).
- SW caches shell; **data scripts use `?v=` cache bust** in `index.html`.
- After content deploys: bump `?v=YYYYMMDDx` on CSS/JS data tags; bump SW cache name if shell stuck.

---

## Feedback

- In-app Feedback tab → ntfy and/or FormSubmit (`data/feedback_config.js`).
- No student accounts. Don’t commit secrets; config may hold public topic names.

---

## SDLEGPT integration (Phase 0)

- External ChatGPT custom GPT: `https://chatgpt.com/g/g-ytJW9hxum-sdlegpt`
- App copies study context + opens link (`buildSdleGptContext`, `data-sdlegpt` buttons).
- **Not** embedded; no API key in browser for that GPT.

---

## Deploy / local run

```bash
# Local
cd /data/prometric/sdle-prep
python3 -m http.server 8765
# open http://localhost:8765  — hard refresh after changes

# Optional static package (no raw PDFs)
bash scripts/pack_deploy.sh   # → dist/

# Ship to Pages (this repo remote)
git add -A && git commit -m "…" && git push origin main
# remote: https://github.com/xxxova2/sdle-study-path.git
```

**Cache bust checklist:** `index.html` `?v=`, `sw.js` `CACHE`, verify live hard-reload.

---

## Scripts agents use most

| Script | Use |
|--------|-----|
| `scripts/apply_mcq_fixes.py` | Merge clinical fix JSON into bank |
| `scripts/auto_clinical_hinges.py` | Rule-based hinge attempts |
| `scripts/fix_bank_quality.py` | Structural bank repairs / shuffles |
| `scripts/import_stream_mcqs.py` | Stream Doc → bank |
| `scripts/import_saud_delta.py` | Saud delta import |
| `scripts/merge_generated.py` | Merge premium JSON packs |
| `scripts/audit_sources.py` | Source gate |
| `scripts/audit_videos.py` | Video path gate |
| `scripts/audit_lesson_depth.py` | Thin lesson detector |
| `scripts/check_spa_invariants.sh` | SPA sanity |
| `scripts/check_mcq_hub.sh` | MCQ hub checks |
| `scripts/check_plan_tracks.sh` | Plan track integrity |
| `scripts/pack_deploy.sh` | Build `dist/` |
| `scripts/playwright_app_review.*` | UI smoke (if deps present) |

Generated intermediates: `data/generated/` (premium JSON, day readings, mcq_fix outs, reports).

---

## Coding conventions (for agents)

1. **Surgical diffs** — don’t reformat 5k-line `app.js` or re-pretty-print entire `questions.js` unless necessary (file is one giant JSON array; tools rewrite whole bank).
2. **Match existing style** — vanilla JS, template strings for HTML, CSS classes already in `app.css`.
3. **No new framework** without explicit user ask.
4. **No secrets** in repo; no exploit code.
5. **Community bank ≠ correct** — when fixing MCQs, prefer textbooks/guidelines/clinical standard; note uncertainty in explanation if needed.
6. **Image-only stems** — set `usable: false` + `exclude_reason`; don’t invent answers from missing pictures.
7. **Endo ≠ restorative** in navigation/copy.
8. **Karpathy-style simplicity** — minimum code that solves the ask; no speculative features.

---

## Related paths outside the SPA

| Path | Role |
|------|------|
| `/data/prometric/*.pdf` | أبطال source PDFs |
| `/data/prometric/prometric/` | Local lecture tree (if present) |
| `/data/prometric/STUDY_PLAN_14_DAYS.md` | Legacy plan notes |
| `/data/prometric/.grok/skills/sdle-day/` | Skill to expand a study day |
| `docs/UX_FRIENDLY_REDESIGN_PLAN.md` | UX redesign notes |
| `docs/INTRO_POST_EN_AR.md` | Student-facing intro EN/AR |
| `INTRO.md` / `README.md` | Human onboarding |

---

## Quick “where do I edit X?”

| Want to… | Edit |
|----------|------|
| MCQ stem/answer/Why | `data/questions.js` (or fix JSON + `apply_mcq_fixes.py`) |
| Day reading / in-app lesson | `data/lessons.js` |
| Plan day mapping / goals | `data/plan_tracks.js` |
| Tab UX / MCQ player / storage | `js/app.js` |
| Look & feel | `css/app.css` |
| Script load order / cache bust | `index.html` |
| PWA cache name | `sw.js` |
| Drive video URLs | `data/video_links.js` (+ catalog scripts) |
| Feedback endpoints | `data/feedback_config.js` |
| Student-facing intro | `INTRO.md`, `docs/INTRO_POST_EN_AR.md`, `README.md` |

---

## Verification snippets

```bash
# Bank loads + quality snapshot
node <<'NODE'
const fs=require('fs');const vm=require('vm');
const c={};vm.createContext(c);
vm.runInContext(fs.readFileSync('data/questions.js','utf8'),c);
const b=c.QUESTION_BANK;
const junk=b.filter(q=>/Community bank|Extracted from|أبطال/i.test(q.explanation||'')).length;
const badAns=b.filter(q=>q.answer<0||q.answer>3||!q.options||q.options.length!==4).length;
console.log({n:b.length,junkExplanations:junk,badStructure:badAns,unusable:b.filter(q=>q.usable===false).length});
NODE

# SPA invariants (if maintained)
bash scripts/check_spa_invariants.sh
bash scripts/check_plan_tracks.sh
```

---

## Known pitfalls

1. **`questions.js` size** (~1.2MB+) — don’t open-edit by hand for bulk; use scripts.
2. **Apply-script wrapper** must end with  
   `})(typeof window !== 'undefined' ? window : globalThis);`  
   not bare `})(window);`.
3. **Two folders** (`sdle-prep` vs `sdle-study-path`) — confirm which remote `git push` updates Pages.
4. **Service worker** can show stale bank after deploy — bump cache + hard reload.
5. **Answer index vs letter** — always 0-based; shuffling history means “answer B” in a PDF may not be index 1 in app.
6. **Placeholder Why** used to look identical on hundreds of items — if user reports “all MCQs the same,” check explanations for abtal boilerplate and `?v=` bust.

---

## One-line mission

Help a KSA dentist finish a **plan-first, phone-friendly** path: **read → watch listed Drive videos → cards/MCQs**, with a large offline-capable bank, honest uncertainty on community items, and **zero login**.
