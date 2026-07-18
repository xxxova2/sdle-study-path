#!/usr/bin/env python3
"""Scan local prometric/ videos → pedagogical catalog (part 1→2→3, not alpha).

Writes data/generated/video_catalog.json
Also validates against SOURCE_REGISTRY day_video_map folders.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO_ROOT = Path("/data/prometric/prometric")
OUT = ROOT / "data" / "generated" / "video_catalog.json"
REGISTRY = ROOT / "data" / "raw" / "SOURCE_REGISTRY.json"

# Arabic ordinals sometimes used in filenames (for lec number hints only)
PART_PATTERNS = [
    (re.compile(r"الجزء\s*الاول|الجزء\s*الأول|الول\b|part\s*1", re.I), 1),
    (re.compile(r"الجزء\s*الثاني|part\s*2", re.I), 2),
    (re.compile(r"الجزء\s*الثالث|جزظء\s*الثالث|part\s*3", re.I), 3),
    (re.compile(r"الجزء\s*الرابع|part\s*4", re.I), 4),
]


def part_order(name: str) -> tuple[int, str]:
    """Return (part_num, name). Bare lecture file (no جزء) = part 1."""
    for pat, n in PART_PATTERNS:
        if pat.search(name):
            return (n, name)
    # bare "المحاضره العشرون.mp4" style → treat as part 1
    if "جزء" not in name and "part" not in name.lower():
        return (1, name)
    return (99, name)


def list_folder_videos(folder: Path) -> list[dict]:
    files = [
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in {".mp4", ".mkv", ".avi", ".mov", ".webm"}
    ]
    ranked = sorted(files, key=lambda p: part_order(p.name))
    out = []
    for i, p in enumerate(ranked, 1):
        po, _ = part_order(p.name)
        out.append(
            {
                "file": str(p.relative_to(VIDEO_ROOT)).replace("\\", "/"),
                "name": p.name,
                "part": po if po != 99 else None,
                "order_in_folder": i,
            }
        )
    return out


def main() -> int:
    if not VIDEO_ROOT.is_dir():
        print(f"FAIL: video root missing: {VIDEO_ROOT}", file=sys.stderr)
        return 1

    reg = json.loads(REGISTRY.read_text(encoding="utf-8")) if REGISTRY.exists() else {}
    subjects = []
    all_files: list[str] = []

    # Walk course tree from registry if present, else full walk
    tree = reg.get("course_video_tree", {}).get("subjects")
    if tree:
        for sub in tree:
            path = VIDEO_ROOT / sub["path"]
            entry = {
                "id": sub["id"],
                "path": sub["path"],
                "lectures": [],
            }
            if sub.get("lectures"):
                for lec in sub["lectures"]:
                    lec_path = path / lec
                    vids = list_folder_videos(lec_path) if lec_path.is_dir() else []
                    for v in vids:
                        all_files.append(v["file"])
                    entry["lectures"].append(
                        {
                            "id": lec,
                            "rel": f"{sub['path']}/{lec}",
                            "videos": vids,
                            "count": len(vids),
                        }
                    )
            else:
                # ethics-style flat folder
                vids = list_folder_videos(path) if path.is_dir() else []
                for v in vids:
                    all_files.append(v["file"])
                entry["lectures"].append(
                    {
                        "id": ".",
                        "rel": sub["path"],
                        "videos": vids,
                        "count": len(vids),
                    }
                )
            subjects.append(entry)
    else:
        for p in sorted(VIDEO_ROOT.rglob("*")):
            if p.is_file() and p.suffix.lower() in {".mp4", ".mkv", ".avi", ".mov", ".webm"}:
                all_files.append(str(p.relative_to(VIDEO_ROOT)).replace("\\", "/"))

    # Day packaging with ordered files
    day_map = {}
    for day, meta in (reg.get("day_video_map") or {}).get("days", {}).items():
        files: list[str] = []
        for folder in meta.get("folders", []):
            fp = VIDEO_ROOT / folder
            if fp.is_dir():
                for v in list_folder_videos(fp):
                    files.append(v["file"])
            elif fp.is_file():
                files.append(str(fp.relative_to(VIDEO_ROOT)).replace("\\", "/"))
        day_map[str(day)] = {
            "focus": meta.get("focus"),
            "folders": meta.get("folders", []),
            "files": files,
            "count": len(files),
        }

    # Orphans: on disk but not in catalog subjects
    disk_all = {
        str(p.relative_to(VIDEO_ROOT)).replace("\\", "/")
        for p in VIDEO_ROOT.rglob("*")
        if p.is_file() and p.suffix.lower() in {".mp4", ".mkv", ".avi", ".mov", ".webm"}
    }
    catalog_set = set(all_files)
    orphans = sorted(disk_all - catalog_set)
    missing = sorted(catalog_set - disk_all)

    catalog = {
        "video_root": str(VIDEO_ROOT),
        "total_on_disk": len(disk_all),
        "total_in_catalog": len(catalog_set),
        "orphans_on_disk": orphans,
        "missing_from_disk": missing,
        "subjects": subjects,
        "day_map": day_map,
        "watch_order_note": "Within each lecture folder, order is part 1→2→3 (not alpha/Drive UI).",
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    print(f"Disk={len(disk_all)} catalog={len(catalog_set)} orphans={len(orphans)} missing={len(missing)}")
    for d, m in day_map.items():
        print(f"  Day {d:>2}: {m['count']:2d} files · {m['focus']}")
    if orphans or missing:
        print("WARN: orphan or missing files", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
