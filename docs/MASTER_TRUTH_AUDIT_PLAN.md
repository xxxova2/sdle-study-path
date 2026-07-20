# MASTER PLAN — Bank truth · Official books · Lessons by department

**Status:** ACTIVE — 2026-07-20  
**Owner agent:** Grok (orchestrator) + `command-code -m deepseek/deepseek-v4-pro` (clinical worker)  
**App root:** `/data/prometric/sdle-prep`  
**User mandate:** No slacking, no caps, max depth, tokens OK.  
**RED LINE:** [`docs/RED_LINE_NO_SLACK.md`](./RED_LINE_NO_SLACK.md) — `python3 scripts/gate_no_slack.py` must exit 0 before any “done” claim.

---

## 0) Honest definition of “official”

| Layer | What it is | What it is NOT |
|-------|------------|----------------|
| **SCFHS Appendix C** (`References.jpg` → `SCFHS_APPENDIX_C_REFERENCES.json`) | Official **suggested textbook list** for SDLE | Not page-level answer keys |
| **SDLE Book folder on Drive** | Curated PDFs matching Appendix C titles | Not “exam questions extracted from books” |
| **أبطال / رفيع / سعود / stream** | High-yield **recall banks** (community ✅ often wrong) | Not SCFHS official keys |
| **Clinical board standard** (DeepSeek + textbook extracts) | Best available truth for study app | Not a substitute for SCFHS |

**Never claim “official SCFHS answers.”**  
**Always claim:** “clinically audited against board standards + textbook corpus where available.”

---

## 1) Critical rules (anti-slack / anti-slop)

### R1 — No silent caps
If a source has N items, reports show N. Pagination OK. Hidden totals = FAIL.

### R2 — No “done” without a gate
Every phase ends with a measurable check (counts, paths, sample IDs). No vibes.

### R3 — Community ✅ ≠ truth
أبطال / رفيع / سعود marks are **provisional**. Flips need clinical hinge ≥40 chars.

### R4 — Provenance forever
Keep `source`, `sourcePack`, `sourcePage` when known. Prefer granular `rafi_16` over generic `abtal`.

### R5 — Duplicates: keep best copy
When stems match: prefer (1) clinical hinge quality (2) more complete options (3) newer source window. Quarantine losers, do not delete provenance of origin in report.

### R6 — No invented citations
Never write “Cohen p.412” unless that page exists in local extract. Prefer uncited clinical hinge over fake pages.

### R7 — Department taxonomy (one map)

| Department | app `topic` / subtopics |
|------------|-------------------------|
| Operative | `restorative` + `operative` |
| Fixed / implant | `restorative` + `fixed` / `implant` |
| RPD / CD / materials | `restorative` + `rpd` / `complete_denture` / `materials` |
| Endo | `endo` |
| Perio | `perio` |
| OMS / Path / Med | `oms` |
| Ortho / Pedo | `ortho_pedo` |
| Ethics / IC / LA | `ethics` |
| Unclear | `mixed` until classified |

### R8 — Parallel workers write staging only
DeepSeek / subagents write under `data/generated/` only. One merge pass owns `questions.js` / `lessons.js`.

### R9 — Wave honesty
Never say “all MCQs verified” until every **usable** item has hinge ≥40 chars **and** audit flag `truth_pass` (or quarantine). Partial waves report **coverage %**.

### R10 — Lessons grounded in extracts
Department lesson updates must quote or paraphrase from `data/raw/books/text/` or rafi/abtal note extracts — not generic LLM filler.

### R11 — Command-Code DeepSeek usage
```bash
# Non-interactive clinical worker (example)
command-code -p --yolo --skip-onboarding -m deepseek/deepseek-v4-flash \
  --max-turns 30 \
  "Audit MCQs in file PATH. Output pure JSON array per README_DEEPSEEK.md rules. Write to OUTPATH."
```
Use **as many** runs as needed. Prefer batch files of 25–40 MCQs.

### R12 — Stop conditions for a phase
- Gate script exit 0, **or**
- Explicit BLOCKED with missing asset list (file IDs, reason) — never quiet stop.

---

## 2) Baseline snapshot (start of this run)

| Metric | Value |
|--------|------:|
| Bank total | **~16,331** |
| رفيع import | ~13,292 new (parts 1–20 on disk) |
| Exact stem dup groups | ~21 (~84 extras) |
| Stem+options exact extras | ~36 |
| Cross-source stem80 extras | ~16 |
| Thin explanations (<40 chars) | ~705 |
| DeepSeek wave01 Saud | 226 audited, 4 flips |
| DeepSeek wave02 rafi sample | 300 audited, 49 flips |
| Remaining unaudited | **vast majority of bank** |
| SDLE books local PDFs | ~13 (missing Endo/Fixed/Resto cores) |
| رفيع PDF text extracts | 20 parts under `data/raw/rafi/` (~5.6MB text) |

---

## 3) Phases & gates

### Phase 0 — Deduplicate bank  [P0]
**Do**
1. `scripts/dedupe_question_bank.py`
2. Normalize stem: lower, collapse space, strip punctuation (keep Arabic)
3. Groups: exact stem; exact stem+options
4. Keep winner per R5; mark losers `usable:false`, `exclude_reason:"duplicate_of:<id>"`
5. Report: `data/generated/phase_truth/DEDUPE_REPORT.json`

**Gate 0**
```
unique_stems + excluded_dups == bank_total
extras_after exact stem == 0 (among usable:true)
```

### Phase 1 — Official books → searchable corpus  [P0]
**Do**
1. Attempt gdown for missing SDLE Book files (Cohen, Sturdevant, Rosenstiel, Carranza, Hupp, White & Pharoah, McDonald, Lang & Lindhe) from `DRIVE_BOOKS_TREE.json` IDs.
2. For every local PDF under `data/raw/books/sdle_book/`:
   `pdftotext -layout` → `data/raw/books/text/<dept>/<book>.txt`
3. Chunk index: `data/generated/book_corpus_index.json` (keyword → file:line ranges) — refresh with existing keyword script if present.
4. Also symlink/index rafi text: `data/raw/rafi/*.txt` as **recall notes**, not textbooks.

**Gate 1**
```
every local PDF has non-empty .txt OR logged as scanned_image_only
missing_core_titles listed explicitly (Endo/Fixed/Resto)
```

### Phase 2 — Answer truth audit (waves by department)  [P0–P1]
**Priority order**
1. Remaining thin-hinge / community-mark conflict items (all topics)
2. Endo → Perio → Operative → Fixed/RPD → OMS → Ortho/Pedo → Ethics
3. Premium banks last (already more clinical)

**Per batch**
- Input: `data/generated/deepseek_in/dept_<topic>_NN.json`
- Worker: command-code DeepSeek V4 Flash
- Output: `data/generated/deepseek_out/dept_<topic>_NN.json`
- Apply: extend `apply_mcq_fixes.py` or `scripts/apply_deepseek_wave.py`

**Gate 2 (per wave)**
```
audited_count == batch size
each item: hinge ≥40 OR usable:false
flip sample recheck: 10% or min 20 items second pass
coverage report updated: TRUTH_COVERAGE.json
```

### Phase 3 — Apply + quarantine  [P0]
**Do**
1. Merge all deepseek_out into bank
2. Flip answers + rewrite explanations
3. Tag `truth_pass: true|partial`, `truth_confidence`, `truth_wave`
4. Rebuild `analysis/bank_stats.json`

**Gate 3**
```
bank loads in node
no answer index outside 0–3 for usable items
stats match bank length
```

### Phase 4 — Lessons by department  [P1]
**Do**
1. For days 1–9 (and topic pages): inject **textbook-grounded** sections from book corpus (rules, red flags, exam hinges).
2. Staging: `data/generated/dayNN_reading.html` then `merge_generated.py`
3. Depth gate: ≥22k chars / ≥3200 words content days; pomodoro honesty.

**Gate 4**
```
python3 scripts/audit_lesson_depth.py  # PASS
python3 scripts/audit_sources.py       # PASS
```

### Phase 5 — App gates & honesty report  [P0]
**Do**
1. `check_spa_invariants.sh`, `check_no_caps.sh`, `audit_videos.py`
2. Write `docs/TRUTH_AUDIT_STATUS.md` with coverage % by department
3. User hard-refresh note if server live

**Gate 5**
```
all scripts exit 0
TRUTH_AUDIT_STATUS.md published with honest remaining work
```

---

## 4) Success criteria (global)

| Goal | Done when |
|------|-----------|
| G0 Dedup | Usable bank has 0 exact-stem duplicates |
| G1 Books | Local SDLE PDFs extracted to text; missing cores listed |
| G2 Truth | Coverage report; target **≥80% usable bank** with hinge≥40 after waves (stretch 100%) |
| G3 Lessons | Content days 1–9 depth PASS with department-grounded sections |
| G4 Honesty | Public disclaimer intact; no false “official keys” claims |

---

## 5) File map (this campaign)

```
docs/MASTER_TRUTH_AUDIT_PLAN.md          ← this file
docs/TRUTH_AUDIT_STATUS.md               ← living status
data/generated/phase_truth/              ← reports
data/raw/books/text/                     ← pdftotext corpus
data/generated/deepseek_in/dept_*.json   ← audit batches
data/generated/deepseek_out/dept_*.json  ← audit results
scripts/dedupe_question_bank.py
scripts/extract_book_texts.py
scripts/build_truth_batches.py
scripts/apply_deepseek_wave.py
scripts/run_deepseek_batch.sh
```

---

## 6) Execution order (now)

1. ✅ Write this plan  
2. Phase 0 dedupe  
3. Phase 1 extract books + attempt missing downloads  
4. Build thin-hinge + priority truth batches  
5. Fire DeepSeek via command-code in parallel waves  
6. Apply → coverage report  
7. Lessons department refresh (start highest exam weight: restorative/endo/perio)  
8. Full gates  

**Estimated depth:** multi-hour / multi-session campaign. Partial progress is OK only if status file is honest.
