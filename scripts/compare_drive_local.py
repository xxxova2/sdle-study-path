#!/usr/bin/env python3
"""List public Drive prometric tree (no download) and compare to local folder.

Uses embeddedfolderview HTML only — surfaces names/paths, does not download videos.

Usage:
  python3 scripts/compare_drive_local.py
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from html import unescape
from pathlib import Path

ROOT_ID = "1_2pMWMnyvAnmGpcAMMO_9TfVvf58cLJb"
LOCAL = Path("/data/prometric/prometric")
OUT = Path(__file__).resolve().parents[1] / "data" / "raw" / "DRIVE_VS_LOCAL.json"
MD = Path(__file__).resolve().parents[1] / "data" / "raw" / "DRIVE_VS_LOCAL.md"

# Subject folder IDs (from public Drive root listing)
SUBJECTS = {
    "endo": "1wB2RiLRi7bub0Acabe3MwzAK_ZpX6g4a",
    "ethics": "1HXjyy5of5zmm5EVw-5s1Q_xOht0TiPgw",
    "operative": "121Q0HDhKcfk90h6Tcn1z_4YjjzPLwgME",
    "ortho and pedo": "1oXhCsUEhSv7xlg84-kDPHUPd6kGw5qVV",
    "perio": "14b7Zco3bus2lykE2NUthpR0KvnKeofDE",
    "prostho": "1IAJMBszoQd2lL3AIJ-TofR9LqxUxlWeY",
    "surgery": "1LECCGORvieQRWCrdiA6eWP4ILM-Y2sxt",
    "مدسن وباثولوجي": "15UaV8szD5LofxXmTL9OCQVWQmv91_y0U",
}

UA = {"User-Agent": "Mozilla/5.0"}


def get(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def list_embed(fid: str) -> list[dict]:
    html = get(f"https://drive.google.com/embeddedfolderview?id={fid}#list")
    items = []
    for m in re.finditer(
        r'id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?href="(https://drive\.google\.com/[^"]+)"[\s\S]*?class="flip-entry-title">([^<]+)</div>',
        html,
    ):
        href, name = m.group(2), unescape(m.group(3)).strip()
        if "/folders/" in href:
            kind = "folder"
            eid = re.search(r"/folders/([a-zA-Z0-9_-]+)", href).group(1)
        elif "/file/d/" in href:
            kind = "file"
            eid = re.search(r"/file/d/([a-zA-Z0-9_-]+)", href).group(1)
        else:
            kind = "folder"
            eid = m.group(1)
        items.append({"id": eid, "name": name, "kind": kind})
    return items


def npath(p: str) -> str:
    return "/".join(s.strip() for s in p.split("/"))


def main() -> int:
    drive_mp4: list[str] = []
    for sname, sid in SUBJECTS.items():
        kids = list_embed(sid)
        for k in kids:
            kn = k["name"].strip()
            if k["kind"] == "folder":
                for f in list_embed(k["id"]):
                    fn = f["name"].strip()
                    if fn.lower().endswith(".mp4"):
                        drive_mp4.append(npath(f"{sname}/{kn}/{fn}"))
            elif kn.lower().endswith(".mp4"):
                drive_mp4.append(npath(f"{sname}/{kn}"))

    local = [
        npath(p.relative_to(LOCAL).as_posix())
        for p in LOCAL.rglob("*.mp4")
    ]
    dset, lset = set(drive_mp4), set(local)
    only_l = sorted(lset - dset)
    only_d = sorted(dset - lset)
    report = {
        "method": "public embeddedfolderview list only (no download)",
        "drive_url": f"https://drive.google.com/drive/folders/{ROOT_ID}",
        "counts": {
            "drive_mp4": len(dset),
            "local_mp4": len(lset),
            "match": len(dset & lset),
            "only_local": len(only_l),
            "only_drive": len(only_d),
        },
        "only_local": only_l,
        "only_drive": only_d,
        "drive_mp4": sorted(dset),
        "local_mp4": sorted(lset),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ok = not only_l and not only_d
    MD.write_text(
        f"# Drive vs local\n\n"
        f"Method: list-only (no download). Drive mp4={len(dset)} local={len(lset)} match={len(dset & lset)}\n\n"
        f"{'**MATCH**' if ok else '**DIFF**'}\n",
        encoding="utf-8",
    )
    print(json.dumps(report["counts"], indent=2))
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
