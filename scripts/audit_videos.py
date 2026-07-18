#!/usr/bin/env python3
"""Verify every lessons.js video path exists on disk and covers all course files.

Usage:
  python3 scripts/audit_videos.py
  python3 scripts/audit_videos.py --json

Exit 0 = PASS (all listed files exist, no orphan course videos, order labels OK).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LESSONS = ROOT / "data" / "lessons.js"
VIDEO_ROOT = Path("/data/prometric/prometric")

# Expected day → lecture folders (course sequence)
EXPECTED = {
    1: ["operative/lec.19", "operative/lec.20", "operative/lec.21"],
    2: ["prostho/lec.9", "prostho/lec.10", "prostho/lec.11"],
    3: ["prostho/lec.12", "prostho/lec.13", "prostho/lec.14"],
    4: [],
    5: ["perio/lec.5", "perio/lec.6", "perio/lec.7", "perio/lec.8"],
    6: ["endo/lec.1", "endo/lec.2", "endo/lec.3", "endo/lec.4"],
    7: ["surgery/lec.15", "surgery/lec.16", "surgery/lec.17", "surgery/lec.18"],
    8: ["مدسن وباثولوجي/lec.23", "مدسن وباثولوجي/lec.24", "ethics"],
    9: ["ortho and pedo/lec.22"],
}


def extract_days(src: str) -> list[dict]:
    days = []
    for m in re.finditer(
        r"\{\s*day:\s*(\d+),\s*title:\s*\"([^\"]+)\"([\s\S]*?)(?=\n  \{\s*day:|\n\];?\s*$)",
        src,
    ):
        day = int(m.group(1))
        title = m.group(2)
        body = m.group(3)
        vids = []
        vm = re.search(r"videos:\s*\[([\s\S]*?)\]", body)
        if vm and vm.group(1).strip():
            for fm in re.finditer(
                r'file:\s*"([^"]+)"\s*,\s*label:\s*"([^"]*)"', vm.group(1)
            ):
                vids.append({"file": fm.group(1), "label": fm.group(2)})
        note_m = re.search(r'videoNote:\s*"([^"]*)"', body)
        days.append(
            {
                "day": day,
                "title": title,
                "videos": vids,
                "videoNote": note_m.group(1) if note_m else None,
            }
        )
    return days


def disk_videos() -> list[str]:
    out = []
    for p in sorted(VIDEO_ROOT.rglob("*")):
        if p.is_file() and p.suffix.lower() in {".mp4", ".mkv", ".avi", ".mov", ".webm"}:
            out.append(str(p.relative_to(VIDEO_ROOT)).replace("\\", "/"))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    src = LESSONS.read_text(encoding="utf-8")
    days = extract_days(src)
    disk = disk_videos()
    disk_set = set(disk)

    issues = []
    listed = []
    summary = []

    for d in days:
        day = d["day"]
        vids = d["videos"]
        for i, v in enumerate(vids, 1):
            listed.append(v["file"])
            if v["file"] not in disk_set:
                issues.append(
                    {
                        "day": day,
                        "code": "missing_file",
                        "msg": f"Day {day} video missing on disk: {v['file']}",
                    }
                )
            pref = f"{i}/{len(vids)}"
            if vids and not v["label"].startswith(pref):
                issues.append(
                    {
                        "day": day,
                        "code": "label_order",
                        "msg": f"Day {day} video {i} label should start with {pref}: {v['label'][:60]}",
                    }
                )
        # folder coverage
        exp = EXPECTED.get(day, [])
        for folder in exp:
            if folder == "ethics":
                # single file folder
                if not any(f.startswith("ethics/") for f in (v["file"] for v in vids)):
                    issues.append(
                        {
                            "day": day,
                            "code": "missing_folder",
                            "msg": f"Day {day} expected ethics/ video",
                        }
                    )
                continue
            disk_in = [f for f in disk if f.startswith(folder + "/")]
            list_in = [v["file"] for v in vids if v["file"].startswith(folder + "/")]
            if set(disk_in) != set(list_in):
                issues.append(
                    {
                        "day": day,
                        "code": "folder_mismatch",
                        "msg": (
                            f"Day {day} {folder}: disk={len(disk_in)} listed={len(list_in)} "
                            f"only_disk={set(disk_in)-set(list_in)} only_list={set(list_in)-set(disk_in)}"
                        ),
                    }
                )
        if day in (1, 2, 3, 5, 6, 7, 8, 9) and vids and not d.get("videoNote"):
            issues.append(
                {
                    "day": day,
                    "code": "missing_note",
                    "msg": f"Day {day} has videos but no videoNote",
                }
            )
        summary.append(
            {
                "day": day,
                "title": d["title"],
                "count": len(vids),
                "note": bool(d.get("videoNote")),
            }
        )

    orphans = [f for f in disk if f not in set(listed)]
    for f in orphans:
        issues.append(
            {
                "day": 0,
                "code": "orphan_disk",
                "msg": f"On disk but not assigned to any day: {f}",
            }
        )

    if args.json:
        print(json.dumps({"summary": summary, "issues": issues, "disk": len(disk)}, indent=2))
    else:
        print("=== Video audit ===")
        print(f"Disk videos: {len(disk)} · Listed in lessons: {len(listed)}")
        for s in summary:
            if s["count"] or s["day"] <= 9:
                print(
                    f"  Day {s['day']:2d}  n={s['count']:2d}  note={'Y' if s['note'] else '-'}  {s['title'][:50]}"
                )
        if issues:
            print(f"\nISSUES ({len(issues)}):")
            for i in issues:
                print(f"  [{i['code']}] {i['msg']}")
            print("\nFAIL")
            return 1
        print("\nPASS: all videos exist, no orphans, sequence labels OK.")
        return 0
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
