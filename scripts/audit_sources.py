#!/usr/bin/env python3
"""Master source gate: registry + video catalog + lessons + stream import status.

Usage:
  python3 scripts/audit_sources.py
  python3 scripts/audit_sources.py --json

Exit 0 = PASS.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data" / "raw" / "SOURCE_REGISTRY.json"
CATALOG = ROOT / "data" / "generated" / "video_catalog.json"
STREAM = ROOT / "data" / "raw" / "google_doc_stream_abtal.txt"
STREAM_JSON = ROOT / "data" / "generated" / "premium_stream_july2026.json"
LESSONS = ROOT / "data" / "lessons.js"
QUESTIONS = ROOT / "data" / "questions.js"
VIDEO_ROOT = Path("/data/prometric/prometric")
BUILD_CAT = ROOT / "scripts" / "build_video_catalog.py"


def extract_lesson_videos(src: str) -> dict[int, list[str]]:
    days: dict[int, list[str]] = {}
    for m in re.finditer(
        r"\{\s*day:\s*(\d+),\s*title:\s*\"([^\"]+)\"([\s\S]*?)(?=\n  \{\s*day:|\n\];?\s*$)",
        src,
    ):
        day = int(m.group(1))
        body = m.group(3)
        vids = []
        vm = re.search(r"videos:\s*\[([\s\S]*?)\]", body)
        if vm and vm.group(1).strip():
            for fm in re.finditer(r'file:\s*"([^"]+)"', vm.group(1)):
                vids.append(fm.group(1))
        days[day] = vids
    return days


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--rebuild-catalog", action="store_true", default=True)
    args = ap.parse_args()

    issues: list[dict] = []
    info: dict = {"checks": []}

    # --- registry ---
    if not REGISTRY.exists():
        issues.append({"code": "no_registry", "msg": "SOURCE_REGISTRY.json missing"})
        reg = {}
    else:
        reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
        info["checks"].append("registry_present")
        for d in reg.get("drives", []):
            if not d.get("url"):
                issues.append({"code": "drive_url", "msg": f"Drive {d.get('id')} missing url"})
        for doc in reg.get("docs", []):
            if doc.get("id") == "stream_abtal" and not doc.get("local_export"):
                issues.append({"code": "stream_export_path", "msg": "stream doc missing local_export"})

    # --- rebuild catalog ---
    if args.rebuild_catalog and BUILD_CAT.exists():
        r = subprocess.run(
            [sys.executable, str(BUILD_CAT)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            issues.append(
                {
                    "code": "catalog_build",
                    "msg": (r.stderr or r.stdout or "catalog build failed")[:300],
                }
            )
        else:
            info["checks"].append("catalog_rebuilt")

    if not CATALOG.exists():
        issues.append({"code": "no_catalog", "msg": "video_catalog.json missing — run build_video_catalog.py"})
        cat = {}
    else:
        cat = json.loads(CATALOG.read_text(encoding="utf-8"))
        info["disk_videos"] = cat.get("total_on_disk")
        if cat.get("orphans_on_disk"):
            issues.append(
                {
                    "code": "orphan_videos",
                    "msg": f"Orphan videos on disk: {cat['orphans_on_disk']}",
                }
            )
        if cat.get("missing_from_disk"):
            issues.append(
                {
                    "code": "missing_videos",
                    "msg": f"Catalog files missing on disk: {cat['missing_from_disk']}",
                }
            )

    # --- lessons vs registry day map ---
    lesson_vids = extract_lesson_videos(LESSONS.read_text(encoding="utf-8"))
    day_map = (reg.get("day_video_map") or {}).get("days") or {}
    for day_s, meta in day_map.items():
        day = int(day_s)
        expected_files = (cat.get("day_map") or {}).get(day_s, {}).get("files") or []
        actual = lesson_vids.get(day, [])
        if set(expected_files) != set(actual):
            # order-sensitive compare for packaging
            if expected_files != actual:
                issues.append(
                    {
                        "code": "day_video_mismatch",
                        "day": day,
                        "msg": (
                            f"Day {day}: lessons has {len(actual)} files, "
                            f"catalog/registry expects {len(expected_files)}"
                        ),
                        "expected": expected_files,
                        "actual": actual,
                    }
                )
        # every listed file exists
        for f in actual:
            if not (VIDEO_ROOT / f).is_file():
                issues.append(
                    {
                        "code": "lesson_file_missing",
                        "day": day,
                        "msg": f"Day {day} missing on disk: {f}",
                    }
                )

    info["lesson_video_total"] = sum(len(v) for v in lesson_vids.values())

    # --- stream ---
    if not STREAM.exists():
        issues.append({"code": "no_stream_export", "msg": "google_doc_stream_abtal.txt missing"})
    else:
        info["checks"].append("stream_export_present")
        info["stream_bytes"] = STREAM.stat().st_size
        if STREAM.stat().st_size < 500:
            issues.append({"code": "stream_empty", "msg": "stream export too small"})

    if STREAM_JSON.exists():
        sj = json.loads(STREAM_JSON.read_text(encoding="utf-8"))
        info["stream_parsed_count"] = len(sj)
        info["checks"].append("stream_json_present")
        # count how many stream ids are in bank
        qsrc = QUESTIONS.read_text(encoding="utf-8")
        in_bank = sum(1 for item in sj if item.get("id") and item["id"] in qsrc)
        info["stream_ids_in_bank"] = in_bank
        if in_bank < len(sj) * 0.5:
            issues.append(
                {
                    "code": "stream_not_merged",
                    "msg": f"Only {in_bank}/{len(sj)} stream MCQs appear in questions.js — run import_stream_mcqs.py --merge",
                }
            )
        else:
            info["checks"].append("stream_mostly_in_bank")
    else:
        issues.append(
            {
                "code": "no_stream_json",
                "msg": "premium_stream_july2026.json missing — run import_stream_mcqs.py",
            }
        )

    # --- Drive read log ---
    log = ROOT / "data" / "raw" / "DRIVE_SOURCES_READ.md"
    if not log.exists():
        issues.append({"code": "no_drive_log", "msg": "DRIVE_SOURCES_READ.md missing"})
    else:
        info["checks"].append("drive_log_present")

    ok = len(issues) == 0
    report = {"pass": ok, "issues": issues, "info": info}

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print("=== Source audit ===")
        for c in info.get("checks", []):
            print(f"  OK  {c}")
        print(f"  Disk videos: {info.get('disk_videos')}")
        print(f"  Lessons videos: {info.get('lesson_video_total')}")
        print(f"  Stream parsed: {info.get('stream_parsed_count')} · in bank: {info.get('stream_ids_in_bank')}")
        if issues:
            print(f"\nFAIL: {len(issues)} issue(s)")
            for iss in issues:
                print(f"  · [{iss['code']}] {iss['msg']}")
        else:
            print("\nPASS: sources, catalog, lessons, stream aligned.")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
