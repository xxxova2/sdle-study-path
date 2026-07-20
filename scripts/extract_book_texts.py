#!/usr/bin/env python3
"""Extract searchable text from local SDLE book PDFs into data/raw/books/text/."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKS = ROOT / "data" / "raw" / "books" / "sdle_book"
OUT = ROOT / "data" / "raw" / "books" / "text"
REPORT = ROOT / "data" / "generated" / "phase_truth" / "BOOK_TEXT_EXTRACT.json"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    pdfs = sorted(BOOKS.rglob("*.pdf"))
    for pdf in pdfs:
        rel = pdf.relative_to(BOOKS)
        dest = OUT / rel.with_suffix(".txt")
        dest.parent.mkdir(parents=True, exist_ok=True)
        entry = {"pdf": str(rel), "txt": str(dest.relative_to(ROOT)), "bytes": 0, "ok": False}
        try:
            subprocess.run(
                ["pdftotext", "-layout", str(pdf), str(dest)],
                check=False,
                capture_output=True,
                timeout=600,
            )
            if dest.exists():
                entry["bytes"] = dest.stat().st_size
                entry["ok"] = dest.stat().st_size > 200
                if not entry["ok"]:
                    entry["note"] = "empty_or_image_scan"
            else:
                entry["note"] = "no_output"
        except Exception as e:
            entry["error"] = str(e)
        results.append(entry)
        print(f"{'OK' if entry['ok'] else 'WEAK'} {rel} -> {entry['bytes']} bytes")

    report = {
        "pdf_count": len(pdfs),
        "ok_count": sum(1 for r in results if r["ok"]),
        "weak_count": sum(1 for r in results if not r["ok"]),
        "items": results,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("report", REPORT)
    print(json.dumps({k: report[k] for k in ("pdf_count", "ok_count", "weak_count")}))
    return 0 if report["ok_count"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
