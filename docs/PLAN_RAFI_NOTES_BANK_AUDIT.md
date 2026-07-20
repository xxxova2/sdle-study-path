# Master plan: رفيع المقام + PDFs + Notes tab + bank completeness + answer audit

**Status:** APPROVED by user 2026-07-20 — Phase A in progress  
**Scope change:** **تجميعات كاملة is IN SCOPE** (not optional).  
**Date:** 2026-07-20  
**Trigger:** Critical process failure — artificial caps (e.g. Mar–June shown as ~70 instead of ~1236). User requirement: no slacking, full follow-through, evidence gates.  
**Download index:** `data/generated/phase_a/DOWNLOAD_RAFI_TAJMEEAT.md`  
**DeepSeek wave01:** `data/generated/deepseek_in/` (Saud 226 / 8 chunks)

---

## 0) Non‑negotiable rules (process)

1. **No silent caps.** If a source has N items, the app/report must show N (or `extracted N / source estimate M` with proof). Never ship “sample 70” as the pack.
2. **No “done” without a gate.** Every phase ends with a measurable check (counts, file path, sample IDs).
3. **Community ✅ ≠ truth.** أبطال / رفيع / سعود marks are **provisional**. Final answer must be clinical/board-standard; flips require a hinge + reason.
4. **Source tags forever.** Every imported MCQ keeps `source`, `sourcePack`, `sourcePage` (if known). Never lose provenance.
5. **Department taxonomy (one map only):**

| Department (Notes + bank) | Maps to app `topic` / subtopics |
|---------------------------|----------------------------------|
| Operative | `restorative` + subtopic `operative` |
| Fixed / RPD / CD / materials | `restorative` + fixed/rpd/complete_denture/materials |
| Endo | `endo` |
| Perio | `perio` |
| OMS / Path / Med | `oms` |
| Ortho / Pedo | `ortho_pedo` |
| Ethics / IC / LA | `ethics` |
| Mixed / unclear | `mixed` until classified |

6. **Operative vs restorative:** In this app, **restorative** is the parent pool; **operative** is a subtopic slice (Black’s, composites, amalgams, matrices…). رفيع/أبطال “resto” dumps often mix operative + prostho — classify per stem, not per filename alone.

---

## 1) What exists today (facts — not assumptions)

### 1.1 In-app bank (`data/questions.js`) ≈ **2533**

| source | ~count | What it is |
|--------|-------:|------------|
| `abtal` | 1181 | Merged from أبطال-style extracts (not 1:1 with single PDF) |
| `saud_delta` | 226 | تلخيص سعود — Qs mostly **not** in رفيع 16/19 |
| `stream_*` | 77 | Google Doc stream |
| `always` | 100 | Free points |
| `premium_*` | ~945 | Generated/curated by subject |
| **Total** | **2533** | |

### 1.2 Local PDF / text extracts (workspace)

| File | Role | Extracted stems (Recalls) | Notes pulled |
|------|------|---------------------------:|-------------:|
| Mar–June 2026 أبطال | Priority 1 window | **1236** | **302** |
| Dec 2025–Feb 2026 أبطال | Priority 1 | 2662* | 379 |
| Oct 2025 أبطال | Priority 2 | 988 | 105 |
| Sep 2025 أبطال | Priority 2 | 875 | 160 |
| Saud delta PDF/txt | vs رفيع 16/19 | 226 (in bank) | hinges |
| Full رفيع 1–20 PDFs | **NOT fully on disk** | 0 as bank source | — |

\*High OCR line counts may include renumber noise / duplicates — Phase A will normalize.

### 1.3 Google Drive (already registered)

| Drive | URL / id | Role |
|-------|----------|------|
| **SDLE by رفيع المقام** (root) | `1Qzi9frP8Ha7kYdVmbXzUJPG7H_R6jdVN` | books + plan + banks |
| **خطة مذاكرة -رفيع** | `1f7NKrspy-b77CjZWFVTdob-3Zihl3ssv` | أبطال + تجميعات رفيع + plan docx |
| **تجميعات كاملة** | `1VyuUhLuosZcjwJ9E6nljFPrfDMqjYt1s` | ~1079 files: year banks, **رفيع 1–20**, notes, decks |
| **prometric videos** | `1_2pMWMnyvAnmGpcAMMO_9TfVvf58cLJb` | كورس 46 by subject (operative lec 19–21, prostho 9–14, …) |
| Stream Doc | `1_Oy86bywpw27ewzzzzFZ9iAtTqXFgpNN2s4_izzHPlE` | live MCQ stream (exported) |
| Second Doc | `17aTgLnjMXIrfjgNaTUnHQO7m3xgzHR2VXBTmi03Qii4` | **401 private** — need you to share |

### 1.4 How رفيع works (from plan docx + registry)

- **رفيع المقام parts 1–20** = multi-file recall banks (not one “operative PDF”).
- Study method in تحديث خطة:  
  - Start **رفيع 11–19** (reference-heavy)  
  - Then **7, 5, 10, 9, 1, 3**  
  - Study **subject-by-subject across files** (all endo in رفيع → all resto…), not “file 12 = operative only”.
- **Saud file** = newer Qs relative to رفيع **16 & 19** (already imported as `saud_delta`).
- **Videos (Drive prometric)** are separate: operative = lec 19–21; prostho = 9–14; etc. Do **not** confuse video tree with رفيع PDF part numbers.

### 1.5 Critical gap (why you are right to be angry)

| Claim once made | Reality |
|-----------------|---------|
| Mar–June “~70” | **Cap bug** — real extract **~1236** |
| “All PDF MCQs in 2500 bank” | **False today** — PDF extract counts ≫ tagged bank slices; abtal is 1181 merged, not full multi-window union |
| “Full رفيع reviewed” | **False** — only Saud delta vs 16/19 local; parts 1–20 mostly still on Drive |
| “All answers verified true” | **False** — community keys provisional; clinical hinge rewrite was partial |

---

## 2) Goal definition (done when…)

### G1 — Inventory complete
- [ ] Catalog every local PDF + every Drive رفيع part (1–20) with: pages, text extract path, estimated Q count, department tags.
- [ ] Gap table: `source_item_id → in_bank? bank_id?`

### G2 — Bank completeness (MCQs)
- [ ] Every **usable** MCQ from local أبطال windows + available رفيع parts is either:
  - in `QUESTION_BANK` with provenance, **or**
  - listed in `QUARANTINE` with reason (image-only / unreadable / duplicate).
- [ ] Report: `imported_new`, `dup_skipped`, `quarantine`, `bank_total`.
- [ ] **No cap** in import scripts or UI lists (pagination OK; hidden total not OK).

### G3 — Answer correctness (truth pass)
- [ ] Priority packs get answer audit in waves (not one magical 100% claim):
  1. Saud delta (226)  
  2. Mar–June أبطال  
  3. Dec–Feb أبطال  
  4. رفيع 16/19 then 11–15 then rest as available  
- [ ] Each flipped answer: `id`, old→new, hinge ≥ clinical, reviewer note.
- [ ] Public disclaimer remains: not SCFHS official keys.

### G4 — Notes tab
- [ ] New nav tab **Notes**.
- [ ] All extracted notes (PDF bullets, Note:, parentheticals, Saud hinges used as notes) stored in `data/notes_bank.js`.
- [ ] Categorized by **department** (table above).
- [ ] Filters: department, source pack, search; show full count always.

### G5 — App review
- [ ] SPA gates + no duplicate Correct/Why UI regressions.
- [ ] Recalls shows full counts; Notes separate.
- [ ] Playwright or checklist on all tabs.

---

## 3) Phased execution plan

### Phase A — Source inventory & download list (1–2 sessions)

**Do**
1. Build `data/generated/source_inventory.json` from:
   - local `/data/prometric/*.pdf`
   - `data/raw/*.txt`
   - Drive tree `DRIVE_BOOKS_TREE.json` entries matching `رفيع|Rafie|rafi`
2. List **missing** رفيع parts 1–20 not on disk → download checklist for you.
3. Fix Dec–Feb extract if inflated (normalize numbering / dedupe).

**Gate A**
```
python3 scripts/inventory_sources.py
# prints: local_pdfs, rafi_parts_found, rafi_parts_missing, abtal_windows, extract_counts
# FAIL if any extract UI total != raw parse total
```

**You provide (if missing)**  
- رفيع PDF parts (esp. 16, 19, 11–15) downloaded into e.g. `/data/prometric/rafi/`  
- Open second Google Doc if needed  

---

### Phase B — Full extract pipeline (MCQs + notes, no caps)

**Do**
1. Single script `scripts/extract_pdf_pack.py`:
   - Input: PDF or txt  
   - Output: `data/generated/packs/<pack_id>.json`  
   - Fields per item: `stem, options[], notes[], communityAnswer?, month?, page?, department?`
2. Re-run all أبطال + Saud + any new رفيع.
3. Aggregate notes → `data/notes_bank.js` (department-tagged).

**Gate B**
```
# For each pack:
extracted_count == count(items in json)
notes_with_text == count(items with notes[])
# FAIL if any pack has max_items or [:70] in code (rg gate)
rg -n 'max_items|items\[:70\]|slice\(0,\s*70\)' scripts/ data/exam_packs.js js/app.js && exit 1
```

---

### Phase C — Bank merge (all MCQs into 2500+)

**Do**
1. Fuzzy/exact dedupe vs existing bank (stem normalize).
2. Import **new only** with:
   - `source`: `abtal_mar_june_2026` | `rafi_16` | … (granular)
   - `usable: false` if image-only
3. Keep legacy `abtal` ids stable; new packs get new ids.
4. Bump bank total; write `data/generated/import_report_<date>.json`.

**Gate C**
```
bank_total_after >= bank_total_before
every pack: quarantine + imported + already_present == extracted_usable
zero unexplained drops
```

**Honest expectation:** Final bank may land **3000–5000+** if full رفيع 1–20 imported. “2500+” is floor, not ceiling.

---

### Phase D — Answer truth audit (waves + DeepSeek)

**Policy**
- Never bulk-trust ✅.
- Wave order = exam relevance (Saud → Mar–June → …).
- Each wave: sample 100% of **flagged** (thin hinge / conflict / image) + systematic pass for short stems.

**Per item output (DeepSeek or human)**
```json
{
  "id": "...",
  "answer_index": 0,
  "confidence": "high|med|low",
  "hinge": "clinical why in 1–3 sentences",
  "flip": false,
  "department": "operative"
}
```

**Gate D (per wave)**
- 100% of wave has hinge ≥ 40 chars OR quarantine.
- Flip rate + sample of 20 flips re-checked by second pass (DeepSeek or you).

---

### Phase E — Notes tab (product)

**Do**
1. `data/notes_bank.js` — array of `{ id, text, department, sourcePack, relatedStem?, bankId? }`.
2. Nav: **Notes** (coach mode; link from More in simple mode).
3. UI: department chips, search, full count, open related MCQ if `bankId`.
4. Do **not** bury notes only inside Recalls.

**Gate E**
```
Notes tab lists noteCount == notes_bank.length
Every department chip filters correctly
No artificial display limit without “Show all” + total
```

---

### Phase F — App review & anti-slack gates

**Do**
1. Checklist all tabs: Today, Days, Pass, Always, Extra, MCQs, Recalls, **Notes**, Progress, Feedback.
2. Feedback UI: answer once + why once (no double).
3. Add CI-ish scripts:
   - `scripts/check_no_caps.sh` — forbid silent sample caps  
   - `scripts/check_pack_counts.sh` — extract vs UI meta match  
   - Extend `check_spa_invariants.sh` for Notes tab  

**Gate F**
```
bash scripts/check_spa_invariants.sh
bash scripts/check_no_caps.sh
bash scripts/check_pack_counts.sh
# manual or playwright: Notes + Recalls full counts
```

---

## 4) Work split: Grok (this agent) vs DeepSeek V4 Pro

| Work | Owner | Why |
|------|-------|-----|
| Repo inventory, scripts, bank merge, UI Notes tab, gates, deploy | **Grok (here)** | Has disk + git + app |
| Bulk clinical hinge / answer verification JSON | **DeepSeek** (you run) | Long clinical text, parallel waves |
| Download رفيع PDFs from Drive | **You** | Auth / large files |
| Spot-check flips that feel wrong | **You** | Final student trust |

### DeepSeek system preamble (paste every time)

```text
You are auditing KSA SDLE / Prometric-style dental MCQs for a study app.
Rules:
- Community ✅ marks are often wrong — decide by clinical standard (board/textbook), not the mark.
- Output ONLY valid JSON array, no markdown fences unless asked.
- Each object: id, answer_index (0-3), confidence (high|med|low), hinge (clinical, 1-3 sentences), flip (bool vs provided answer_index_in), department (operative|fixed|rpd|endo|perio|oms|ortho_pedo|ethics|mixed).
- If image-dependent or impossible without figure: usable false, hinge explains why.
- Do not invent page numbers or fake citations.
- Operative = direct resto procedures/materials/preps; fixed/rpd/cd = prostho; do not dump everything into restorative without subtag.
```

### Prompt DS-1 — Wave audit (Saud / pack chunk)

```text
[PASTE SYSTEM PREAMBLE]

Audit these MCQs. For each, set the correct answer_index and a clinical hinge.
If the given answer_index_in is wrong, set flip:true.

Input JSON:
{{PASTE_CHUNK_OF_20_TO_40_ITEMS}}
```

### Prompt DS-2 — Department classify notes

```text
[PASTE SYSTEM PREAMBLE]

Classify each note into department (operative|fixed|rpd|endo|perio|oms|ortho_pedo|ethics|mixed).
Return JSON: [{ "id", "department", "short_title", "keep": true/false }]
Drop pure noise (empty, emoji only, “read about implants” with no content) with keep:false.

Notes:
{{PASTE_NOTES}}
```

### Prompt DS-3 — Dedup assist

```text
You compare MCQ stems for near-duplicates (same clinical fact, reworded).
Return JSON: [{ "keep_id", "drop_ids": [], "reason" }]
Only drop if same answer concept; if different hinge/answer, keep both and mark "related".

Stems:
{{PASTE}}
```

### Prompt DS-4 — Operative vs prostho vs materials

```text
For each stem, label primary department and secondary tags.
operative vs fixed vs rpd vs materials must be explicit.
Return JSON array.

Stems:
{{PASTE}}
```

**Chunk size:** 20–40 MCQs per DeepSeek call (quality > speed).  
**I will prepare** `data/generated/deepseek_in/wave_*.json` chunks + merge script `scripts/apply_mcq_fixes.py` (already exists).

---

## 5) Execution order (recommended)

```
A inventory → you download missing رفيع →
B full extract (no caps) →
C bank merge + report →
D answer waves (DeepSeek + merge) →
E Notes tab →
F app review + anti-cap gates → deploy
```

Do **not** skip A/B before D (auditing incomplete bank wastes effort).  
Do **not** claim “all answers true” until each wave’s Gate D passes.

---

## 6) Immediate next action (when you say go)

1. Freeze **no-cap** rule in `scripts/check_no_caps.sh`.  
2. Run Phase A inventory → publish **missing رفيع list**.  
3. You download / point path to رفيع files.  
4. Start Phase B extract → Notes data.  
5. Prepare DeepSeek wave_01 (Saud 226) for you to run.

---

## 7) Apology / accountability

The Mar–June **~70** display was an artificial limit, not the PDF size. That class of error (silent truncation) is now treated as a **P0 process bug**. This plan’s gates exist so we cannot “finish” while hiding the rest of the file again.

---

## 8) What I need from you to execute without guessing

1. Approve this plan (or edit priorities).  
2. Prefer: download رفيع parts into `/data/prometric/rafi/` (16, 19 first, then 11–15, then rest).  
3. Confirm if **تجميعات 438** (680p WhatsApp PDF) is in scope (older 2023 — registry says lower priority).  
4. Share second Google Doc if it has notes/MCQs we lack.  
5. Say whether DeepSeek waves should be **20** or **40** items per file.
