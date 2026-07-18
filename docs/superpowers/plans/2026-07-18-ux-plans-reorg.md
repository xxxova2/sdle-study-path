# SDLE Prep — Multi-track plans + study UX reorg

**Date:** 2026-07-18  
**Constraint:** Reorganize only — do not delete practice packs, pools, or existing 14/30 behavior.

## Goals (user)

1. **Calendar tracks:** 14, 30, **45**, **60 (2 mo)**, **90 (3 mo)** — same 14 LESSONS, different pacing.
2. **Exam focus:** Restorative + Perio + Prosthesis (fixed/RPD/CD) first; visual “Note this” callouts for notebook.
3. **Show answer:** Label is only **Show answer** (already true in quiz; keep simple elsewhere).
4. **Pass plan:** Cooler, template-style, simple organization (tracks as templates; ROI up top; rest folded/sections).
5. **Always-comes:** Deeper than ~55 rules — short notes + MCQ form-switch teaching + full free-point pool.
6. **Extra practice:** Same buttons, clearer sections (start here → score-makers → subjects → timed → full inventory).
7. **MCQ why:** Short hinge + “Review from official study data / bank letter” — no long extract source walls.
8. **Critical:** After pick + why, **Next** stays visible (sticky actions) — no scroll to continue.
9. **Width:** Use more of wide screens (`path-main` ~820 → ~1180; quiz readable).

## Non-goals

- No bank deletion; no removing Extra practice sets.
- No fake SCFHS page keys.
- No Playwright requirement for this pass.

## Implementation map

| Area | File | Change |
|------|------|--------|
| Tracks | `data/plan_tracks.js` | TRACK_45/60/90 builders; `getTrack` / `maxPlanDay` multi-length |
| State | `js/app.js` | `planLength` allow 14\|30\|45\|60\|90; switcher; clamp |
| Pass | `js/app.js` `renderPass` | Template cards + phases; volume still present below |
| Always | `js/app.js` `renderAlways` | Form-switch notes + rules + MCQ CTAs |
| Practice | `js/app.js` `renderPractice` | Sectioned layout (all volBlocks kept) |
| Why | `formatWhy` | Compact copy |
| Quiz | `renderQuizUI` | Sticky `quiz-actions` bar + dual next |
| CSS | `css/app.css` | Wider main, note-this, sticky quiz, pass templates |
| Gates | `scripts/check_plan_tracks.sh` | Assert new lengths |
| Footer | `index.html` | Mention multi-track |

## Verify

```bash
bash scripts/check_plan_tracks.sh
bash scripts/check_spa_invariants.sh
node -e '/* track lengths 14,30,45,60,90 */'
```

## Success criteria

- Switcher shows 5 tracks; calendar day maps to valid lessonDay 1–14.
- Pass tab shows templates first, not a button wall.
- Always tab has short notes + form-switch + drills (rules list remains).
- Practice has labeled sections; every previous pack still available.
- Quiz Next visible without scrolling after reveal.
- Why text short and plain.
