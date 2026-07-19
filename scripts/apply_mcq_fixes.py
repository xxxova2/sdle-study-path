#!/usr/bin/env python3
"""Merge verified MCQ fixes from data/generated/mcq_fix/out_*.json into questions.js."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data" / "questions.js"
FIX_DIR = ROOT / "data" / "generated" / "mcq_fix"
REPORT = FIX_DIR / "apply_report.json"

PLACEHOLDER_RE = re.compile(
    r"Community bank|Extracted from|placeholder|أبطال|verify if no textbook|"
    r"Review from official|Write the hinge|Study books:",
    re.I,
)


def load_bank() -> list:
    text = QUESTIONS.read_text(encoding="utf-8")
    m = re.search(r"w\.QUESTION_BANK\s*=\s*(\[.*\])\s*;", text, re.S)
    if not m:
        raise SystemExit("Could not parse QUESTION_BANK")
    return json.loads(m.group(1))


def write_bank(bank: list) -> None:
    header = "/** SDLE question bank — clinically reviewed hinges 2026-07-19 */\n(function (w) {\n  w.QUESTION_BANK = "
    footer = ";\n})(typeof window !== 'undefined' ? window : globalThis);\n"
    body = json.dumps(bank, ensure_ascii=False, separators=(",", ":"))
    QUESTIONS.write_text(header + body + footer, encoding="utf-8")


def is_placeholder(exp: str | None) -> bool:
    if not exp or not str(exp).strip():
        return True
    s = str(exp)
    if PLACEHOLDER_RE.search(s):
        return True
    if len(s) < 50:
        return True
    return False


def collect_fixes() -> dict[str, dict]:
    fixes: dict[str, dict] = {}
    for path in sorted(FIX_DIR.glob("out_*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"skip {path.name}: {e}", file=sys.stderr)
            continue
        if isinstance(data, dict) and "fixes" in data:
            data = data["fixes"]
        if not isinstance(data, list):
            continue
        for item in data:
            if not isinstance(item, dict) or "id" not in item:
                continue
            qid = item["id"]
            ans = item.get("answer")
            exp = (item.get("explanation") or "").strip()
            if not isinstance(ans, int) or ans < 0 or ans > 3:
                continue
            if len(exp) < 40 or is_placeholder(exp):
                continue
            prev = fixes.get(qid)
            if prev and len(prev.get("explanation", "")) >= len(exp) and not item.get("force"):
                continue
            entry = {"answer": ans, "explanation": exp, "from": path.name}
            if item.get("options") and isinstance(item["options"], list) and len(item["options"]) == 4:
                entry["options"] = [str(x) for x in item["options"]]
            if item.get("q"):
                entry["q"] = item["q"]
            if item.get("usable") is False:
                entry["usable"] = False
                entry["exclude_reason"] = item.get("exclude_reason", "flagged during review")
            fixes[qid] = entry
    return fixes


def main() -> None:
    bank = load_bank()
    by_id = {q["id"]: q for q in bank}
    fixes = collect_fixes()
    applied = 0
    answer_changes = 0
    missing = []
    for qid, fix in fixes.items():
        q = by_id.get(qid)
        if not q:
            missing.append(qid)
            continue
        old_ans = q.get("answer")
        if fix.get("options"):
            q["options"] = fix["options"]
        if fix.get("q"):
            q["q"] = fix["q"]
        q["answer"] = fix["answer"]
        q["explanation"] = fix["explanation"]
        if fix.get("usable") is False:
            q["usable"] = False
            q["exclude_reason"] = fix.get("exclude_reason")
        if old_ans != fix["answer"]:
            answer_changes += 1
        applied += 1

    write_bank(bank)

    still_ph = sum(1 for q in bank if is_placeholder(q.get("explanation")))
    report = {
        "applied": applied,
        "answer_changes": answer_changes,
        "missing_ids": missing[:50],
        "fix_files": len(list(FIX_DIR.glob("out_*.json"))),
        "still_placeholder": still_ph,
        "total_bank": len(bank),
    }
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
