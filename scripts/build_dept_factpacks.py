#!/usr/bin/env python3
"""Build department fact packs from local textbook text extracts for lesson grounding.

Outputs:
  data/raw/books/text/FACTPACKS/<dept>.md
  data/generated/phase_truth/BOOK_CORPUS_INDEX.json
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEXT = ROOT / "data" / "raw" / "books" / "text"
OUT = TEXT / "FACTPACKS"
INDEX = ROOT / "data" / "generated" / "phase_truth" / "BOOK_CORPUS_INDEX.json"

# department -> list of (relative txt path, keywords to harvest)
DEPTS = {
    "endo": {
        "sources": [
            "Endo/Cohens_Pathways_of_the_Pulp_2016.txt",
            "Endo/Endodontics_principles.txt",
        ],
        "keywords": [
            "irreversible pulpitis",
            "reversible pulpitis",
            "pulp necrosis",
            "sodium hypochlorite",
            "EDTA",
            "apical constriction",
            "working length",
            "MB2",
            "apexification",
            "apexogenesis",
            "vertical root fracture",
            "calcium hydroxide",
            "MTA",
            "rubber dam",
            "avulsion",
            "smear layer",
        ],
    },
    "operative": {
        "sources": ["Resto/Sturdevant_Operative_5e.txt"],
        "keywords": [
            "smear layer",
            "hybrid layer",
            "retention form",
            "resistance form",
            "C-factor",
            "amalgam",
            "composite",
            "glass ionomer",
            "cavity preparation",
            "bevel",
            "etch",
            "adhesive",
            "polymerization",
            "liners",
            "bases",
        ],
    },
    "fixed": {
        "sources": ["Fixed/Contemporary_Fixed_Prosthodontics_4e.txt"],
        "keywords": [
            "finish line",
            "chamfer",
            "shoulder",
            "ferrule",
            "retention",
            "resistance",
            "provisional",
            "impression",
            "cement",
            "all-ceramic",
            "PFM",
            "abutment",
            "span",
            "connector",
        ],
    },
    "rpd": {
        "sources": [
            "Removable/McCracken_s Removable Partial Prosthodontics.txt",
            "Removable/Textbook of Complete Dentures.txt",
        ],
        "keywords": [
            "Kennedy",
            "rest seat",
            "clasp",
            "major connector",
            "indirect retainer",
            "centric relation",
            "vertical dimension",
            "retention",
            "stability",
            "support",
            "impression",
            "border molding",
        ],
    },
    "perio": {
        "sources": [
            "perio/Periodontics Medicine Surgery Implants.txt",
            "perio/Lang_Lindhe_Clinical_Periodontology.txt",
            "perio/Carranza_Clinical_Periodontology_2018.txt",
        ],
        "keywords": [
            "probing depth",
            "clinical attachment",
            "furcation",
            "scaling",
            "root planing",
            "gingivitis",
            "periodontitis",
            "biologic width",
            "osseous",
            "membrane",
            "implant",
            "peri-implantitis",
            "plaque",
            "mobility",
        ],
    },
    "oms": {
        "sources": [
            "Oral surgary/Hupp_Contemporary_OMFS_6e.txt",
            "Oral surgary/Oral and Maxillofacial Pathology.txt",
            "Oral surgary/Manegment of medically compromised PT.txt",
            "Oral surgary/White_Pharoah_Oral_Radiology_7e.txt",
        ],
        "keywords": [
            "extraction",
            "dry socket",
            "impacted",
            "IA nerve",
            "local anesthesia",
            "bisphosphonate",
            "anticoagulant",
            "INR",
            "cyst",
            "tumor",
            "fracture",
            "infection",
            "abscess",
            "osteomyelitis",
        ],
    },
    "ortho_pedo": {
        "sources": [
            "ortho/Contemporary Orthodontics 5th.txt",
            "ortho/An Introduction to Orthodontics (2).txt",
            "pedo/McDonald_Avery_10e.txt",
            "pedo/Pediatric Dentistry INFANCY THROUGH ADOLESCENCE.txt",
        ],
        "keywords": [
            "Angle Class",
            "overjet",
            "overbite",
            "space maintainer",
            "pulpotomy",
            "SSC",
            "fluoride",
            "eruption",
            "primary tooth",
            "trauma",
            "interceptive",
            "anchorage",
        ],
    },
    "ethics": {
        "sources": [
            "Ethics + infection control + local anasthesia/Professionalism and Ethics Handbook for Residents.txt",
            "Ethics + infection control + local anasthesia/GUIDELINES FOR INFECTION CONTROL-2003.txt",
            "Ethics + infection control + local anasthesia/Basic Guide to Infection Prevention and Control in Dentistry. 2009.txt",
            "Ethics + infection control + local anasthesia/Hand book of local anesthesia 6th.txt",
        ],
        "keywords": [
            "informed consent",
            "confidentiality",
            "sterilization",
            "disinfection",
            "hand hygiene",
            "PPE",
            "sharps",
            "maxillary",
            "inferior alveolar",
            "epinephrine",
            "toxicity",
            "aspiration",
            "professionalism",
        ],
    },
}


def harvest(path: Path, keyword: str, max_snips: int = 3, window: int = 280) -> list[str]:
    if not path.exists():
        return []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return []
    snips = []
    # case-insensitive search
    for m in re.finditer(re.escape(keyword), text, re.I):
        start = max(0, m.start() - 80)
        end = min(len(text), m.end() + window)
        chunk = text[start:end]
        chunk = re.sub(r"\s+", " ", chunk).strip()
        if len(chunk) < 40:
            continue
        snips.append(chunk)
        if len(snips) >= max_snips:
            break
    return snips


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    index = {"departments": {}, "text_files": []}
    for p in sorted(TEXT.rglob("*.txt")):
        if "FACTPACKS" in str(p):
            continue
        index["text_files"].append(
            {
                "path": str(p.relative_to(ROOT)),
                "bytes": p.stat().st_size,
            }
        )

    for dept, cfg in DEPTS.items():
        lines = [
            f"# Department fact pack: {dept}",
            "",
            "Grounded snippets from local SCFHS Appendix C textbook extracts.",
            "Not SCFHS answer keys. Use for lesson writing only.",
            "",
        ]
        hits = 0
        for src in cfg["sources"]:
            path = TEXT / src
            lines.append(f"## Source: `{src}`")
            lines.append(f"Exists: {path.exists()} · bytes: {path.stat().st_size if path.exists() else 0}")
            lines.append("")
            if not path.exists():
                lines.append("_Missing PDF/text — re-run download + extract._")
                lines.append("")
                continue
            for kw in cfg["keywords"]:
                snips = harvest(path, kw)
                if not snips:
                    continue
                hits += len(snips)
                lines.append(f"### Keyword: {kw}")
                for s in snips:
                    lines.append(f"- {s}")
                lines.append("")
        lines.append(f"_Total snippets: {hits}_")
        outp = OUT / f"{dept}.md"
        outp.write_text("\n".join(lines), encoding="utf-8")
        index["departments"][dept] = {"file": str(outp.relative_to(ROOT)), "snippets": hits}
        print(dept, "snippets", hits, "->", outp)

    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(index, indent=2), encoding="utf-8")
    print("index", INDEX)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
