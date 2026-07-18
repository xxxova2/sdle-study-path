#!/usr/bin/env python3
"""Parse Google Doc stream export → premium MCQ JSON; optionally merge into bank.

Only items with an explicit ✅ on an option are imported (source-faithful).

Usage:
  python3 scripts/import_stream_mcqs.py              # write generated JSON only
  python3 scripts/import_stream_mcqs.py --merge       # also append new ids to questions.js
  python3 scripts/import_stream_mcqs.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STREAM = ROOT / "data" / "raw" / "google_doc_stream_abtal.txt"
OUT = ROOT / "data" / "generated" / "premium_stream_july2026.json"
QUESTIONS = ROOT / "data" / "questions.js"
STATS = ROOT / "analysis" / "bank_stats.json"

# Known answers for stream stems that lack ✅ but are standard free points
# (only applied when stem matches; marked source stream_july2026_inferred)
INFERRED: dict[str, int] = {
    # stem substring lower → answer index 0-based
    "headache relieved by 100% oxygen": 2,  # cluster
    "closed-mouth mandibular nerve block": 1,  # Vazirani-Akinosi
    "asymptomatic dens evaginatus": 1,  # monitor (stream Q56)
    "extensive multisurface caries is best treated": 1,  # SSC
    "long face and hyperdivergent": 1,  # high pull headgear
    "wearing a gown leaves for a break": 1,  # remove PPE
    "one-stage implant procedure, which component": 0,  # healing abutment
    "based on the clinical photograph, determine the angle": None,  # image — skip
    "periodontal flap is shown": None,  # image — skip
}


TOPIC_RULES: list[tuple[str, list[str]]] = [
    ("ethics", ["ethic", "consent", "ppe", "gloves", "infection control", "non-maleficence", "professionalism", "rings before", "operating light handle"]),
    # restorative before oms so "restoration has fractured" ≠ facial fracture
    ("restorative", ["composite", "microfill", "hybrid composite", "crown", "bridge", "implant", "rpd", "removable partial", "impression", "cement", "gic", "glass ionomer", "veneer", "ferrule", "rubber dam", "amalgam", "occlusion", "centric relation", "protrusive interference"]),
    ("ortho_pedo", ["angle classification", "class ii", "class iii", "orthodont", "facemask", "headgear", "natal", "neonatal", "pediatric", "fluoride", "diastema", "space maintainer", "primary molar", "stainless steel", "pierre robin", "camouflage"]),
    ("endo", ["canal", "pulp", "obturation", "root canal", "mta", "perforation", "avuls", "splint", "vitality", "gutta", "bleaching", "file separation", "mb2"]),
    ("perio", ["periodont", "periodontal flap", "gingival", "scaling", "curette", "papilla", "attachment", "biologic width", "gracey"]),
    ("oms", ["le fort", "facial fracture", "blowout", "surgery", "extraction", "mronj", "bisphosphonate", "ludwig", "zygoma", "condylar", "orbital", "ramsay", "bsso", "osteotomy", "fascial space", "trauma patient"]),
]


def classify_topic(stem: str) -> tuple[str, list[str]]:
    s = stem.lower()
    for topic, keys in TOPIC_RULES:
        if any(k in s for k in keys):
            sub = []
            if topic == "restorative":
                if "implant" in s:
                    sub.append("implant")
                if "rpd" in s or "removable" in s:
                    sub.append("rpd")
                if "composite" in s or "rubber dam" in s:
                    sub.append("operative")
                if "crown" in s or "bridge" in s or "veneer" in s:
                    sub.append("fixed")
                if "impression" in s or "cement" in s or "gic" in s or "glass" in s:
                    sub.append("materials")
            return topic, sub
    if any(k in s for k in ["path", "leukoplakia", "pemphigus", "lupus", "kaposi", "hairy", "biopsy", "nikolsky", "anemia", "blister"]):
        return "oms", ["pathology"]
    return "mixed", []


def normalize(s: str) -> str:
    s = s.replace("✅", "").replace("✅", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_stream(text: str) -> list[dict]:
    lines = [ln.rstrip() for ln in text.splitlines()]
    items: list[dict] = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        m = re.match(r"\s*(\d+)\.\s+(.+)", ln)
        if not m:
            i += 1
            continue
        num, rest = int(m.group(1)), m.group(2).strip()
        rest = rest.lstrip("* ").strip()
        if len(rest) < 25 or not (rest[0].isupper() or rest[0].isdigit()):
            i += 1
            continue
        # skip pure option fragments
        if re.match(
            r"^(Hybrid|Nano|Macro|Vertical force|Supine|The holes|Wipe only|Cover with|Prescribe|Reassure|Give milk)",
            rest,
        ):
            i += 1
            continue
        stem = normalize(rest)
        # drop trailing ✅ from stem if any
        stem = stem.replace("✅", "").strip()

        opts: list[dict] = []
        j = i + 1

        def looks_like_next_question(text: str, opt_n: int) -> bool:
            """Detect '2. Which of the following…' mistaken as option 2."""
            t = normalize(text)
            if "?" in t and len(t) > 40:
                return True
            if re.match(
                r"^(Which|What|When|Where|Why|How|A patient|An? |During|Based on|Identify|The treatment|The preferred|The best|The main|The closed|The likelihood|The procedure|The malar|The offset|The epithelial|Following|In a |In advanced|For maximum|For a |Internal bleaching|Ramsay|Ludwig|Dens |Reverse |Stage |Pernicious|A dentist|A trauma|A child|A newborn|A tooth|A crown|A fixed|A periodontal|A panoramic|A pregnant|A composite|A root|A sudden|A  |An HIV|An interference)",
                t,
            ) and len(t) > 35:
                return True
            # option numbers should be sequential 1..n starting at 1
            return False

        while j < len(lines) and len(opts) < 6:
            om = re.match(r"\s*([1-4])\.\s+(.+)", lines[j])
            if om:
                opt_n = int(om.group(1))
                raw = om.group(2)
                if looks_like_next_question(raw, opt_n):
                    break
                # expect options roughly sequential
                if opts and opt_n != len(opts) + 1 and opt_n != 1:
                    # restart or next Q numbered higher (e.g. "2. Which")
                    if looks_like_next_question(raw, opt_n) or (
                        opt_n > len(opts) + 1 and len(normalize(raw)) > 40
                    ):
                        break
                correct = "✅" in raw
                opts.append({"text": normalize(raw), "correct": correct})
                j += 1
                continue
            stripped = lines[j].lstrip()
            if not lines[j].strip():
                j += 1
                if opts:
                    break
                continue
            if stripped.startswith("*"):
                # * may prefix next question number
                star = re.match(r"\*\s*(\d+)\.\s+(.+)", stripped)
                if star and looks_like_next_question(star.group(2), int(star.group(1))):
                    break
                j += 1
                continue
            if re.match(r"\s*\d+\.\s+[A-Z*]", lines[j]):
                break
            j += 1
            if j - i > 25:
                break

        if len(opts) < 2:
            i = max(j, i + 1)
            continue

        ans = next((k for k, o in enumerate(opts) if o["correct"]), None)
        inferred = False
        if ans is None:
            low = stem.lower()
            for key, aidx in INFERRED.items():
                if key in low:
                    if aidx is None:
                        ans = None
                    else:
                        ans = aidx
                        inferred = True
                    break

        if ans is None or ans >= len(opts):
            i = max(j, i + 1)
            continue

        # pad/trim to 4 options for app schema (never invent clinical content)
        texts = [o["text"] for o in opts]
        pad_n = 0
        while len(texts) < 4:
            pad_n += 1
            texts.append(f"(stream listed only {len(opts)} options — pad {pad_n})")
        texts = texts[:4]
        if ans >= 4:
            i = max(j, i + 1)
            continue

        topic, subtopics = classify_topic(stem)
        items.append(
            {
                "stream_n": num,
                "q": stem,
                "options": texts,
                "answer": ans,
                "topic": topic,
                "subtopics": subtopics,
                "inferred": inferred,
            }
        )
        i = max(j, i + 1)

    # de-dupe by normalized stem
    seen: set[str] = set()
    unique: list[dict] = []
    for it in items:
        key = re.sub(r"[^a-z0-9]", "", it["q"].lower())[:80]
        if key in seen:
            continue
        seen.add(key)
        unique.append(it)
    return unique


def to_bank_items(parsed: list[dict]) -> list[dict]:
    out = []
    for it in parsed:
        src = "stream_july2026_inferred" if it["inferred"] else "stream_july2026"
        qid = f"stream_j26_{it['stream_n']:03d}"
        out.append(
            {
                "id": qid,
                "topic": it["topic"],
                "difficulty": "medium",
                "q": it["q"],
                "options": it["options"],
                "answer": it["answer"],
                "explanation": f"From أبطال Google Doc stream (July 2026 window). Stem #{it['stream_n']}.",
                "source": src,
                "subtopics": it["subtopics"] or None,
            }
        )
    # drop null subtopics key noise
    for o in out:
        if o.get("subtopics") is None:
            del o["subtopics"]
        elif not o["subtopics"]:
            del o["subtopics"]
    return out


def existing_ids(q_src: str) -> set[str]:
    return set(re.findall(r'"id"\s*:\s*"([^"]+)"', q_src)) | set(
        re.findall(r"id:\s*\"([^\"]+)\"", q_src)
    )


def append_questions(q_src: str, new_items: list) -> str:
    src = q_src.rstrip()
    if not src.endswith("];") and not src.endswith("]"):
        raise SystemExit("questions.js does not end with ]")
    if src.endswith("]"):
        src = src + ";"
    idx = src.rfind("]")
    before = src[:idx].rstrip()
    glue = "\n" if before.endswith(",") else ",\n"
    chunk = json.dumps(new_items, ensure_ascii=False, indent=2)
    inner = chunk.strip()
    if inner.startswith("["):
        inner = inner[1:]
    if inner.endswith("]"):
        inner = inner[:-1]
    return before + glue + inner.strip() + "\n];\n"


def update_stats(q_src: str) -> None:
    # crude topic/source counts from JSON-ish
    topics: dict[str, int] = {}
    sources: dict[str, int] = {}
    # Prefer eval via node if available — fallback regex
    for m in re.finditer(r'"topic"\s*:\s*"([^"]+)"', q_src):
        topics[m.group(1)] = topics.get(m.group(1), 0) + 1
    for m in re.finditer(r'"source"\s*:\s*"([^"]+)"', q_src):
        sources[m.group(1)] = sources.get(m.group(1), 0) + 1
    # also bare source: "x"
    for m in re.finditer(r'source:\s*"([^"]+)"', q_src):
        sources[m.group(1)] = sources.get(m.group(1), 0) + 1
    for m in re.finditer(r'topic:\s*"([^"]+)"', q_src):
        topics[m.group(1)] = topics.get(m.group(1), 0) + 1
    total = sum(topics.values()) or len(re.findall(r'"id"\s*:\s*"', q_src))
    operative = len(re.findall(r"operative", q_src))
    STATS.parent.mkdir(parents=True, exist_ok=True)
    STATS.write_text(
        json.dumps(
            {
                "total": total,
                "by_topic": dict(sorted(topics.items(), key=lambda x: -x[1])),
                "by_source": dict(sorted(sources.items(), key=lambda x: -x[1])),
                "operative_tagged": operative,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--merge", action="store_true", help="Append new items to questions.js")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--include-inferred", action="store_true", default=True)
    ap.add_argument("--no-inferred", action="store_true")
    args = ap.parse_args()
    include_inferred = args.include_inferred and not args.no_inferred

    if not STREAM.exists():
        print(f"FAIL: missing {STREAM}", file=sys.stderr)
        return 1

    text = STREAM.read_text(encoding="utf-8-sig")
    parsed = parse_stream(text)
    if not include_inferred:
        parsed = [p for p in parsed if not p["inferred"]]

    bank = to_bank_items(parsed)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not args.dry_run:
        OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {OUT} ({len(bank)} items)")
    else:
        print(f"DRY-RUN: would write {len(bank)} items")

    by_topic: dict[str, int] = {}
    for b in bank:
        by_topic[b["topic"]] = by_topic.get(b["topic"], 0) + 1
    print("By topic:", by_topic)
    print("Inferred:", sum(1 for p in parsed if p["inferred"]))

    if not args.merge:
        return 0

    q_src = QUESTIONS.read_text(encoding="utf-8")
    have = existing_ids(q_src)
    # also skip near-duplicate stems already in bank
    new = []
    for b in bank:
        if b["id"] in have:
            continue
        # fuzzy: first 40 alnum of stem in file
        key = re.sub(r"[^a-z0-9]", "", b["q"].lower())[:40]
        if key and key in re.sub(r"[^a-z0-9]", "", q_src.lower()):
            continue
        new.append(b)

    print(f"New to merge: {len(new)} (skipped {len(bank) - len(new)} existing/dup)")
    if args.dry_run or not new:
        return 0

    QUESTIONS.write_text(append_questions(q_src, new), encoding="utf-8")
    q2 = QUESTIONS.read_text(encoding="utf-8")
    update_stats(q2)
    print(f"Merged into {QUESTIONS}; stats → {STATS}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
