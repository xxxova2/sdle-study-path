#!/usr/bin/env python3
"""Print character counts for generated day reading HTML fragments."""
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "data" / "generated"
for name in ("day05_reading.html", "day06_reading.html"):
    p = root / name
    text = p.read_text(encoding="utf-8")
    print(f"{name}: {len(text)} chars ({p.stat().st_size} bytes)")
