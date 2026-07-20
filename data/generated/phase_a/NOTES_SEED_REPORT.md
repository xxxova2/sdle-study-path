# Notes seed report (Phase A)

**Built:** 2026-07-20  
**Source:** `data/exam_packs.js` → every `item.notes[]` entry (full dump, no truncation).  
**Output:** [`notes_seed.json`](./notes_seed.json)

## Totals

| Metric | Count |
|--------|------:|
| **Total notes** | **1529** |
| Packs in meta (inventory) | 6 |

Pack meta `noteCount` is **items with ≥1 note** (not note-string count). String dump is higher when items carry multiple note bullets:

| Pack | itemCountExtracted (meta) | noteCount meta (items w/ notes) |
|------|--------------------------:|--------------------------------:|
| abtal_mar_june_2026 | 1236 | 302 |
| abtal_dec_feb_2026 | 2662 | 379 |
| abtal_oct_2025 | 988 | 105 |
| abtal_sep_2025 | 875 | 160 |
| saud_vs_rafi_16_19 | 226 | 226 |
| stream_july2026 | 77 | 77 |
| **Sum of noteCount meta** | | **1249** |
| **Actual note strings extracted** | | **1529** |

## By department (keyword guess)

Taxonomy: `endo` / `perio` / `ortho` / `operative` / `prostho` / `oms` / `ethics` / `mixed`.

| Department | Notes |
|------------|------:|
| mixed | **808** |
| perio | **170** |
| ortho | **124** |
| oms | **124** |
| prostho | **96** |
| endo | **91** |
| operative | **64** |
| ethics | **52** |
| **Total** | **1529** |

Seed `by_department`:

```json
{
  "mixed": 808,
  "ortho": 124,
  "perio": 170,
  "oms": 124,
  "endo": 91,
  "ethics": 52,
  "prostho": 96,
  "operative": 64
}
```

(Normalized: `ortho_pedo`→`ortho`, `fixed`+`rpd`→`prostho`.)

## Schema (each note)

```json
{
  "id": "abtal_mar_june_2026_7_0",
  "text": "…",
  "sourcePack": "abtal_mar_june_2026",
  "month": "March 2026",
  "stemPreview": "class 2 div 2 ?",
  "department": "endo|perio|ortho|operative|prostho|oms|ethics|mixed"
}
```

Department is a **keyword heuristic** on stem+note text — not final clinical labeling (Phase B / DS-2 can reclassify).

## Regenerators

```bash
# Preferred regenerators (same keyword rules as scripts/build_notes_seed.*)
python3 scripts/build_notes_seed.py
# or
node scripts/build_notes_seed.mjs

# Cap gate
bash scripts/check_no_caps.sh
```

`build_notes_seed.py` / `.mjs` use the **8-way** department map (`ortho`, `prostho`, …). Re-run to normalize seed labels away from `ortho_pedo` / `fixed` / `rpd` if desired.

## Cap gate

`scripts/check_no_caps.sh` fails on:

1. Undocumented `slice(0, 70)` / `max_items=70` / `[:70]` in `js/app.js`, `data/exam_packs.js`, `scripts/`
2. False-total language (`stems shown`, `sample of 70`, …)
3. Any pack where `itemCountExtracted != items.length` (Node parse of `EXAM_PACKS`)
