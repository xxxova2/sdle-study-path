#!/usr/bin/env python3
"""Merge generated day readings + premium MCQ banks into lessons.js / questions.js."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "data" / "generated"
LESSONS = ROOT / "data" / "lessons.js"
QUESTIONS = ROOT / "data" / "questions.js"
STATS = ROOT / "analysis" / "bank_stats.json"


def replace_day_reading(lessons_src: str, day: int, html: str) -> str:
    """Replace the reading: `...` block for a given day number."""
    # Find day: N then reading: `...`
    day_pat = re.compile(
        rf"(day:\s*{day},\s*\n(?:.*\n)*?\s*reading:\s*`)([\s\S]*?)(`)",
        re.MULTILINE,
    )
    m = day_pat.search(lessons_src)
    if not m:
        raise SystemExit(f"Could not find reading block for day {day}")
    # Normalize HTML: ensure leading newline for template readability
    body = html.strip()
    if not body.startswith("\n"):
        body = "\n" + body
    if not body.endswith("\n"):
        body = body + "\n"
    # Escape backticks in content if any
    body = body.replace("`", "'")
    return lessons_src[: m.start(2)] + body + lessons_src[m.end(2) :]


def load_json_array(path: Path) -> list:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit(f"{path} is not a JSON array")
    return data


def append_questions(q_src: str, new_items: list) -> str:
    # Find trailing ]; of QUESTION_BANK
    src = q_src.rstrip()
    if not src.endswith("];"):
        # allow ]; with trailing newline only
        if src.endswith("]"):
            src = src + ";"
        else:
            raise SystemExit("questions.js does not end with ];")
    # Insert before final ]
    idx = src.rfind("]")
    before = src[:idx].rstrip()
    if before.endswith(","):
        glue = "\n"
    else:
        glue = ",\n"
    chunk = json.dumps(new_items, ensure_ascii=False, indent=2)
    # strip outer [ ]
    inner = chunk.strip()
    if inner.startswith("["):
        inner = inner[1:]
    if inner.endswith("]"):
        inner = inner[:-1]
    return before + glue + inner.strip() + "\n];\n"


def main() -> None:
    days = [2, 3, 4, 5, 6, 7, 8, 9]
    lessons = LESSONS.read_text(encoding="utf-8")
    for d in days:
        path = GEN / f"day{d:02d}_reading.html"
        if not path.exists():
            print(f"SKIP missing {path.name}")
            continue
        html = path.read_text(encoding="utf-8")
        print(f"Day {d}: {len(html)} chars from {path.name}")
        lessons = replace_day_reading(lessons, d, html)
    LESSONS.write_text(lessons, encoding="utf-8")
    print(f"Wrote {LESSONS}")

    banks = [
        "premium_perio.json",
        "premium_endo.json",
        "premium_ortho_pedo.json",
        "premium_ethics.json",
        "premium_fixed_rpd.json",
    ]
    new_all: list = []
    for name in banks:
        p = GEN / name
        if not p.exists():
            print(f"SKIP missing {name}")
            continue
        items = load_json_array(p)
        print(f"{name}: {len(items)} items")
        new_all.extend(items)

    if new_all:
        # Dedup by id against existing
        existing = QUESTIONS.read_text(encoding="utf-8")
        existing_ids = set(re.findall(r'"id":\s*"([^"]+)"', existing))
        filtered = [q for q in new_all if q.get("id") not in existing_ids]
        skipped = len(new_all) - len(filtered)
        if skipped:
            print(f"Skipped {skipped} duplicate ids")
        merged = append_questions(existing, filtered)
        QUESTIONS.write_text(merged, encoding="utf-8")
        print(f"Appended {len(filtered)} questions → {QUESTIONS}")

        # Update stats roughly
        topics: dict[str, int] = {}
        sources: dict[str, int] = {}
        for m in re.finditer(r'"topic":\s*"([^"]+)"', merged):
            topics[m.group(1)] = topics.get(m.group(1), 0) + 1
        for m in re.finditer(r'"source":\s*"([^"]+)"', merged):
            sources[m.group(1)] = sources.get(m.group(1), 0) + 1
        total = sum(topics.values())
        op_tag = len(re.findall(r'"operative"', merged))
        STATS.parent.mkdir(parents=True, exist_ok=True)
        STATS.write_text(
            json.dumps(
                {
                    "total": total,
                    "by_topic": dict(sorted(topics.items(), key=lambda x: -x[1])),
                    "by_source": dict(sorted(sources.items(), key=lambda x: -x[1])),
                    "operative_tagged": op_tag,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"Stats: total={total} topics={topics}")
    else:
        print("No MCQ banks to merge")

    # re-measure readings
    lessons2 = LESSONS.read_text(encoding="utf-8")
    for m in re.finditer(r"day:\s*(\d+),\s*\n[\s\S]*?reading:\s*`([\s\S]*?)`", lessons2):
        print(f"  reading Day {m.group(1)}: {len(m.group(2))} chars")


if __name__ == "__main__":
    main()
