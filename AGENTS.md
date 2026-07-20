# Agent instructions — SDLE Study Path

You are working on **SDLE Study Path**: a static SPA that coaches KSA dentists for the **SDLE** (SCFHS / Prometric-style). Not official exam software.

## Read first

**Full architecture map:** [`docs/AGENT_APP_MAP.md`](./docs/AGENT_APP_MAP.md)

That file is the source of truth for agents: stack, globals, plan tracks, MCQ schema, sources, deploy, pitfalls.

## RED LINE — NO SLACKING (read first)

**File:** [`docs/RED_LINE_NO_SLACK.md`](./docs/RED_LINE_NO_SLACK.md)  
**Gate:** `python3 scripts/gate_no_slack.py` → must exit **0** before any “done / all / finished / I read them all” claim.

| Ban | Rule |
|-----|------|
| Fake done | No “all MCQs checked” unless **G-READ + G-TRUTH + G-DUP + G-HINGE + G-LESSON** green |
| Fake read | “Read” = every usable ID has audit artifact + hinge ≥40 + `truth_pass` (or quarantined) |
| Quiet stop | Gate red → keep working or write `BLOCKED:` with IDs — never vibes |
| Invented skips | User-ordered phases are not optional |
| Fake official | Never claim SCFHS answer keys without a key file on disk |

## Non-negotiables

1. **Working tree:** Prefer `/data/prometric/sdle-prep` (pushes to `xxxova2/sdle-study-path`). Sibling `sdle-study-path/` may be stale.
2. **Stack:** Vanilla HTML/CSS/JS only. No React/Next unless the user explicitly asks.
3. **MCQ truth:** Community أبطال ✅ marks are **often wrong**. Prefer clinical/board-standard answers + real hinges. Never reintroduce “Extracted from أبطال… Community bank…” placeholder Why text.
4. **Surgical changes:** Touch only what the task needs. Don’t reformat all of `app.js` or invent features.
5. **Cache bust:** After shipping content/JS/CSS, bump `?v=` in `index.html` (and SW `CACHE` if shell is sticky).
6. **Secrets:** Stay out of git; feedback endpoints live in `data/feedback_config.js` (public-ish only).
7. **No-slack gate:** Run `scripts/gate_no_slack.py` before claiming bank/lesson work complete.

## Common tasks → files

| Task | Where |
|------|--------|
| Fix MCQ answer/explanation | `data/questions.js` or `scripts/apply_mcq_fixes.py` + `data/generated/mcq_fix/out_*.json` |
| Day lesson / reading | `data/lessons.js` |
| Plan length / day map | `data/plan_tracks.js` |
| UI / tabs / quiz player | `js/app.js` |
| Styles | `css/app.css` |
| Deploy | `git push origin main` · live https://xxxova2.github.io/sdle-study-path/ |

## Local verify

```bash
python3 -m http.server 8765
# Bank load check — see docs/AGENT_APP_MAP.md
bash scripts/check_spa_invariants.sh   # if present
```

## Product intent (don’t break)

- **Plan-first** path (14/30/45/60/90), default new install **30**.
- **Simple mode** default: Today · Practice · Progress · More.
- **Endo is separate** from restorative in navigation and days.
- Offline-friendly bank in-browser; videos = **Drive links**, not binaries in repo.
- Progress in **`localStorage` `sdle3_*`** only.

## Human docs

- `README.md` — student/dev entry  
- `INTRO.md`, `docs/INTRO_POST_EN_AR.md` — welcome letter  
- `data/raw/SOURCE_WORKFLOW.md` — PDF/Drive/source pipeline  
