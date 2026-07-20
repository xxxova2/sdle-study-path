#!/usr/bin/env python3
"""Apply Grok book-grounded audits only (DeepSeek is not the judge)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data/questions.js"
OUT_DIRS = [
    ROOT / "data/generated/grok_book_out",
    ROOT / "data/generated/grok_book_out_residual",
]
REPORT = ROOT / "data/generated/phase_truth/GROK_BOOK_APPLY_REPORT.json"


def is_placeholder(exp: str) -> bool:
    exp = exp or ""
    if "Community mark provisional" in exp:
        return True
    if "Write the hinge" in exp or "Extracted from" in exp:
        return True
    if exp.startswith("From رفيع") or exp.startswith("From أبطال"):
        return True
    return False


def load_bank():
    text = QUESTIONS.read_text(encoding="utf-8")
    m = re.search(r"w\.QUESTION_BANK\s*=\s*(\[.*\])\s*;", text, re.S)
    if not m:
        raise SystemExit("parse fail")
    return json.loads(m.group(1))


def write_bank(bank):
    header = "/** SDLE question bank — Grok book-grounded wave */\n(function (w) {\n  w.QUESTION_BANK = "
    footer = ";\n})(typeof window !== 'undefined' ? window : globalThis);\n"
    QUESTIONS.write_text(
        header + json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + footer,
        encoding="utf-8",
    )


def main() -> int:
    bank = load_bank()
    by_id = {q["id"]: q for q in bank}
    updated = flipped = quarantined = skipped = files = 0
    paths = []
    for OUT in OUT_DIRS:
        if OUT.exists():
            paths.extend(sorted(OUT.rglob("batch_*.json")))
    if not paths:
        print(json.dumps({"error": "no out dirs", "paths": [str(p) for p in OUT_DIRS]}))
        return 1
    for path in paths:
        try:
            rows = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(rows, dict):
            rows = rows.get("items") or rows.get("results") or []
        if not isinstance(rows, list):
            continue
        files += 1
        for item in rows:
            if not isinstance(item, dict) or "id" not in item:
                continue
            q = by_id.get(item["id"])
            if not q:
                continue
            action = str(item.get("action") or "keep").lower()
            hinge = str(item.get("hinge") or "")
            support = str(item.get("book_support") or "")
            if action == "quarantine" or item.get("usable") is False:
                q["usable"] = False
                q["exclude_reason"] = support or hinge or "quarantine_grok_book"
                q["read_audit"] = True
                q["truth_wave"] = f"grok_book:{path.stem}"
                quarantined += 1
                continue
            if len(hinge) < 60 or is_placeholder(hinge):
                skipped += 1
                continue
            if len(support) < 20:
                # require book grounding signal
                skipped += 1
                continue
            ans = item.get("answer_index")
            if ans is None:
                ans = item.get("answer")
            if isinstance(ans, int) and 0 <= ans <= 3:
                if q.get("answer") != ans:
                    flipped += 1
                q["answer"] = ans
            # hinge + support merged into explanation
            q["explanation"] = hinge.strip()
            if support and support not in hinge:
                q["explanation"] = hinge.strip() + " [Book: " + support.strip()[:280] + "]"
            q["book_support"] = support
            q["truth_pass"] = True
            q["read_audit"] = True
            q["truth_judge"] = "grok_book"
            q["audit_confidence"] = item.get("confidence") or "med"
            q["truth_wave"] = f"grok_book:{path.parent.name}/{path.stem}"
            q["usable"] = True
            updated += 1

    write_bank(bank)
    usable = [q for q in bank if q.get("usable") is not False]
    ph = sum(1 for q in usable if is_placeholder(str(q.get("explanation") or "")))
    report = {
        "files": files,
        "updated": updated,
        "flipped": flipped,
        "quarantined": quarantined,
        "skipped_weak": skipped,
        "usable": len(usable),
        "still_placeholder": ph,
        "judge": "grok_4.5_book_grounded",
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
