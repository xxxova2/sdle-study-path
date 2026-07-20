# RED LINE — NO SLACKING

**Binding for every agent on `sdle-prep`. Violating this is failure, not a style issue.**

Effective: 2026-07-20. Supersedes soft “guidelines.”

---

## Absolute bans

1. **Never say “done / all / finished / fully checked”** unless every **Gate** below exits **0** on the same turn.
2. **Never claim you “read all MCQs”** unless Gate G-READ is green. Batch DeepSeek **without** a coverage report is **not** “I read them.”
3. **Never stop a phase quietly.** Either gate green or `BLOCKED:` with exact missing IDs/files.
4. **Never invent “optional skip”** for user-ordered work (books, dedupe, full audit, lessons).
5. **Never claim SCFHS official answer keys** unless a real key file exists on disk.
6. **Never leave exact or normalized stem duplicates** among `usable:true` (Gate G-DUP).
7. **Never leave lessons days 1–9 thin** (Gate G-LESSON).
8. **Never report old bank totals** after a write — re-run `scripts/gate_no_slack.py` and paste its JSON.

---

## Who judges answers (CRITICAL)

| Role | Model / source | Allowed? |
|------|----------------|----------|
| **Final right/wrong judge** | **Grok 4.5** (this agent or Grok subagents) + **official book extracts / FACTPACKS** | **YES — required** |
| Bulk draft only | DeepSeek / other lower models | **NO as final judge** |
| Community bank ✅ | أبطال / رفيع marks | Provisional only — never sole truth |
| SCFHS sealed key | Does not exist on disk | Never claim |

**Rule:** DeepSeek must not be the last word on answer correctness. If a lower model drafts, **Grok + books must accept, flip, or quarantine.**

## Definition of “read / verified” for the bank

An item is **book-verified** only if **all** of:

| Field | Requirement |
|-------|-------------|
| In bank | `usable !== false` |
| Judge | `truth_judge === "grok_book"` **or** explicit Grok book-wave stamp |
| Audit artifact | Valid object under `data/generated/grok_book_out/` with `answer_index`, `hinge` ≥60, **`book_support` ≥20** |
| Answer | `answer` is int 0–3 |
| Flag | `truth_pass === true` **or** quarantined `usable:false` with reason |
| Not enough | DeepSeek-only hinge, or “Community provisional”, or length-only |

**Partial waves are incomplete.** Coverage = `book_verified_count / usable_count`.

---

## Gates (must all pass to claim phase complete)

```bash
cd /data/prometric/sdle-prep && python3 scripts/gate_no_slack.py
```

| Gate | Rule |
|------|------|
| **G-DUP** | Among usable: normalized-stem extras == 0 |
| **G-READ** | usable_missing_audit == 0 |
| **G-TRUTH** | usable without truth_pass == 0 (or listed as BLOCKED quarantine) |
| **G-HINGE** | usable with explanation &lt; 40 chars == 0 |
| **G-LESSON** | `audit_lesson_depth.py` PASS for days 1–9 |
| **G-BOOKS** | Official Appendix C set local 22/22 (or BLOCKED missing list) |

Exit code **0** only if all green. Anything else = **not finished**.

---

## Work order when user says “do the plan”

1. Run `gate_no_slack.py` → see reds  
2. Fix reds (dedupe → audit missing → apply → lessons → books)  
3. Re-run gate until green  
4. Only then report finished, with the gate JSON  

No essays instead of gates. No “mostly done.”

---

## Anti-patterns that count as slacking

- Exact-string dedupe only when near-clones exist  
- Stopping at “~16k truth_pass” without G-READ  
- Status every N minutes with no progress on red gates  
- Asking the user to re-state the plan instead of opening `docs/MASTER_TRUTH_AUDIT_PLAN.md`  
- Calling model batch work “I read all of them” without coverage math  

---

## User mandate (summary)

Remove dups · audit MCQs against clinical + official book corpus · books on disk as text · lessons by department from real extracts · DeepSeek allowed fully · **no silent caps · no fake done.**
