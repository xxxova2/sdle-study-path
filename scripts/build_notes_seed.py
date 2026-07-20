#!/usr/bin/env python3
"""Extract ALL notes from data/exam_packs.js → data/generated/phase_a/notes_seed.json

Full dump — no truncation of the notes list.
Usage: python3 scripts/build_notes_seed.py
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAM_PACKS = ROOT / "data" / "exam_packs.js"
OUT_JSON = ROOT / "data" / "generated" / "phase_a" / "notes_seed.json"
OUT_MD = ROOT / "data" / "generated" / "phase_a" / "NOTES_SEED_REPORT.md"

# first-match keyword rules
DEPT_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "endo",
        re.compile(
            r"\b(endo|endodont|pulp|periapical|apexif|obtura|gutta[\s-]?percha|"
            r"root\s*canal|rct|irri(?:gation|gant)|sodium\s*hypochlorite|naocl|"
            r"mta\b|calcium\s*hydroxide|ledermix|file\s*separation|working\s*length)\b",
            re.I,
        ),
    ),
    (
        "perio",
        re.compile(
            r"\b(perio|periodont|gingiv|pocket|scaling|root\s*plan|srp\b|furcation|"
            r"attachment\s*loss|osseous\s*surgery|gtr\b|guided\s*tissue|"
            r"plaque\s*index|bleeding\s*on\s*probing|bop\b|periodontal)\b",
            re.I,
        ),
    ),
    (
        "ortho",
        re.compile(
            r"\b(ortho|orthodont|malocclusion|class\s*[i1]{1,3}\b|cephalometr|"
            r"bracket|archwire|retainer|space\s*maintainer|leeway|mixed\s*dentition|"
            r"growth\s*modif|headgear|functional\s*appliance|pedo|pediatric|"
            r"fluoride\s*varnish|ssc\b|stainless\s*steel\s*crown|pulpotomy|pulpectomy)\b",
            re.I,
        ),
    ),
    (
        "operative",
        re.compile(
            r"\b(operative|composite|amalgam|black'?s?\s*class|matrix\s*band|"
            r"tofflemire|cavity\s*prep|acid\s*etch|bonding\s*agent|shade\s*match|"
            r"g\.?i\.?c\.?|glass\s*ionomer|caries|incremental\s*build|rubber\s*dam)\b",
            re.I,
        ),
    ),
    (
        "prostho",
        re.compile(
            r"\b(prostho|prosthodont|rpd\b|fpd\b|fixed\s*partial|removable\s*partial|"
            r"complete\s*denture|overdenture|abutment|pontic|impression\s*material|"
            r"pvs\b|alginate|occlusion\s*scheme|centric\s*relation|crown\s*prep|"
            r"veneer|implant\s*crown|cement\s*retained|screw\s*retained)\b",
            re.I,
        ),
    ),
    (
        "oms",
        re.compile(
            r"\b(oms\b|oral\s*surg|maxillofac|extraction|impacted|third\s*molar|"
            r"wisdom|fracture|trauma|biopsy|cyst|tumor|patholog|anesthesia|la\b|"
            r"local\s*anest|lidocaine|articaine|nerve\s*block|ianb|medical\s*emergency|"
            r"syncope|aspirin|asprin|warfarin|bisphosphon|mronj|orofacial)\b",
            re.I,
        ),
    ),
    (
        "ethics",
        re.compile(
            r"\b(ethic|consent|confidential|malpractice|infection\s*control|steriliz|"
            r"autoclave|cross[\s-]?infect|ppe\b|needle\s*stick|professionalism|"
            r"negligence|informed\s*consent|hipaa|scfhs|licensure)\b",
            re.I,
        ),
    ),
]


def guess_department(text: str) -> str:
    for dept, rx in DEPT_RULES:
        if rx.search(text or ""):
            return dept
    return "mixed"


def stem_preview(stem: str, max_len: int = 120) -> str:
    s = re.sub(r"\s+", " ", str(stem or "")).strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1] + "…"


def load_exam_packs() -> dict:
    src = EXAM_PACKS.read_text(encoding="utf-8")
    m = re.search(r"(?:w|window)\.EXAM_PACKS\s*=\s*", src)
    if not m:
        m = re.search(r"EXAM_PACKS\s*=\s*", src)
    if not m:
        raise SystemExit(f"EXAM_PACKS assignment not found in {EXAM_PACKS}")
    i = m.end()
    while i < len(src) and src[i] in " \t\n\r":
        i += 1
    if i >= len(src) or src[i] != "{":
        raise SystemExit(f"Unexpected EXAM_PACKS start: {src[i : i + 40]!r}")
    obj, _ = json.JSONDecoder().raw_decode(src, i)
    return obj


def main() -> None:
    packs_root = load_exam_packs()
    packs = packs_root.get("packs") or []
    notes: list[dict] = []
    note_idx = 0
    by_dept = {
        "endo": 0,
        "perio": 0,
        "ortho": 0,
        "operative": 0,
        "prostho": 0,
        "oms": 0,
        "ethics": 0,
        "mixed": 0,
    }
    by_pack: dict[str, dict] = {}

    for pack in packs:
        pack_id = pack.get("id") or "unknown"
        items = pack.get("items") or []
        by_pack[pack_id] = {"items": len(items), "notes": 0, "itemsWithNotes": 0}
        for item in items:
            item_notes = item.get("notes") or []
            if item_notes:
                by_pack[pack_id]["itemsWithNotes"] += 1
            for raw in item_notes:
                if isinstance(raw, str):
                    text = raw
                elif isinstance(raw, dict):
                    text = str(raw.get("text") or raw)
                else:
                    text = str(raw or "")
                if not text.strip():
                    continue
                note_idx += 1
                blob = f"{item.get('stem') or ''}\n{text}"
                department = guess_department(blob)
                by_dept[department] = by_dept.get(department, 0) + 1
                by_pack[pack_id]["notes"] += 1
                notes.append(
                    {
                        "id": f"note_{note_idx:05d}",
                        "text": text,
                        "sourcePack": pack_id,
                        "month": item.get("month"),
                        "stemPreview": stem_preview(item.get("stem") or ""),
                        "department": department,
                        "itemN": item.get("n"),
                    }
                )

    pack_meta = []
    for p in packs:
        pid = p.get("id")
        bp = by_pack.get(pid or "", {})
        pack_meta.append(
            {
                "id": pid,
                "itemCountExtracted": p.get("itemCountExtracted"),
                "itemsLength": len(p.get("items") or []),
                "noteCountMeta": p.get("noteCount"),
                "notesExtracted": bp.get("notes", 0),
                "itemsWithNotes": bp.get("itemsWithNotes", 0),
            }
        )

    payload = {
        "built": date.today().isoformat(),
        "purpose": "Phase A seed: every item.notes[] from EXAM_PACKS (full dump, no cap).",
        "totalNotes": len(notes),
        "byDepartment": by_dept,
        "byPack": by_pack,
        "packMeta": pack_meta,
        "notes": notes,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    dept_lines = "\n".join(
        f"| {d} | {n} |"
        for d, n in sorted(by_dept.items(), key=lambda x: -x[1])
    )
    pack_lines = "\n".join(
        f"| {p['id']} | {p['itemsLength']} | {p['itemCountExtracted']} | "
        f"{p['noteCountMeta'] if p['noteCountMeta'] is not None else '—'} | "
        f"{p['itemsWithNotes']} | {p['notesExtracted']} |"
        for p in pack_meta
    )

    md = f"""# Notes seed report (Phase A)

**Built:** {payload['built']}  
**Source:** `data/exam_packs.js` → all `item.notes[]` (full dump, no truncation).  
**Output:** `data/generated/phase_a/notes_seed.json`

## Totals

| Metric | Count |
|--------|------:|
| Total notes | **{len(notes)}** |
| Packs scanned | {len(packs)} |

## By department (keyword guess)

| Department | Notes |
|------------|------:|
{dept_lines}

## By pack

| Pack | items.length | itemCountExtracted | noteCount meta | items w/ notes | notes extracted |
|------|-------------:|-------------------:|---------------:|---------------:|----------------:|
{pack_lines}

## Schema (each note)

```json
{{
  "id": "note_00001",
  "text": "...",
  "sourcePack": "abtal_mar_june_2026",
  "month": "March 2026",
  "stemPreview": "…",
  "department": "endo|perio|ortho|operative|prostho|oms|ethics|mixed",
  "itemN": 1
}}
```

Department is a **keyword heuristic** on stem+note text — not final clinical labeling.

## Regenerator

```bash
python3 scripts/build_notes_seed.py
# or
node scripts/build_notes_seed.mjs
```
"""
    OUT_MD.write_text(md, encoding="utf-8")
    print("Wrote", OUT_JSON)
    print("Wrote", OUT_MD)
    print("totalNotes:", len(notes))
    print("byDepartment:", json.dumps(by_dept, indent=2))


if __name__ == "__main__":
    main()
