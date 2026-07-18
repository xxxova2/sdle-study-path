#!/usr/bin/env python3
"""Fail if pomodoro READ claims exceed real lesson depth (the Day-1 A–D bug class).

Usage:
  python3 scripts/audit_lesson_depth.py
  python3 scripts/audit_lesson_depth.py --json

Standards (content days 1–9):
  - Total reading words ≥ MIN_WORDS_DAY (active study ~1.8× pure read @ 120 wpm)
  - For each claimed "read" block of N minutes, the assigned sections must
    support ≥ 55% of N as active study minutes (prevents 45′ labels on 3′ bullets)
  - Mock days 10–14: reading must NOT claim multi-hour textbook reads
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "data" / "lessons.js"

# Pure reading pace for dense medical bullets (words/min)
WPM = 120
# ADHD active multiplier: STOPs + write gates + bold re-pass
ACTIVE_MULT = 1.8
# Claimed read time may not exceed active estimate by more than this ratio inverse
# active >= claim * MIN_COVERAGE  (e.g. 45′ claim needs ≥ ~25′ active ≈ 0.55×)
MIN_COVERAGE = 0.55
# Absolute floor for content days (after Day-1 expansion bar)
MIN_WORDS_CONTENT = 3200
MIN_CHARS_CONTENT = 22000
# In-lesson exam Q&A gates (Day 1: A–B; Days 2–3: A–B–C; expand 4–9 later)
MIN_EQ_PER_BLOCK = 5
MIN_OPTS_PER_EQ = 4
MIN_STEM_WORDS = 12
MIN_HINGE_WORDS = 8
EXAM_QA_BLOCKS = {
    1: ("A", "B"),
    2: ("A", "B", "C"),
    3: ("A", "B", "C"),
    4: ("A", "B"),
    5: ("A", "B", "C"),
    6: ("A", "B", "C"),
    7: ("A", "B", "C"),
    8: ("A", "B", "C"),
    9: ("A", "B", "C"),
}


def extract_days(src: str) -> list[dict]:
    days = []
    # reading template literals
    for m in re.finditer(
        r"\{\s*day:\s*(\d+),\s*title:\s*\"([^\"]+)\"[\s\S]*?reading:\s*`([\s\S]*?)`\s*,\s*videos:",
        src,
    ):
        day = int(m.group(1))
        title = m.group(2)
        html = m.group(3)
        days.append({"day": day, "title": title, "html": html})
    return days


def strip_tags(html: str) -> str:
    t = re.sub(r"<[^>]+>", " ", html)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def word_count(html: str) -> int:
    t = strip_tags(html)
    return len([w for w in t.split(" ") if w])


def section_map(html: str) -> list[tuple[str, int, int]]:
    """Return list of (letter, start, end) for h3 sections A. B. ..."""
    idxs = []
    for m in re.finditer(r"<h3>([A-Z])\.[^<]*</h3>", html):
        idxs.append((m.group(1), m.start()))
    out = []
    for i, (letter, start) in enumerate(idxs):
        end = idxs[i + 1][1] if i + 1 < len(idxs) else len(html)
        out.append((letter, start, end))
    return out


def words_in_range(html: str, start: int, end: int) -> int:
    return word_count(html[start:end])


def parse_read_claims(html: str) -> list[dict]:
    """Extract read blocks with optional section ranges.

    Patterns:
      Block A 45 min — Read sections A–D ...
      Block A 45 min — Read A–D ...
      A 45′ read A–D
      Block A 40 min — Read full Day‑4 page once (A–J)
    """
    claims = []
    # List-style blocks
    for m in re.finditer(
        r"<li><b>Block\s+([A-H])\s+(\d+)(?:–(\d+))?\s*min</b>\s*[—\-]\s*([^<]+)</li>",
        html,
        re.I,
    ):
        text = m.group(4)
        if not re.search(r"read|Read|page|A–|A-", text):
            continue
        lo = int(m.group(2))
        hi = int(m.group(3) or m.group(2))
        mins = (lo + hi) // 2
        rng = re.search(r"([A-Z])\s*[–\-]\s*([A-Z])", text)
        full = bool(re.search(r"full|once|entire|whole\s+page", text, re.I))
        claims.append(
            {
                "block": m.group(1),
                "mins": mins,
                "from": rng.group(1) if rng else None,
                "to": rng.group(2) if rng else None,
                "full": full or (rng is None),
                "raw": text.strip()[:80],
            }
        )
    # Compact one-liner: A 45′ read A–D
    for m in re.finditer(
        r"\b([A-H])\s+(\d+)′\s*read\s+([A-Z])\s*[–\-]\s*([A-Z])",
        html,
    ):
        claims.append(
            {
                "block": m.group(1),
                "mins": int(m.group(2)),
                "from": m.group(3),
                "to": m.group(4),
                "full": False,
                "raw": m.group(0),
            }
        )
    return claims


def letters_between(a: str, b: str) -> set[str]:
    return {chr(c) for c in range(ord(a), ord(b) + 1)}


def active_minutes(words: int) -> float:
    return (words / WPM) * ACTIVE_MULT


def audit_day(d: dict) -> list[dict]:
    issues = []
    day, title, html = d["day"], d["title"], d["html"]
    words = word_count(html)
    chars = len(html)
    secs = section_map(html)

    if 1 <= day <= 9:
        if words < MIN_WORDS_CONTENT:
            issues.append(
                {
                    "day": day,
                    "sev": "bug",
                    "code": "thin_day",
                    "msg": f"Day {day} only {words} words (<{MIN_WORDS_CONTENT}). Title={title}",
                }
            )
        if chars < MIN_CHARS_CONTENT:
            issues.append(
                {
                    "day": day,
                    "sev": "bug",
                    "code": "thin_chars",
                    "msg": f"Day {day} only {chars} chars (<{MIN_CHARS_CONTENT})",
                }
            )

        claims = parse_read_claims(html)
        for c in claims:
            if c["full"] or not c["from"]:
                w = words
            else:
                want = letters_between(c["from"], c["to"])
                w = 0
                for letter, start, end in secs:
                    if letter in want:
                        w += words_in_range(html, start, end)
            act = active_minutes(w)
            need = c["mins"] * MIN_COVERAGE
            if act < need:
                issues.append(
                    {
                        "day": day,
                        "sev": "bug",
                        "code": "pomo_lie",
                        "msg": (
                            f"Day {day} Block {c['block']} claims {c['mins']}′ read "
                            f"({c['from'] or '?'}-{c['to'] or 'full'}) but ~{w} words "
                            f"≈ {act:.0f}′ active (need ≥{need:.0f}′). Raw: {c['raw']}"
                        ),
                    }
                )

    if 10 <= day <= 14:
        # Mock/light days must not fake textbook blocks
        if re.search(r"Block\s+[A-C]\s+4[05]\s*min[^<]{0,40}[Rr]ead", html):
            issues.append(
                {
                    "day": day,
                    "sev": "bug",
                    "code": "mock_pomo",
                    "msg": f"Day {day} is mock/light but claims 40–45′ read blocks",
                }
            )
        claims = parse_read_claims(html)
        for c in claims:
            if c["mins"] >= 40:
                issues.append(
                    {
                        "day": day,
                        "sev": "bug",
                        "code": "mock_pomo",
                        "msg": f"Day {day} claims {c['mins']}′ read on mock/light day",
                    }
                )

    # Full exam-form + Q&A after read blocks (thin Q&A = fail)
    if day in EXAM_QA_BLOCKS:
        for block in EXAM_QA_BLOCKS[day]:
            form = re.search(
                rf'<section class="exam-form"[^>]*data-block="{block}"[^>]*>[\s\S]*?</section>',
                html,
            )
            qa = re.search(
                rf'<section class="exam-qa"[^>]*data-block="{block}"[^>]*>[\s\S]*?</section>',
                html,
            )
            if not form:
                issues.append(
                    {
                        "day": day,
                        "sev": "bug",
                        "code": "missing_exam_form",
                        "msg": f"Day {day} missing exam-form section for Block {block}",
                    }
                )
            if not qa:
                issues.append(
                    {
                        "day": day,
                        "sev": "bug",
                        "code": "missing_exam_qa",
                        "msg": f"Day {day} missing exam-qa section for Block {block}",
                    }
                )
                continue
            body = qa.group(0)
            articles = re.findall(
                r'<article class="eq"[^>]*>[\s\S]*?</article>', body
            )
            if len(articles) < MIN_EQ_PER_BLOCK:
                issues.append(
                    {
                        "day": day,
                        "sev": "bug",
                        "code": "thin_exam_qa",
                        "msg": (
                            f"Day {day} Block {block} has {len(articles)} exam Qs "
                            f"(need ≥{MIN_EQ_PER_BLOCK})"
                        ),
                    }
                )
            for i, art in enumerate(articles, 1):
                stem_m = re.search(
                    r'class="exam-stem"[^>]*>([\s\S]*?)</p>', art
                )
                stem = strip_tags(stem_m.group(1)) if stem_m else ""
                sw = len([w for w in stem.split(" ") if w])
                if sw < MIN_STEM_WORDS:
                    issues.append(
                        {
                            "day": day,
                            "sev": "bug",
                            "code": "thin_stem",
                            "msg": f"Day {day} Block {block} Q{i} stem too short ({sw} words)",
                        }
                    )
                opts_block = re.search(
                    r'<ol class="exam-opts"[\s\S]*?</ol>', art
                )
                opts = (
                    re.findall(r"<li>([\s\S]*?)</li>", opts_block.group(0))
                    if opts_block
                    else []
                )
                if len(opts) < MIN_OPTS_PER_EQ:
                    issues.append(
                        {
                            "day": day,
                            "sev": "bug",
                            "code": "thin_options",
                            "msg": f"Day {day} Block {block} Q{i} has {len(opts)} options (need 4)",
                        }
                    )
                if "Answer:" not in art:
                    issues.append(
                        {
                            "day": day,
                            "sev": "bug",
                            "code": "missing_answer",
                            "msg": f"Day {day} Block {block} Q{i} missing Answer line",
                        }
                    )
                hinge_m = re.search(
                    r"Hinge:</b>\s*([\s\S]*?)</p>", art
                ) or re.search(r"Hinge:</b>\s*([^<]+)", art)
                hinge = strip_tags(hinge_m.group(1)) if hinge_m else ""
                hw = len([w for w in hinge.split(" ") if w])
                if hw < MIN_HINGE_WORDS:
                    issues.append(
                        {
                            "day": day,
                            "sev": "bug",
                            "code": "thin_hinge",
                            "msg": f"Day {day} Block {block} Q{i} hinge too short ({hw} words)",
                        }
                    )

    return issues


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    src = LESSONS.read_text(encoding="utf-8")
    days = extract_days(src)
    if len(days) < 9:
        print(f"ERROR: expected ≥9 days, found {len(days)}", file=sys.stderr)
        return 2

    all_issues = []
    summary = []
    for d in days:
        w = word_count(d["html"])
        summary.append(
            {
                "day": d["day"],
                "title": d["title"],
                "words": w,
                "chars": len(d["html"]),
                "active_min": round(active_minutes(w), 1),
                "claims": parse_read_claims(d["html"]),
            }
        )
        all_issues.extend(audit_day(d))

    bugs = [i for i in all_issues if i["sev"] == "bug"]
    if args.json:
        print(json.dumps({"summary": summary, "issues": all_issues}, indent=2))
    else:
        print("=== Lesson depth audit ===")
        print(f"Standards: ≥{MIN_WORDS_CONTENT} words, ≥{MIN_CHARS_CONTENT} chars (days 1–9)")
        print(f"Coverage: active_min ≥ {MIN_COVERAGE:.0%} × claimed read min (WPM={WPM}, ×{ACTIVE_MULT})")
        print()
        for s in summary:
            flag = "OK"
            day_bugs = [i for i in bugs if i["day"] == s["day"]]
            if day_bugs:
                flag = f"FAIL×{len(day_bugs)}"
            print(
                f"  Day {s['day']:2d}  words={s['words']:5d}  chars={s['chars']:6d}  "
                f"active≈{s['active_min']:5.1f}′  {flag}  {s['title'][:40]}"
            )
        print()
        if bugs:
            print(f"ISSUES ({len(bugs)}):")
            for i in bugs:
                print(f"  [{i['code']}] {i['msg']}")
        else:
            print("PASS: no depth / pomodoro-lie issues.")

    return 1 if bugs else 0


if __name__ == "__main__":
    sys.exit(main())
