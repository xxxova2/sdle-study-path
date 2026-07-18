# Student review → enhancement loop (2026-07-18)

Review stance: **first-time SDLE candidate**, 14 or 30 days out, ADHD-ish attention, wants ≥80% practice accuracy without fake official answer keys.

## What felt strong

- Full-day lessons L1–L9 are deep (45–79k chars) with multi-block quizzes.
- Usable bank ~2507; MCQs tab full-pool tests; Show answer + honest tier badges.
- 14 vs 30 track mapping exists; SCFHS Appendix C titles under readings / why.
- Wrong book, weak pack, unseen packs, pass gates on day complete.

## Dead / confusing areas (before fix)

| # | Student pain | Root | Fix shipped |
|---|--------------|------|-------------|
| 1 | “Day 1: Operative” on calendar day 8 of 30 | Header used `L.day` not calendar | **Calendar Day X/Y** + L# content badge |
| 2 | Volume day still opens Read 45k first | Step order always read→… | **Mode-aware step order** + open prefer quiz/mock/always |
| 3 | “What do I do right now?” unclear | No coach | **mode-coach** playbook per learn/volume/review/mock/light |
| 4 | Am I ready for exam? | Progress stats only | **Pass readiness gates** (volume, ≥80%, wrong book, days, weak) |
| 5 | Thin MCQ why (“Classic triad”) | 557 short explanations | **Bank enrich** + runtime `enrichExplanation` + logic check |
| 6 | Banner “6 tabs” with 7 | Stale copy | **7 plan tabs** guide |
| 7 | Mock days feel empty | L10–14 short by design | **Mock playbook** under reading + theme list |
| 8 | Daily goal fights track | Stored 150 vs track 80 | Boot sync from track unless user override |

## Honest limits (still true)

- No SCFHS official answer key / page numbers invented.
- ≥80% is **practice** readiness, not a pass guarantee.
- Videos remain path-copy (disk files), not in-browser stream.
- L10–14 are protocol days, not second textbooks.
- Drive mega-PDF chapter search still optional phase 2.

## Verify

```bash
bash scripts/check_spa_invariants.sh
bash scripts/check_plan_tracks.sh
bash scripts/check_mcq_hub.sh
# hard-refresh http://127.0.0.1:8765
```

## Shipped next push (same day)

1. **Google Drive video links** — `data/video_links.js` from public prometric folder crawl (52/52 file IDs). Today Step 2: **Open on Drive** + folder + local path.
2. **Weak-topic panel on REVIEW days** — auto-ranked weak/cold topics + one-tap Wrong/Weak packs.
3. **Local book keyword index** — `data/book_index.js` (13 PDFs, 75 keywords, page hits via pdftotext) under MCQ Why + readings.
4. Playwright tab count 6→7 in review scripts — still optional if playwright not installed.
