#!/usr/bin/env python3
"""Fix SDLE bank quality issues found in full content review.

- Correct wrong answer keys
- Clean glued options / textbook citations / Note: pollution
- Replace 'Not specified in extract' filler options
- Quarantine image-only stems (usable=false)
- Resolve bisphosphonate extract contradictions
- Shuffle premium_operative (was 100% answer index 0)
- Rebalance stream + always/pass_fp answer letter positions
- Deduplicate case-insensitive options where fixable
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data" / "questions.js"
GEN = ROOT / "data" / "generated"
REPORT = GEN / "bank_fix_report.json"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CITATION_RE = re.compile(
    r"\s*(?:"
    r"J\.\s*W\.\s*Little|"
    r"Little and Falace|"
    r"B\.\s*S\.\s*Manjunatha|"
    r"Textbook of Dental|"
    r"G\.\s*Chandra|"
    r"A Comprehensive Textbook|"
    r"Newman and Carranza|"
    r"Clinical Periodontology page|"
    r"page\s+\d+"
    r").*$",
    re.I | re.S,
)

NOTE_RE = re.compile(
    r"\s*(?:Note\s*:|Note\s*:-|Note\s*—|Note\s*–|\*\s*Stopping|\*\s*Between|"
    r"\*\s*Some clinicians).*$",
    re.I | re.S,
)

FIFTH_OPTION_RE = re.compile(r"\s+[eE][\.\)]\s+.*$")
LETTER_PREFIX_RE = re.compile(r"^\s*[A-Da-d1-4][\-\.\)]\s*")
LEADING_DASH_RE = re.compile(r"^\s*[-–—]\s*")


def stable_shuffle_indices(qid: str, n: int = 4) -> list[int]:
    """Deterministic permutation from question id (stable across runs)."""
    h = hashlib.md5(qid.encode("utf-8")).hexdigest()
    # Fisher-Yates with deterministic RNG from hash bytes
    idxs = list(range(n))
    for i in range(n - 1, 0, -1):
        # use 2 hex chars per step
        byte = int(h[(i * 2) % 32 : (i * 2) % 32 + 2], 16)
        j = byte % (i + 1)
        idxs[i], idxs[j] = idxs[j], idxs[i]
    return idxs


def apply_perm(options: list, answer: int, perm: list[int]) -> tuple[list, int]:
    """perm[new_pos] = old_pos → place old options into new order."""
    new_opts = [None] * 4
    new_ans = 0
    for new_i, old_i in enumerate(perm):
        new_opts[new_i] = options[old_i]
        if old_i == answer:
            new_ans = new_i
    return new_opts, new_ans


def shuffle_answer_away_from_bias(q: dict, force: bool = False) -> bool:
    """Shuffle options so answer isn't stuck at 0; always shuffle if force or answer==0 for operative."""
    opts = q.get("options") or []
    if len(opts) != 4:
        return False
    ans = q.get("answer", 0)
    perm = stable_shuffle_indices(q["id"])
    # ensure not identity if answer was 0 and we need spread — if perm keeps ans at 0, rotate
    new_opts, new_ans = apply_perm(opts, ans, perm)
    if new_ans == ans and new_opts == opts:
        # force rotate left by (hash % 3)+1
        k = (int(hashlib.md5(q["id"].encode()).hexdigest()[:2], 16) % 3) + 1
        new_opts = opts[k:] + opts[:k]
        new_ans = (ans - k) % 4
    q["options"] = new_opts
    q["answer"] = new_ans
    return True


def clean_option_text(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    t = text.strip()
    # Strip fifth-option glue
    t = FIFTH_OPTION_RE.sub("", t)
    # Strip trailing citations
    t = CITATION_RE.sub("", t)
    # Strip Note: trails (but keep short answers)
    if re.search(r"\bNote\s*:", t, re.I) or re.search(r"\bNote\s*:-", t, re.I):
        t = NOTE_RE.sub("", t)
    # Strip long parenthetical essays after short answer label
    # e.g. "A- Compomer (In pediatric dentistry, the compomer is often..."
    m = re.match(r"^([A-D1-4][\-\.\)]\s*)?([^(]{2,60})\s*\(.{40,}\)\s*$", t)
    if m and len(t) > 80:
        t = (m.group(1) or "") + m.group(2)
    # Strip letter/number prefixes
    t = LETTER_PREFIX_RE.sub("", t)
    t = LEADING_DASH_RE.sub("", t)
    # Collapse whitespace
    t = re.sub(r"\s+", " ", t).strip()
    # Truncate absurdly long polluted options
    if len(t) > 160:
        # keep first clause before period if reasonable
        cut = t.find(". ")
        if 20 <= cut <= 140:
            t = t[:cut].strip()
        else:
            t = t[:140].rsplit(" ", 1)[0].strip()
    return t


FILLER_POOL = [
    "None of the above alone is sufficient",
    "Refer without further evaluation",
    "Watchful waiting with no follow-up",
    "Immediate extraction of all remaining teeth",
]


def replace_not_specified(options: list, qid: str) -> list:
    out = []
    for i, o in enumerate(options):
        s = str(o)
        if re.search(r"not specified in extract", s, re.I) or re.search(
            r"^not specified$", s.strip(), re.I
        ):
            # stable filler per id+index
            pick = int(hashlib.md5(f"{qid}:{i}".encode()).hexdigest()[:2], 16) % len(
                FILLER_POOL
            )
            out.append(FILLER_POOL[pick])
        else:
            out.append(o)
    return out


def is_image_only(stem: str) -> bool:
    s = stem or ""
    patterns = [
        r"\bthis photo\b",
        r"\bpic of\b",
        r"\bpicture\b",
        r"\bimage shows\b",
        r"\bthe image shows\b",
        r"\bprovide x\s*ray\b",
        r"\bx[\s\-]?ray of\b",
        r"\(This photo",
        r"\bshown in (the )?(image|photo|pic|radiograph)\b",
        r"\bradiograph shows\b",
        r"\bpanoramic radiograph shows\b",
    ]
    # panoramic radiograph shows with full clinical description is OK if descriptive
    # only flag if stem is thin OR starts with Pic/
    if re.search(r"^(Pic of|Pic |Photo |Image of|Image shows)", s, re.I):
        return True
    if re.search(r"this photo was in Q", s, re.I):
        return True
    if re.search(r"provide x\s*ray", s, re.I):
        return True
    if re.search(r"\bpic of\b", s, re.I) and len(s) < 200:
        return True
    if re.search(r"\(This photo", s, re.I):
        return True
    # "The image shows" without enough text detail
    if re.search(r"^The image shows", s, re.I) and len(s) < 120:
        return True
    return False


def ensure_unique_options(options: list, answer: int, qid: str) -> tuple[list, int]:
    """Fix duplicate options (case-insensitive)."""
    opts = [str(o) for o in options]
    seen = {}
    for i, o in enumerate(opts):
        key = o.strip().lower()
        if key in seen:
            # duplicate — replace non-answer preferred, or answer if needed
            filler_i = int(hashlib.md5(f"{qid}:dup:{i}".encode()).hexdigest()[:2], 16)
            replacements = [
                "Resin composite",
                "Amalgam",
                "Stainless steel crown",
                "Observation only",
                "Systemic antibiotic only",
                "Immediate extraction",
                "No treatment indicated",
                "Refer for biopsy",
            ]
            new = replacements[filler_i % len(replacements)]
            # avoid new collision
            existing = {x.strip().lower() for x in opts}
            n = 0
            while new.strip().lower() in existing and n < 10:
                n += 1
                new = replacements[(filler_i + n) % len(replacements)] + f" (alt {n})"
            opts[i] = new
        else:
            seen[key] = i
    return opts, answer


# ---------------------------------------------------------------------------
# Explicit answer / content fixes by id
# ---------------------------------------------------------------------------

# answer is NEW correct option text after cleaning, or explicit options rewrite
MANUAL_FIXES: dict[str, dict] = {
    "ab2_f3f3e72d9f": {
        "q": "What fascial space lies superior to the mylohyoid muscle (with platysma as a superficial boundary in the floor of mouth region)?",
        "options": [
            "Submandibular space",
            "Submental space",
            "Sublingual space",
            "Parapharyngeal space",
        ],
        "answer": 2,  # sublingual is superior to mylohyoid
        "explanation": (
            "The sublingual space lies superior (deep) to the mylohyoid muscle. "
            "Submandibular and submental spaces are inferior to mylohyoid. "
            "Fixed from polluted extract that incorrectly keyed submental."
        ),
        "usable": True,
    },
    "ab2_b93cbcae76": {
        "answer_text_match": None,
        "set_answer_index_by_text": "2 mm",  # prefer 2 mm among options
        "options_prefer": [
            "1 mm",
            "2 mm",
            "3 mm",
            "5 mm",
        ],
        "answer": 1,
        "explanation": (
            "Classic biologic width (supracrestal tissue attachment) is about ~2 mm "
            "(junctional epithelium + connective tissue). Many boards also accept ~3 mm "
            "when sulcus is included. 1 mm is too small and risks BW violation. "
            "Corrected from abtal key that said 1 mm."
        ),
    },
    "ab2_1d6b3058b5": {
        "options": [
            "Fibroblast",
            "Mast cell",
            "Undifferentiated mesenchymal cells (dental pulp stem cells)",
            "Mature odontoblast only (no progenitor role)",
        ],
        "answer": 2,
        "explanation": (
            "After pulp capping, undifferentiated mesenchymal / dental pulp stem cells "
            "differentiate into odontoblast-like cells that form reparative dentin. "
            "Fibroblast is not the primary repair cell keyed here. Corrected from abtal."
        ),
    },
    "ab2_d88a56d6b3": {
        "options": [
            "Calcium hydroxide liner",
            "Resin-modified glass ionomer (RMGI)",
            "Zinc phosphate",
            "No liner is indicated",
        ],
        "answer": 3,
        "explanation": (
            "Shallow Class V with only minor marginal ditching (<0.5 mm), no pulp exposure: "
            "no liner is needed. CaOH is for pulp protection in deep preparations / exposures, "
            "not routine shallow ditching. Corrected from abtal key."
        ),
    },
    "ab2_bb6428f824": {
        "options": [
            "Drug allergy",
            "Drug interaction",
            "Infective endocarditis",
            "Viral exanthem unrelated to medication",
        ],
        "answer": 0,
        "explanation": (
            "Allergic symptoms after antibiotics → drug allergy until proven otherwise. "
            "Not 'drug interaction.' Endocarditis does not present as new allergy after the drug. "
            "Corrected from abtal key."
        ),
    },
    "ab2_0e3b0a0337": {
        "q": "4-year-old uncooperative child with deep caries involving all primary molars. Preferred restorative approach among common bank options?",
        "options": [
            "Glass ionomer restorations only for every surface",
            "Amalgam only without crowns",
            "Stainless steel crowns (often under advanced behavior guidance / GA when extensive)",
            "Observation until permanent molars erupt",
        ],
        "answer": 2,
        "explanation": (
            "Extensive multi-surface / deep caries in primary molars → stainless steel crowns "
            "are the durable bank answer; uncooperative extensive disease often needs advanced "
            "behavior guidance or GA. GI alone is not the best full-mouth answer. "
            "Aligned with stream SSC teaching."
        ),
    },
    "stream_j26_011": {
        "q": "Swelling localized to the canine fossa / canine region from an odontogenic source. Which primary fascial space is typically involved?",
        "options": [
            "Canine (infraorbital) space",
            "Infratemporal space",
            "Parapharyngeal space",
            "Pterygomandibular space",
        ],
        "answer": 0,
        "explanation": (
            "Canine-region odontogenic swelling involves the canine (infraorbital) space, "
            "not the infratemporal space (deeper posterior). Fixed wrong stream key; "
            "stem no longer depends on a missing image."
        ),
        "usable": True,
    },
    "ab2_2e49a1a49d": {
        "usable": False,
        "exclude_reason": "Image-dependent trauma stem; answer was glued with unrelated 5th option text.",
        "options": [
            "Cvek pulpotomy",
            "Root canal treatment",
            "Pulpotomy",
            "Direct pulp capping with MTA",
        ],
        "answer": 3,
        "explanation": (
            "Quarantined: original item required a photo and had polluted options "
            "('MTA e. Give insulin and extract'). If exposure is small/clean/recent, "
            "direct pulp cap with MTA is a common path — but do not score this id without the image."
        ),
    },
    # Bisphosphonate set — unified teaching
    "ab2_6d777343fe": {
        "q": (
            "Patient with breast cancer on bisphosphonate therapy needs extraction of 3 teeth. "
            "What is the most appropriate overall approach?"
        ),
        "options": [
            "Extract like any healthy patient with no extra precautions",
            "Extract all teeth the same day without medical coordination",
            "Extract on a fixed 2-week schedule regardless of healing or risk",
            "Coordinate with oncology; minimize trauma; stage only if needed; prioritize prevention of MRONJ",
        ],
        "answer": 3,
        "explanation": (
            "MRONJ risk management: medical coordination, atraumatic technique, chlorhexidine/"
            "antibiotic protocols as indicated, informed consent. Rigid 'one quadrant every 2 months' "
            "or 'never extract until symptomatic' are not universal rules. Unified fix for conflicting abtal keys."
        ),
    },
    "ab2_09aec71801": {
        "q": (
            "Patient on bisphosphonate needs multiple extractions (two upper left, one lower left). "
            "Oncologist agrees prophylaxis each visit. Best decision framework?"
        ),
        "options": [
            "Extract all in one visit always without staging judgment",
            "Extract one tooth every week no matter what",
            "Coordinate care; use atraumatic technique; stage extractions only based on risk/healing — not a magic interval",
            "Refuse all extractions permanently even if symptomatic",
        ],
        "answer": 2,
        "explanation": (
            "Same unified MRONJ teaching as other bisphosphonate items: coordinate, prevent, "
            "atraumatic, case-based staging — not a single interval dogma."
        ),
    },
    "ab2_0ac7092d8a": {
        "q": (
            "Patient with breast cancer on bisphosphonate needs multiple extractions; oncology allows "
            "prophylaxis each visit. Most appropriate plan?"
        ),
        "options": [
            "Extract one tooth every 2 months as a fixed rule for all patients",
            "Extract all teeth in one visit with no precautions",
            "Extract every 2 weeks regardless of healing",
            "Do not use a blanket 'never extract' rule — treat infection/pain with coordinated, atraumatic, staged care as indicated",
        ],
        "answer": 3,
        "explanation": (
            "Corrected conflict: 'Don't extract until symptomatic' is not always correct when teeth "
            "are already indicated for removal. Manage MRONJ risk with coordination and technique; "
            "symptomatic disease still needs care."
        ),
    },
    "ab2_c04d289162": {
        "q": "Patient on long-term bisphosphonates undergoing extraction — antibiotic strategy among bank-style options?",
        "options": [
            "Pre-operative antibiotics only, never continue",
            "Case-based: often peri-operative coverage and healing-period measures as protocol/risk dictate",
            "Antibiotics never indicated for any MRONJ-risk extraction",
            "Stop bisphosphonate for 1 day only then extract with no other measures",
        ],
        "answer": 1,
        "explanation": (
            "Protocols vary by risk (IV vs oral, duration, comorbidities). Stopping bisphosphonate "
            "short-term is not proven to prevent MRONJ. Antibiotic use is case/protocol-based, "
            "often extending through early healing for higher-risk cases — not a single 'pre-op only' dogma. "
            "Also: do not stop antiresorptives casually without the prescriber."
        ),
    },
    "ab2_4f391c7f0b": {
        "options": [
            "Compomer",
            "Composite resin only",
            "Amalgam",
            "Conventional glass ionomer only",
        ],
        "answer": 0,
        "explanation": (
            "Pediatric banks often key compomer for bonding + fluoride release hybrid properties. "
            "Cleaned essay-length option text from PDF extract."
        ),
    },
    "ab2_a9ca12b715": {
        "q": (
            "HIV-positive patient needs antibiotic coverage for a routine odontogenic infection "
            "with no allergy and standard flora — first-line among common options?"
        ),
        "options": [
            "Amoxicillin (standard odontogenic first-line when appropriate)",
            "Clindamycin only because patient has HIV",
            "Azithromycin only because patient has HIV",
            "Metronidazole alone for all HIV dental infections",
        ],
        "answer": 0,
        "explanation": (
            "HIV alone does not change first-line odontogenic antibiotic choice when the patient "
            "is otherwise appropriate for amoxicillin. Select based on infection, allergies, and guidelines — "
            "not HIV stigma. Stem was previously incomplete."
        ),
    },
    "ab2_0d9a6fece4": {
        "q": (
            "Anxious patient with stage III COPD and severe dental pain; started amoxicillin 3 days ago "
            "without improvement; on theophylline. Regarding anxiolysis/sedation for dental care, which is most appropriate?"
        ),
        "options": [
            "Add erythromycin (interacts with theophylline — avoid)",
            "Add clarithromycin freely without interaction check",
            "Cautious low-dose anxiolysis (e.g. low-dose diazepam) if needed; avoid N2O in severe COPD; fix infection properly",
            "Nitrous oxide freely — preferred in stage III–IV COPD",
        ],
        "answer": 2,
        "explanation": (
            "Stage III–IV COPD: avoid/severely caution nitrous oxide (gas trapping). "
            "Macrolides can interact with theophylline. Low-dose benzodiazepine anxiolysis may be used cautiously. "
            "Separately: failed antibiotic for odontogenic infection needs dental source control / regimen review — "
            "not anxiolysis alone."
        ),
    },
    "ab2_66aa99e5c9": {
        "options": [
            "Deep subgingival preparation invading biologic width",
            "Intrasulcular / slightly subgingival when esthetics demand",
            "Supragingival preparation when possible (most biologically conservative)",
            "Finish line on bone crest for retention",
        ],
        "answer": 2,
        "explanation": (
            "Most biologically conservative finish line is supragingival when acceptable. "
            "Intrasulcular is a compromise for esthetics, not the healthiest default. Corrected abtal key."
        ),
    },
    "ab2_ad6e04d565": {
        "q": (
            "Missing upper first molar to be replaced with an implant. Available bone height to sinus is 13 mm. "
            "Most reasonable implant length among options (leave safety clearance)?"
        ),
        "options": [
            "7 mm",
            "10 mm",
            "9 mm",
            "12 mm",
        ],
        "answer": 1,  # 10 mm leaves ~3 mm vs 12 leaves 1 mm
        "explanation": (
            "With 13 mm to sinus, a 12 mm implant leaves only ~1 mm — aggressive. "
            "~10 mm is a safer common teaching choice among these options while still using available height. "
            "Final length is case/CBCT-based."
        ),
    },
    "ab2_89552bf4ca": {
        "q": (
            "The occlusal plane is oriented with reference to the interpupillary line and the ala-tragus line "
            "using a fox plane guide. What is the name of this clinical reference setup device/plane guide?"
        ),
        "options": [
            "Fox plane (guide)",
            "Camper plane (ala-tragus reference line itself)",
            "Frankfort plane",
            "Occlusal plane (the tooth plane alone, not the guide)",
        ],
        "answer": 0,
        "explanation": (
            "Camper's plane ≈ ala-tragus line. The Fox plane is the device/guide used to orient the "
            "occlusal plane to interpupillary + Camper references. Stem clarified to match Fox-plane key."
        ),
    },
    "ab2_3d85aaca54": {
        "q": (
            "For interdental papilla fill between two natural teeth, classic Tarnow teaching: papilla is most "
            "predictably present when contact-point to crest of bone distance is about:"
        ),
        "options": [
            "≤ about 5 mm",
            "Always 3.4 mm only between implants",
            "Always 8 mm or more",
            "Distance does not matter",
        ],
        "answer": 0,
        "explanation": (
            "Tarnow: contact-to-crest ≤ ~5 mm → high chance of full papilla between teeth. "
            "Implant-implant vertical numbers differ and were polluted in the old extract (3.4/4.4/5.4). "
            "Aligned with free-points / stream Tarnow teaching."
        ),
    },
    "ab2_f57d5d70dc": {
        "options": [
            "Intrusion",
            "Extrusion",
            "Subluxation",
            "Concussion only",
        ],
        "answer": 0,
        "explanation": (
            "Metallic percussion sound when the tooth is locked in bone: intrusion (also ankylosis / "
            "some lateral luxations). Cleaned note-polluted options; intrusion is the best single classic key."
        ),
    },
    "ab2_532316c18d": {
        "options": [
            "Tapered and short",
            "Tapered and long",
            "Wide and short",
            "Wide and long",
        ],
        "answer": 0,
        "explanation": (
            "Worst root configuration for support (general prostho/perio teaching): short and tapered. "
            "Cleaned note-polluted option D."
        ),
    },
    "ab2_d82e861018": {
        "options": [
            "Holes are too small",
            "Holes are too far from each other",
            "Holes are too close",
            "Clamp wings always too large",
        ],
        "answer": 1,
        "explanation": (
            "Rubber dam wrinkles between teeth → holes punched too far apart. "
            "Holes too close → stretch/tear/leak. Cleaned note glue from extract."
        ),
    },
    "ab2_87eccf0756": {
        "options": [
            "Reduce the maxillary tuberosity",
            "Reduce the retromolar pad",
            "Use a metal plate in the tuberosity area only",
            "Leave soft tissue; adjust denture flange / reduce tuberosity only if it truly interferes with stability",
        ],
        "answer": 3,
        "explanation": (
            "Highly attached retromolar pad extending toward tuberosity: do not routinely amputate pad. "
            "Adjust flange; reduce bony tuberosity only if interference/stability demands. Cleaned note glue."
        ),
    },
    "ab2_ce5f11eed1": {
        "options": [
            "Defer treatment until a new test is done",
            "Treat with airborne precautions",
            "Treat using standard precautions",
            "Refer every such patient to a pulmonologist before any exam",
        ],
        "answer": 2,
        "explanation": (
            "Remote negative TB test years ago without active disease signs → standard precautions "
            "for routine care (not automatic airborne or blanket defer). Cleaned citation from option D."
        ),
    },
    "ab2_48b7278e2a": {
        "options": [
            "Bennett movement",
            "Christensen phenomenon",
            "Posselt's envelope",
            "Gothic arch tracing",
        ],
        "answer": 1,
        "explanation": (
            "Posterior open space between occlusal surfaces in protrusion = Christensen phenomenon. "
            "Cleaned textbook citation from option D."
        ),
    },
    "ab2_dc67c1a997": {
        "options": [
            "Acute infection",
            "Chronic infection",
            "Past immunity",
            "Vaccine response",
        ],
        "answer": 0,
        "explanation": (
            "HBc IgM positive with Anti-HBs negative pattern is consistent with acute HBV infection context "
            "in common bank teaching. Cleaned citation glue."
        ),
    },
    "stream_j26_009": {
        "explanation": (
            "Large dentigerous cysts may be marsupialized to decompress and protect adjacent structures; "
            "enucleation is also common when feasible. Bank key kept (marsupialization) with clarified explanation. "
            "Image not required if stem states large cyst around impacted crown."
        ),
    },
}


def load_bank() -> list:
    text = QUESTIONS.read_text(encoding="utf-8")
    # window.QUESTION_BANK = [...];
    m = re.search(r"window\.QUESTION_BANK\s*=\s*(\[[\s\S]*\])\s*;", text)
    if not m:
        raise SystemExit("Could not parse QUESTION_BANK")
    return json.loads(m.group(1))


def save_bank(bank: list) -> None:
    body = json.dumps(bank, ensure_ascii=False, indent=2)
    QUESTIONS.write_text(f"window.QUESTION_BANK = {body};\n", encoding="utf-8")


def apply_manual(q: dict, fix: dict) -> None:
    if "q" in fix:
        q["q"] = fix["q"]
    if "options" in fix:
        q["options"] = fix["options"]
    if "answer" in fix:
        q["answer"] = fix["answer"]
    if "explanation" in fix:
        q["explanation"] = fix["explanation"]
    if "usable" in fix:
        q["usable"] = fix["usable"]
    if "exclude_reason" in fix:
        q["exclude_reason"] = fix["exclude_reason"]
    # set answer by matching text
    if "set_answer_index_by_text" in fix and fix["set_answer_index_by_text"]:
        target = fix["set_answer_index_by_text"].lower()
        for i, o in enumerate(q["options"]):
            if target in str(o).lower():
                q["answer"] = i
                break


def clean_all_options(q: dict) -> bool:
    changed = False
    opts = q.get("options") or []
    if len(opts) != 4:
        return False
    new = []
    for o in opts:
        c = clean_option_text(str(o))
        if c != str(o).strip():
            changed = True
        new.append(c if c else str(o).strip())
    # replace not specified
    replaced = replace_not_specified(new, q["id"])
    if replaced != new:
        changed = True
        new = replaced
    # unique
    uniq, ans = ensure_unique_options(new, q.get("answer", 0), q["id"])
    if uniq != new:
        changed = True
        new = uniq
    q["options"] = new
    # if answer index invalid after cleans, clamp
    if not isinstance(q.get("answer"), int) or not (0 <= q["answer"] <= 3):
        q["answer"] = 0
        changed = True
    return changed


def main() -> int:
    bank = load_bank()
    by_id = {q["id"]: q for q in bank}
    report = {
        "manual_fixed": [],
        "cleaned_options": 0,
        "image_quarantined": [],
        "shuffled_operative": 0,
        "shuffled_stream": 0,
        "shuffled_always": 0,
        "usable_false_total": 0,
        "errors": [],
    }

    # 1) Manual fixes
    for qid, fix in MANUAL_FIXES.items():
        if qid not in by_id:
            report["errors"].append(f"missing id {qid}")
            continue
        apply_manual(by_id[qid], fix)
        report["manual_fixed"].append(qid)

    # 2) Global option cleaning for abtal + any glued
    for q in bank:
        before = json.dumps(q.get("options"), ensure_ascii=False)
        if clean_all_options(q):
            after = json.dumps(q.get("options"), ensure_ascii=False)
            if before != after:
                report["cleaned_options"] += 1

    # 3) Image quarantine
    for q in bank:
        if q.get("usable") is False:
            continue
        if is_image_only(q.get("q", "")):
            q["usable"] = False
            q["exclude_reason"] = q.get("exclude_reason") or (
                "Image/photo/radiograph-dependent stem without image in app"
            )
            # keep item for reference but mark unusable
            report["image_quarantined"].append(q["id"])

    # Also quarantine if any option still looks like pure garbage
    for q in bank:
        opts = q.get("options") or []
        if any(re.search(r"Give insulin and extract", str(o)) for o in opts):
            q["usable"] = False
            q["exclude_reason"] = "Polluted options remain"
            if q["id"] not in report["image_quarantined"]:
                report["image_quarantined"].append(q["id"])

    # 4) Shuffle premium_operative (all were answer 0)
    for q in bank:
        if q.get("source") == "premium_operative":
            shuffle_answer_away_from_bias(q, force=True)
            report["shuffled_operative"] += 1

    # 5) Rebalance stream answer positions (no D was ever correct)
    for q in bank:
        src = q.get("source") or ""
        if "stream" in src:
            shuffle_answer_away_from_bias(q, force=True)
            report["shuffled_stream"] += 1

    # 6) Rebalance always + pass free points (weak D usage)
    for q in bank:
        src = q.get("source") or ""
        qid = q.get("id") or ""
        if src == "always" or qid.startswith("pass_fp") or qid.startswith("hy"):
            shuffle_answer_away_from_bias(q, force=True)
            report["shuffled_always"] += 1

    # 7) Ensure manual fixes weren't broken by later clean — re-apply manuals last for key fields
    for qid, fix in MANUAL_FIXES.items():
        if qid in by_id:
            apply_manual(by_id[qid], fix)
            # still clean options once
            clean_all_options(by_id[qid])
            # re-apply answer after clean
            if "answer" in fix:
                by_id[qid]["answer"] = fix["answer"]
            if "options" in fix:
                by_id[qid]["options"] = [clean_option_text(o) for o in fix["options"]]
                by_id[qid]["answer"] = fix["answer"]

    # 8) Final integrity pass
    for q in bank:
        opts = q.get("options") or []
        if len(opts) != 4:
            report["errors"].append(f"{q['id']}: options len {len(opts)}")
            continue
        # empty options
        for i, o in enumerate(opts):
            if not str(o).strip():
                opts[i] = FILLER_POOL[i % len(FILLER_POOL)]
        q["options"] = opts
        if not (0 <= int(q.get("answer", -1)) <= 3):
            report["errors"].append(f"{q['id']}: bad answer {q.get('answer')}")
        # duplicate options final
        lows = [str(o).strip().lower() for o in opts]
        if len(set(lows)) < 4:
            q["options"], _ = ensure_unique_options(opts, q["answer"], q["id"])
        if q.get("usable") is False:
            report["usable_false_total"] += 1

    # Stats after shuffle
    def dist(pred):
        d = [0, 0, 0, 0]
        n = 0
        for q in bank:
            if pred(q):
                d[int(q["answer"])] += 1
                n += 1
        return n, d

    report["dist_premium_operative"] = dist(lambda q: q.get("source") == "premium_operative")
    report["dist_stream"] = dist(lambda q: "stream" in (q.get("source") or ""))
    report["dist_always"] = dist(lambda q: q.get("source") == "always")
    report["total"] = len(bank)

    save_bank(bank)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # Sync stream + free-points generated JSON subsets if present
    for gen_name, pred in [
        ("premium_stream_july2026.json", lambda q: "stream" in (q.get("source") or "")),
        ("premium_pass_free_points.json", lambda q: str(q.get("id", "")).startswith("pass_fp")),
    ]:
        path = GEN / gen_name
        if not path.exists():
            continue
        subset = [q for q in bank if pred(q)]
        # write only fields typically in gen files
        path.write_text(json.dumps(subset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {path.name}: {len(subset)} items")

    print("=== BANK FIX REPORT ===")
    print(json.dumps({k: report[k] for k in report if k != "image_quarantined"}, indent=2))
    print(f"image_quarantined count: {len(report['image_quarantined'])}")
    print(f"Wrote {QUESTIONS}")
    print(f"Report {REPORT}")
    return 0 if not report["errors"] else 1


if __name__ == "__main__":
    sys.exit(main())
