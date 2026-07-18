#!/usr/bin/env python3
"""Parse تلخيص سعود (delta vs رفيع 16/19) → MCQ JSON; merge into questions.js.

Source: data/raw/saud_delta.txt (from WhatsApp PDF / data/raw/saud_delta_rafi16_19.pdf)

Usage:
  python3 scripts/import_saud_delta.py
  python3 scripts/import_saud_delta.py --merge
  python3 scripts/import_saud_delta.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw" / "saud_delta.txt"
OUT = ROOT / "data" / "generated" / "premium_saud_delta.json"
QUESTIONS = ROOT / "data" / "questions.js"
STATS = ROOT / "analysis" / "bank_stats.json"

TOPIC_RULES: list[tuple[str, list[str]]] = [
    (
        "ethics",
        [
            "ethic",
            "consent",
            "ppe",
            "glove",
            "infection control",
            "steril",
            "instrument",
            "soap",
            "gown",
            "discrimination",
            "refer",
            "second opinion",
            "notes",
            "record",
            "fees",
            "tx of choice will mainly depend",
            "informed",
        ],
    ),
    (
        "restorative",
        [
            "composite",
            "amalgam",
            "crown",
            "bridge",
            "implant",
            "rpd",
            "veneer",
            "ferrule",
            "impression",
            "cement",
            "gic",
            "glass ionomer",
            "inlay",
            "onlay",
            "occlusion",
            "denture",
            "provisional",
            "post and core",
            "gypsum",
            "cast",
            "pfm",
            "overhang",
            "contact",
            "restoration",
            "cavity",
            "caries",
            "scaler",
            "mouth guard",
            "brux",
        ],
    ),
    (
        "ortho_pedo",
        [
            "ortho",
            "angle",
            "class ii",
            "class iii",
            "space maintainer",
            "pedo",
            "pediatric",
            "fluoride",
            "ssc",
            "primary",
            "apert",
            "supernumerary",
            "crossbite",
            "expansion",
            "headgear",
            "pacifier",
            "natal",
        ],
    ),
    (
        "endo",
        [
            "canal",
            "pulp",
            "obturation",
            "root canal",
            "rct",
            "mta",
            "apexif",
            "resorption",
            "avuls",
            "vitality",
            "gutta",
            "irreversible pulp",
            "temp",
            "sealer",
            "predentin",
            "dentine",
            "dentinal",
        ],
    ),
    (
        "perio",
        [
            "periodont",
            "gingiv",
            "scaling",
            "srp",
            "furcation",
            "probe",
            "marquis",
            "attachment",
            "gtr",
            "pocket",
            "stage ii",
            "stage i",
            "grade ",
            "peri-implant",
            "nifedipine",
            "hyperplasia",
            "enlargement",
            "bleeding and bleeding",
            "severity",
        ],
    ),
    (
        "oms",
        [
            "extract",
            "surgery",
            "fracture",
            "mronj",
            "ludwig",
            "ian",
            "block",
            "anesthes",
            "lidocaine",
            "epinephrine",
            "trauma",
            "biopsy",
            "leukoplakia",
            "ulcer",
            "syphilis",
            "herpes",
            "zoster",
            "cavernous",
            "osteomyelitis",
            "myeloma",
            "asa ",
            "mi ",
            "thyroid",
            "asthma",
            "paracetamol",
            "pregnancy",
            "sinus",
            "nerve",
            "trigeminal",
            "syndrom",
            "rash",
            "blister",
            "hiv",
            "cd4",
        ],
    ),
]


def classify_topic(stem: str) -> tuple[str, list[str]]:
    s = stem.lower()
    for topic, keys in TOPIC_RULES:
        if any(k in s for k in keys):
            sub: list[str] = []
            if topic == "restorative":
                if "implant" in s:
                    sub.append("implant")
                if "rpd" in s or "removable" in s or "denture" in s:
                    sub.append("rpd")
                if "amalgam" in s or "composite" in s or "caries" in s or "cavity" in s:
                    sub.append("operative")
                if "crown" in s or "veneer" in s or "pfm" in s or "post and core" in s:
                    sub.append("fixed")
                if "cement" in s or "gypsum" in s or "impression" in s:
                    sub.append("materials")
            return topic, sub
    if any(
        k in s
        for k in [
            "path",
            "leukoplakia",
            "pemphigus",
            "biopsy",
            "plasma",
            "anemia",
            "blister",
            "ulcer",
        ]
    ):
        return "oms", ["pathology"]
    return "mixed", []


def normalize(s: str) -> str:
    s = s.replace("✅", "").replace("✅", "")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^[-\d/\.\s]+", "", s)  # leading "4/" numbering
    return s.strip(" :?-")


def is_arabic_heavy(s: str) -> bool:
    if not s:
        return True
    ar = sum(1 for c in s if "\u0600" <= c <= "\u06FF")
    return ar / max(len(s), 1) > 0.35


def is_noise_line(s: str) -> bool:
    low = s.lower().strip()
    if not low or is_arabic_heavy(low):
        return True
    if len(low) < 2:
        return True
    noise = (
        "ملف سعود",
        "تم بحمد",
        "دعوات",
        "dont",
        "this pic exactly",
        "they didn’t",
        "they didn't",
        "ومفيش",
        "يعني لو",
        "direct way",
        "canine space",
    )
    if any(n in low for n in noise):
        return True
    if re.match(r"^[a-d][\.\)]?\s*$", low):
        return True
    return False


def strip_letter(s: str) -> str:
    s = normalize(s)
    s = re.sub(r"^[A-Da-d][\.\)]\s*", "", s)
    s = re.sub(r"^✅\s*", "", s)
    return normalize(s)


def parse_blocks(text: str) -> list[dict]:
    raw_blocks = text.split("🚨")[1:]
    items: list[dict] = []

    for bi, block in enumerate(raw_blocks, 1):
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        en = [ln for ln in lines if not is_noise_line(ln)]
        if not en:
            continue

        # Letter-style options: "A. text" / "✅ C. text" / "✅A. text"
        letter_opts: list[tuple[str, bool]] = []
        first_opt_i: int | None = None
        for i, ln in enumerate(en):
            m = re.search(r"([A-Da-d])[\.\)]\s*(\S.+)$", ln)
            if not m:
                continue
            txt = normalize(m.group(2).replace("✅", ""))
            if len(txt) < 1 or is_noise_line(txt):
                continue
            # Avoid treating "Class II." mid-stem as option
            if first_opt_i is None and i == 0 and "?" not in " ".join(en[:1]):
                # allow option on first line only if starts with letter pattern
                if not re.match(r"^✅?\s*[A-Da-d][\.\)]", ln.strip()):
                    continue
            letter_opts.append((txt, "✅" in ln))
            if first_opt_i is None:
                first_opt_i = i

        if first_opt_i is None:
            # Non-letter format: stem lines then short answers; one has ✅
            check_idxs = [i for i, ln in enumerate(en) if "✅" in ln]
            if not check_idxs:
                continue
            # Stem = everything before first line that is "short answer-like" after a question mark line,
            # or all lines before the ✅ line if ✅ is not on stem
            ci = check_idxs[0]
            # If ✅ line is long and has ?, it may be stem+answer
            cl = en[ci]
            if "?" in cl.replace("✅", "") and len(normalize(cl)) > 40:
                cleaned = normalize(cl.replace("✅", ""))
                m = re.match(r"(.+\?)\s+(.+)$", cleaned)
                if m:
                    stem = normalize(m.group(1))
                    options = [normalize(m.group(2))]
                    answer = 0
                else:
                    # answer only on this line, stem is previous
                    stem = normalize(" ".join(en[:ci])) if ci else cleaned
                    options = [normalize(cl.replace("✅", ""))]
                    answer = 0
            else:
                # stem = lines before first short option line
                # find where options start: after a line containing ? or use ci
                stem_end = ci
                for j in range(ci):
                    if "?" in en[j] or j == ci - 1:
                        stem_end = j + 1
                # Prefer: all lines before first option candidate
                # Options = lines from first short line after stem through end
                # Default stem_end = ci (everything before check is stem if multi-line stem)
                if ci > 0:
                    stem = normalize(" ".join(en[:ci]))
                    opts_lines = en[ci:]
                else:
                    stem = normalize(en[0])
                    opts_lines = en[0:]

                # Also include wrong options after/before check among short lines
                # Re-scan: if multiple short lines near check
                short_zone = []
                # start from first line after last long stem line
                start = 0
                for j, ln in enumerate(en):
                    if j < ci and (len(normalize(ln)) > 60 or "?" in ln):
                        start = j + 1
                if start == 0 and ci > 0:
                    start = ci
                zone = en[start:]
                if not zone:
                    zone = [en[ci]]
                options = []
                answer = None
                for ln in zone:
                    txt = strip_letter(ln)
                    if is_noise_line(txt) or len(txt) < 2:
                        continue
                    if not ("✅" in ln) and len(txt) > 90:
                        continue
                    options.append(txt)
                    if "✅" in ln and answer is None:
                        answer = len(options) - 1
                if answer is None or not options:
                    continue
                stem = normalize(" ".join(en[:start])) if start > 0 else stem
                stem = re.sub(r"\s+\?", "?", stem)
                stem = re.sub(r"\?(\w)", r" \1", stem)
                if len(stem) < 12:
                    continue
                topic, subtopics = classify_topic(stem + " " + " ".join(options))
                items.append(
                    {
                        "n": bi,
                        "q": stem,
                        "options": options,
                        "answer": answer,
                        "topic": topic,
                        "subtopics": subtopics,
                    }
                )
                continue

            stem = re.sub(r"\s+\?", "?", stem)
            stem = re.sub(r"\?(\w)", r" \1", stem)
            if len(stem) < 12 or answer is None:
                continue
            topic, subtopics = classify_topic(stem + " " + " ".join(options))
            items.append(
                {
                    "n": bi,
                    "q": stem,
                    "options": options,
                    "answer": answer,
                    "topic": topic,
                    "subtopics": subtopics,
                }
            )
            continue

        # Letter options path
        stem = normalize(" ".join(en[:first_opt_i])) if first_opt_i > 0 else normalize(en[0])
        stem = re.sub(r"\s+\?", "?", stem)
        stem = re.sub(r"\?(\w)", r" \1", stem)
        options = [o[0] for o in letter_opts]
        ans_list = [i for i, o in enumerate(letter_opts) if o[1]]
        answer = ans_list[0] if ans_list else None
        if answer is None or len(options) < 2 or len(stem) < 12:
            continue

        clean_opts = []
        new_ans = answer
        for i, o in enumerate(options):
            o = normalize(o)
            if o:
                if i == answer:
                    new_ans = len(clean_opts)
                clean_opts.append(o)
        if not clean_opts or new_ans >= len(clean_opts):
            continue
        options = clean_opts
        answer = new_ans

        topic, subtopics = classify_topic(stem + " " + " ".join(options))
        items.append(
            {
                "n": bi,
                "q": stem,
                "options": options,
                "answer": answer,
                "topic": topic,
                "subtopics": subtopics,
            }
        )

    # de-dupe
    seen: set[str] = set()
    unique: list[dict] = []
    for it in items:
        key = re.sub(r"[^a-z0-9]", "", it["q"].lower())[:90]
        if len(key) < 10 or key in seen:
            continue
        seen.add(key)
        unique.append(it)
    return unique


def pad_options(items: list[dict]) -> list[dict]:
    """Ensure 4 options; borrow distractors from other items' correct answers."""
    by_topic: dict[str, list[str]] = {}
    all_correct: list[str] = []
    for it in items:
        c = it["options"][it["answer"]]
        by_topic.setdefault(it["topic"], []).append(c)
        all_correct.append(c)

    generic = [
        "None of these clinical choices",
        "Observation only with no follow-up",
        "Immediate full-mouth extraction",
        "Antibiotics alone without local measures",
        "Refer for orthognathic surgery only",
        "Bleach teeth only",
        "Ignore medical history",
        "Increase vertical dimension always",
    ]

    out = []
    for it in items:
        opts = list(it["options"])
        ans = it["answer"]
        correct = opts[ans]
        # move correct to collect distractors excluding correct
        pool = [x for x in by_topic.get(it["topic"], []) + all_correct if x.lower() != correct.lower()]
        # unique preserve order
        seen = {correct.lower()}
        distractors = []
        for x in opts:
            if x.lower() == correct.lower():
                continue
            if x.lower() not in seen and len(x) >= 2:
                distractors.append(x)
                seen.add(x.lower())
        for x in pool:
            if len(distractors) >= 3:
                break
            if x.lower() not in seen and len(x) >= 2:
                distractors.append(x)
                seen.add(x.lower())
        for x in generic:
            if len(distractors) >= 3:
                break
            if x.lower() not in seen:
                distractors.append(x)
                seen.add(x.lower())
        final = [correct] + distractors[:3]
        while len(final) < 4:
            final.append(f"(option not listed in Saud source — pad {len(final)})")
        # light shuffle that keeps determinism by rotating with n
        rot = it["n"] % 4
        final = final[rot:] + final[:rot]
        new_ans = final.index(correct)
        it2 = dict(it)
        it2["options"] = final[:4]
        it2["answer"] = new_ans
        out.append(it2)
    return out


def to_bank_items(parsed: list[dict]) -> list[dict]:
    out = []
    for it in parsed:
        qid = f"saud_delta_{it['n']:03d}"
        item = {
            "id": qid,
            "topic": it["topic"],
            "difficulty": "medium",
            "q": it["q"],
            "options": it["options"],
            "answer": it["answer"],
            "explanation": (
                "From تلخيص سعود (new vs رفيع 16/19) — d. Mohamed Elgamil. "
                f"Source block #{it['n']}. Verify ✅ if high-stakes."
            ),
            "source": "saud_delta",
            "subtopics": it["subtopics"] or [],
            "usable": True,
        }
        if not item["subtopics"]:
            del item["subtopics"]
        out.append(item)
    return out


def existing_ids(q_src: str) -> set[str]:
    return set(re.findall(r'"id"\s*:\s*"([^"]+)"', q_src)) | set(
        re.findall(r'id:\s*"([^"]+)"', q_src)
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
    topics: dict[str, int] = {}
    sources: dict[str, int] = {}
    for m in re.finditer(r'"topic"\s*:\s*"([^"]+)"', q_src):
        topics[m.group(1)] = topics.get(m.group(1), 0) + 1
    for m in re.finditer(r'"source"\s*:\s*"([^"]+)"', q_src):
        sources[m.group(1)] = sources.get(m.group(1), 0) + 1
    usable_false = len(re.findall(r'"usable"\s*:\s*false', q_src))
    total = sum(topics.values())
    STATS.parent.mkdir(parents=True, exist_ok=True)
    STATS.write_text(
        json.dumps(
            {
                "total": total,
                "usable": total - usable_false,
                "quarantined": usable_false,
                "byTopic": dict(sorted(topics.items(), key=lambda x: -x[1])),
                "bySource": dict(sorted(sources.items(), key=lambda x: -x[1])),
                "note": "Includes saud_delta import",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--merge", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not RAW.exists():
        print(f"FAIL: missing {RAW}", file=sys.stderr)
        return 1

    text = RAW.read_text(encoding="utf-8", errors="ignore")
    parsed = parse_blocks(text)
    parsed = pad_options(parsed)
    bank = to_bank_items(parsed)

    # quality gate: stem length, 4 opts, answer in range
    bank = [
        b
        for b in bank
        if len(b["q"]) >= 12
        and len(b["options"]) == 4
        and 0 <= b["answer"] < 4
        and all(len(str(o)) >= 1 for o in b["options"])
    ]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    if not args.dry_run:
        OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {OUT} ({len(bank)} items)")
    else:
        print(f"DRY-RUN: {len(bank)} items")

    by_topic: dict[str, int] = {}
    for b in bank:
        by_topic[b["topic"]] = by_topic.get(b["topic"], 0) + 1
    print("By topic:", by_topic)
    print("Sample:")
    for b in bank[:3]:
        print(f"  [{b['id']}] {b['q'][:70]}... → {b['options'][b['answer']][:40]}")

    if args.merge and not args.dry_run:
        q_src = QUESTIONS.read_text(encoding="utf-8")
        have = existing_ids(q_src)
        new_items = [b for b in bank if b["id"] not in have]
        # also skip near-duplicate stems already in bank
        existing_stems = set(
            re.sub(r"[^a-z0-9]", "", m.group(1).lower())[:70]
            for m in re.finditer(r'"q"\s*:\s*"([^"]{20,})"', q_src)
        )
        filtered = []
        for b in new_items:
            key = re.sub(r"[^a-z0-9]", "", b["q"].lower())[:70]
            if key in existing_stems:
                continue
            filtered.append(b)
        print(f"Merge: {len(filtered)} new (skipped {len(bank) - len(filtered)} existing/dup)")
        if filtered:
            QUESTIONS.write_text(append_questions(q_src, filtered), encoding="utf-8")
            q2 = QUESTIONS.read_text(encoding="utf-8")
            update_stats(q2)
            print(f"Updated {QUESTIONS}")
        else:
            print("Nothing new to merge")
            update_stats(q_src)

    return 0


if __name__ == "__main__":
    sys.exit(main())
