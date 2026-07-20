# Bank vs Source Gap Report (Phase A)

Generated: 2026-07-20  
Scope: read-only on `data/questions.js`. Outputs only under `data/generated/phase_a/`.

> Exam-critical inventory. Packs are stem+notes archives — **not SCFHS keys**.

---

## 1. QUESTION_BANK

| Metric | Value |
|--------|------:|
| **Total items** | **2533** |
| Expected | 2533 → **MATCH** |
| Usable (bank_stats) | 2507 |
| Quarantined / thin usable floor | ~26–32 (`usable:false`, image-dependent) |

### By source

| source | count |
|--------|------:|
| `abtal` | 1181 |
| `premium_operative` | 375 |
| `saud_delta` | 226 |
| `premium_perio` | 150 |
| `premium_endo` | 150 |
| `premium_ortho_pedo` | 120 |
| `always` | 100 |
| `premium_fixed_rpd` | 100 |
| `stream_july2026` | 70 |
| `premium_ethics` | 50 |
| `stream_july2026_inferred` | 7 |
| `gdoc` | 4 |
| **sum** | **2533** |

### By topic

| topic | count |
|-------|------:|
| `restorative` | 913 |
| `oms` | 448 |
| `endo` | 305 |
| `perio` | 288 |
| `ortho_pedo` | 234 |
| `mixed` | 175 |
| `ethics` | 170 |
| **sum** | **2533** |

*(Reference: `analysis/bank_stats.json`. AUDIT_REPORT had ±1 drift on restorative/oms.)*

---

## 2. EXAM_PACKS

- **Built:** 2026-07-20  
- **Purpose:** Full PDF stems + notes. Not SCFHS keys.  
- **Pack count:** 6  
- **Sum `itemCountExtracted`:** **6064**

### `abtal_mar_june_2026` — Mar–June 2026 · أبطال الديجيتال

| Field | Value |
|-------|-------|
| **itemCountExtracted** | **1236** |
| **noteCount** | 302 |
| **period** | 2026-03 → 2026-06 · pages 142 · bankPool `abtal` |
| **monthCounts** | March 162 · April 350 · May 355 · June 369 |
| **disclaimer** | Community ✅ often wrong — not SCFHS keys |
| **themes** | diabetes/implant, crown/prep necrosis, ortho, asthma/analgesia, thyroid/epinephrine, paget/cotton, LA, perio, materials, prostho, endo, trauma, infection control, med/systemic |

**Sample stems:**

1. n=1 (March 2026): Treatment of choice for un-controlled diabetic patients with class 3 ?¿  
2. n=2 (March 2026): most necrosis with ?  
3. n=3 (March 2026): cotton appearance  
4. n=4 (March 2026): Hemosidrin in ?  
5. n=5 (March 2026): ibuprofen  

### `abtal_dec_feb_2026` — Dec 2025 – Feb 2026

| Field | Value |
|-------|------:|
| itemCountExtracted | **2662** |
| noteCount | 379 |

**Sample stems:** instrument/sterilization after restoration; renal transplant 3 months; GP broken file referred to endo.

### `abtal_oct_2025` — Oct 2025

| Field | Value |
|-------|------:|
| itemCountExtracted | **988** |
| noteCount | 105 |

**Sample stems:** How to check crown & root fracture?; Mishap with file fracture in rotary; Pus from pulp.

### `abtal_sep_2025` — Sep 2025

| Field | Value |
|-------|------:|
| itemCountExtracted | **875** |
| noteCount | 160 |

**Sample stems:** fluctuant swelling / radiolucency case; ortho ttt in heavily restored tooth; material for direct pulp capping.

### `saud_vs_rafi_16_19`

| Field | Value |
|-------|------:|
| itemCountExtracted | **226** |
| noteCount | 226 |
| bankPool | saud_delta |

### `stream_july2026`

| Field | Value |
|-------|------:|
| itemCountExtracted | **77** |
| noteCount | 77 |

---

## 3. Raw TXT extracts — numbered question counts

**ZWSP-aware regex:**  
`` `(^|\n)\s*(\d{1,4})\s*\.\s*[\u200b\u200c\u200d\ufeff\u00a0]*` ``

| label | file | numbered (best) | unique norm80 | pack items | renumber? |
|-------|------|----------------:|--------------:|-----------:|-----------|
| Mar–June 2026 | `Mar-June_2026_Questions_________________.txt` | **1233–1237** | 1209 | 1236 | yes (per month) |
| Dec–Feb | `DEC_2025_-FEB_2026_Questions____________.txt` | **2654** | 2527 | 2662 | yes (per month) |
| Oct 2025 | `Oct_-_2025_Questions________________.pdf.txt` | **983–1067** | 966 | 988 | limited |
| Sep 2025 | `Sep_2025_Questions_________________.pdf.txt` | **875** (`N)` form) | 816 | 875 | limited |
| saud_delta | `saud_delta.txt` | 🚨 blocks | — | 226 | n/a |
| stream | `google_doc_stream_abtal.txt` | — | — | 77 | n/a |

**Notes:**

- Mar–June / Dec–Feb use **number + period + U+200B** after many stems (visible as `1.​`).  
- Sep uses **`1)`** style — ZWSP-dot regex alone under-counts; paren form matches pack (875).  
- Oct is mostly plain `N. ` without ZWSP; plain regex can over-count non-question lines (~1067 vs pack 988).

---

## 4. Mar–June extract vs bank `source=abtal`

| metric | value |
|--------|------:|
| extract_n (raw ZWSP numbered) | 1237 |
| extract_n (pack items) | 1236 |
| **extract_n (unique norm80)** | **1209** |
| **bank_abtal_n** | **1181** |
| **approx_already_in_bank** | **229** (~18.9%) |
| **approx_missing_from_bank** | **980** (~81.1%) |

**Match method:** normalize lower + collapse spaces + strip ZWSP; rough presence = first 80 chars prefix match against bank `source=abtal` (same 229 hit when checked against any bank source).

### Sample 15 “missing” stems (approx)

1. treatment of choice for un-controlled diabetic patients with class 3 ?¿  
2. cotton appearance  
3. hemosidrin in ?  
4. swelling after scaling ?  
5. class 2 div 2 ?  
6. ortho classification pic  
7. questions about pain killer for asthmatic patient  
8. hyperthyroidism with epinephrine?  
9. x-ray with an implant ?(depend on pic)  
10. protrusive interfere  
11. herpes labialis case  
12. indicates the presence of intercellular autoantibodies of igg, c3 . what is the  
13. smoker patient case  
14. midbuccal undercut :  
15. class 3 rpd  

### Interpretation

- Bank abtal is a **deduped multi-window merge** (Sep+Oct+Dec–Feb+Mar–June OCR), not a 1:1 import of Mar–June.  
- Still, **~980 / 1209** unique Mar–June stems lack a rough prefix match — **large coverage gap** (and/or aggressive rephrasing at import so stems no longer match).  
- Total abtal extract lines across packs ≈ 5761 vs bank 1181 → bank holds ~20% of raw extract volume after dedup.

### Other windows (same method)

| window | unique extract | in bank | missing |
|--------|---------------:|--------:|--------:|
| Dec–Feb | 2527 | 318 | 2208 |
| Oct | 966 | 285 | 681 |
| Sep | 816 | 303 | 513 |

---

## 5. saud_delta

| metric | value |
|--------|------:|
| count in bank (`source=saud_delta`) | **226** |
| with non-empty explanation | **226** |
| missing explanation | **0** |
| explanations ≥ 40 chars | **226** |
| explanations &lt; 40 chars | **0** |

**Confirmed:** 226 saud_delta items; **all** have non-empty explanations (clinical-hinge pass 2026-07-20 per FOLLOWUP_AUDIT).

---

## 6. Risks

1. **OCR junk** — mojibake, broken words, `¿`, duplicated lines, RTL shaping artifacts.  
2. **Renumbering per month** — Mar–June / Dec–Feb restart at 1; do not treat `maxNumber` as global inventory.  
3. **Image-only Qs** — “pic / x-ray / classification pic” stems; ~32 bank items `usable:false` with image reasons.  
4. **Community ✅ ≠ SCFHS keys** — packs and many abtal explanations are community-sourced.  
5. **ZWSP after `N.`** — naive parsers miss hundreds of questions.  
6. **Cross-month near-duplicates** — inflate extract counts vs unique bank.  
7. **Soft prefix match** — misses paraphrases; can false-positive short stems (`ibuprofen`, `spore test`).  
8. **Format heterogeneity** — Sep `N)`, Oct plain `N.`, Mar–June ZWSP `N.`.  
9. **Import rephrase** — bank stems may encode same clinical idea without 80-char text match → missing count is upper-bound-ish.

---

## 7. High-level gap narrative

- Bank **2533** = abtal **1181** + premium/stream/always/gdoc + **saud_delta 226**.  
- Mar–June pack **1236** items / raw ~**1237** numbered; only **~229** unique extract stems roughly present in bank abtal → **~980 missing** by rough stem match.  
- Dec–Feb extract is the largest gap surface (**~2208** unique stems not roughly in bank).  
- Packs + notes seed (**1529** notes) are the right place to mine missing stems **before** inventing new MCQs.  
- saud_delta pool is **closed and explanation-complete** (226/226).

### Suggested next steps (not done here)

1. Re-run full stem import for Mar–June missing set with option cleaning + image quarantine.  
2. Prefer Dec–Feb unique stems next (largest missing count).  
3. Keep community answers out of high-stakes scoring until textbook hinge.

---

## Files

| Path | Role |
|------|------|
| `/data/prometric/sdle-prep/data/generated/phase_a/BANK_GAP_REPORT.md` | this report |
| `/data/prometric/sdle-prep/data/generated/phase_a/BANK_GAP_REPORT.json` | machine summary |
| `/data/prometric/sdle-prep/data/generated/phase_a/source_inventory.json` | pack item/note counts |
| `/data/prometric/sdle-prep/analysis/bank_stats.json` | bank byTopic/bySource |
