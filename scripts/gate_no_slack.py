#!/usr/bin/env python3
"""Hard gates — exit 0 only if no-slack red lines are green."""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data" / "questions.js"
DEEP_OUT = ROOT / "data" / "generated" / "deepseek_out"
BOOKS = ROOT / "data" / "raw" / "books" / "sdle_book"
STOP = {
    "the", "a", "an", "of", "to", "in", "on", "for", "is", "are", "was", "were",
    "with", "and", "or", "which", "following", "most", "likely", "best",
    "patient", "pt", "year", "old", "yo", "yrs", "years", "about", "from",
    "that", "this", "what", "when", "who", "how", "item",
}
ITEM_N = re.compile(r"\bitem\s*\d+\b", re.I)


def norm_stem(s: str) -> str:
    s = (s or "").lower()
    s = ITEM_N.sub(" ", s)
    s = re.sub(r"[^\w\u0600-\u06ff]+", " ", s, flags=re.UNICODE)
    return " ".join(t for t in s.split() if t and t not in STOP and len(t) > 1)


def load_bank():
    text = QUESTIONS.read_text(encoding="utf-8")
    m = re.search(r"w\.QUESTION_BANK\s*=\s*(\[.*\])\s*;", text, re.S)
    if not m:
        raise SystemExit("parse fail")
    return json.loads(m.group(1))


def load_audit_ids() -> dict[str, dict]:
    """id -> best audit record with hinge."""
    best: dict[str, dict] = {}
    if not DEEP_OUT.exists():
        return best
    for p in DEEP_OUT.glob("*.json"):
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        items = d if isinstance(d, list) else (d.get("items") or d.get("results") or [])
        if not isinstance(items, list):
            continue
        for x in items:
            if not isinstance(x, dict) or not x.get("id"):
                continue
            hinge = str(x.get("hinge") or x.get("explanation") or "")
            rec = {
                "id": x["id"],
                "answer_index": x.get("answer_index", x.get("answer")),
                "hinge": hinge,
                "file": p.name,
            }
            prev = best.get(x["id"])
            if not prev or len(hinge) > len(prev.get("hinge") or ""):
                best[x["id"]] = rec
    return best


def main() -> int:
    bank = load_bank()
    usable = [q for q in bank if q.get("usable") is not False]
    audits = load_audit_ids()

    # G-DUP
    stems = [norm_stem(q.get("q") or "") for q in usable]
    stems = [s for s in stems if len(s) >= 10]
    c = Counter(stems)
    dup_extras = sum(v - 1 for v in c.values() if v > 1)

    def is_placeholder(exp: str) -> bool:
        exp = exp or ""
        if "Community mark provisional" in exp:
            return True
        if "Write the hinge" in exp or "Extracted from" in exp:
            return True
        if exp.startswith("From رفيع") or exp.startswith("From أبطال"):
            return True
        return False

    # G-READ / G-TRUTH / G-HINGE / G-PLACEHOLDER
    missing_audit = []
    no_truth = []
    thin_hinge = []
    placeholders = []
    for q in usable:
        qid = q.get("id")
        au = audits.get(qid)
        exp = str(q.get("explanation") or "")
        stamped = q.get("read_audit") is True or q.get("truth_pass") is True
        if not au and not stamped:
            missing_audit.append(qid)
        elif au and not stamped and len(str(au.get("hinge") or "")) < 40 and len(exp) < 40:
            missing_audit.append(qid)
        if q.get("truth_pass") is not True:
            no_truth.append(qid)
        if len(exp) < 40:
            thin_hinge.append(qid)
        if is_placeholder(exp):
            placeholders.append(qid)

    # G-BOOKS (PDFs live in department subfolders under sdle_book/)
    pdfs = list(BOOKS.rglob("*.pdf")) if BOOKS.exists() else []
    books_ok = len(pdfs) >= 20  # Appendix C curated set ~22

    # G-LESSON
    lesson_ok = False
    lesson_out = ""
    try:
        r = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "audit_lesson_depth.py")],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120,
        )
        lesson_out = (r.stdout or "") + (r.stderr or "")
        lesson_ok = r.returncode == 0 and "PASS" in lesson_out
    except Exception as e:
        lesson_out = str(e)

    gates = {
        "G-DUP": {"ok": dup_extras == 0, "norm_stem_extras": dup_extras},
        "G-READ": {
            "ok": len(missing_audit) == 0,
            "usable": len(usable),
            "with_audit_file": sum(1 for q in usable if q.get("id") in audits),
            "missing_audit_count": len(missing_audit),
            "missing_sample": missing_audit[:20],
        },
        "G-TRUTH": {
            "ok": len(no_truth) == 0,
            "no_truth_pass_count": len(no_truth),
            "sample": no_truth[:20],
        },
        "G-HINGE": {
            "ok": len(thin_hinge) == 0,
            "thin_count": len(thin_hinge),
            "sample": thin_hinge[:20],
        },
        "G-PLACEHOLDER": {
            "ok": len(placeholders) == 0,
            "placeholder_count": len(placeholders),
            "sample": placeholders[:20],
        },
        "G-LESSON": {"ok": lesson_ok},
        "G-BOOKS": {"ok": books_ok, "pdf_count": len(pdfs)},
    }
    all_ok = all(g["ok"] for g in gates.values())
    report = {
        "all_green": all_ok,
        "usable": len(usable),
        "bank_total": len(bank),
        "gates": gates,
        "rule": "docs/RED_LINE_NO_SLACK.md",
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    outp = ROOT / "data" / "generated" / "phase_truth" / "GATE_NO_SLACK.json"
    outp.parent.mkdir(parents=True, exist_ok=True)
    outp.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
