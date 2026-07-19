#!/usr/bin/env python3
"""Generate clinical answers + hinges for placeholder SDLE MCQs using high-yield rules.

Does NOT trust abtal ✅ marks. Prefer textbook/board-standard answers.
Writes data/generated/mcq_fix/out_auto_*.json for apply_mcq_fixes.py.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS = ROOT / "data" / "questions.js"
OUT = ROOT / "data" / "generated" / "mcq_fix"


def load_bank():
    text = QUESTIONS.read_text(encoding="utf-8")
    m = re.search(r"w\.QUESTION_BANK\s*=\s*(\[.*\])\s*;", text, re.S)
    bank = json.loads(m.group(1))
    return bank


def norm(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s%./\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def opt_i(options, *preds) -> int | None:
    """Return first option index matching any predicate (callable or substring)."""
    for i, o in enumerate(options):
        n = norm(str(o))
        for p in preds:
            if callable(p):
                if p(n):
                    return i
            else:
                if p in n:
                    return i
    return None


def pick_answer(q: dict) -> tuple[int | None, str | None]:
    """Return (answer_index, explanation) or (None, None) if unsure."""
    stem = norm(q.get("q", ""))
    opts = [str(o) for o in (q.get("options") or [])]
    if len(opts) != 4:
        return None, None
    nopts = [norm(o) for o in opts]

    def A(*preds, why: str):
        i = opt_i(opts, *preds)
        if i is None:
            return None, None
        return i, why

    # ---- Infection control / sterilization ----
    if "cleaning" in stem and ("disinfect" in stem or "steril" in stem) and "instrument" in stem:
        return A(
            lambda n: "clean" in n and "disinfect" in n and "steril" in n
            and n.find("clean") < n.find("disinfect") < n.find("steril"),
            why=(
                "Organic debris must be cleaned first; then disinfection; then sterilization. "
                "Dirty instruments must never go straight into the sterilizer — soil protects microbes."
            ),
        )

    if "spaulding" in stem or ("critical" in stem and "instrument" in stem and "steril" in stem):
        return A(
            "steril",
            why="Critical items enter sterile tissue/vascular system → sterilization (Spaulding).",
        )

    # ---- Local anesthesia / Malamed-type ----
    if "most toxic" in stem and ("la" in stem or "anesthet" in stem or "amide" in stem):
        return A("bupivacaine", "marcaine", why="Bupivacaine is the most cardiotoxic/systemically toxic common amide LA.")
    if ("max dose" in stem or "maximum" in stem) and "lidocaine" in stem and "epinephrine" in stem:
        # 7 mg/kg with epi common board
        i = opt_i(opts, "7", "4.4", "4.5", "2")
        if i is not None and "7" in nopts[i]:
            return i, "Lidocaine with epinephrine: classic max ~7 mg/kg (absolute caps apply). Without epi lower (~4.4–4.5 mg/kg)."
    if "aspirat" in stem and ("injection" in stem or "anesthet" in stem):
        return A(
            lambda n: "blood" in n or "intravascular" in n or "vessel" in n,
            why="Aspiration checks for intravascular needle placement before depositing LA.",
        )

    # ---- Endo ----
    if "narrowest" in stem and "canal" in stem:
        return A(
            "apical constriction",
            "minor apical",
            "cdj",
            why="Narrowest canal diameter is usually the apical constriction (minor foramen / near CDJ region).",
        )
    if "accessory canal" in stem and ("apical" in stem or "percent" in stem or "%" in stem):
        # classic ~17% or majority in apical third — banks vary 17%, 74% location
        i = opt_i(opts, "17", "74", "apical")
        if i is not None:
            return i, (
                "Most accessory canals are in the apical third. Common board figures cite ~17% teeth with "
                "apical accessory canals (texts also emphasize apical location prevalence)."
            )
    if "sodium hypochlorite" in stem or "naocl" in stem:
        if "inactiv" in stem or "blood" in stem or "tissue" in stem or "organic" in stem:
            return A(
                lambda n: "blood" in n or "tissue" in n or "organic" in n or "inactiv" in n,
                why="NaOCl is inactivated by organic debris/blood/tissue — cleanse/irrigate adequately.",
            )
        if "concentration" in stem or "%" in stem:
            i = opt_i(opts, "2.5", "5.25", "0.5", "1")
            if i is not None:
                return i, "NaOCl is used in a range (~0.5–5.25%); many protocols use ~2.5% balancing efficacy/safety."
    if "gutta percha" in stem and ("solvent" in stem or "dissolve" in stem or "remove" in stem):
        return A("chloroform", "eucalyptol", "xylene", why="GP solvents used in retreatment include chloroform/eucalyptol (with care).")
    if "internal bleaching" in stem and "resorption" in stem:
        return A("cervical", why="Internal bleaching (esp. older walking bleach with heat/superoxol) associated with external cervical resorption.")
    if "file" in stem and ("separate" in stem or "break" in stem or "fracture" in stem) and "retriev" in stem:
        return A(
            "ultrasonic",
            "braiding",
            "removal kit",
            "instrument removal",
            why="Separated file retrieval uses specialized removal systems/ultrasonics under magnification when indicated.",
        )
    if "working length" in stem and ("apex locator" in stem or "radiograph" in stem):
        return A(
            lambda n: "combine" in n or "both" in n or "confirm" in n or "radiograph" in n and "locator" in n,
            why="Best practice: electronic apex locator + radiographic confirmation for working length.",
        )

    # ---- Pain / neuralgia / zoster ----
    if "vesicle" in stem and ("face" in stem or "pain" in stem or "unilateral" in stem or "side" in stem):
        # acute zoster vs PHN: among options PHN/zoster family beats cluster/migraine/TN
        i = opt_i(
            opts,
            "postherpetic",
            "herpes zoster",
            "zoster",
            "shingles",
            lambda n: "herpes" in n and "zoster" in n,
        )
        if i is not None:
            return i, (
                "Unilateral facial pain WITH vesicles in a dermatome = herpes zoster (shingles). "
                "Trigeminal neuralgia, cluster, and migraine do not produce a vesicular rash. "
                "Postherpetic neuralgia is pain after rash healing; if only PHN is listed among options, "
                "it is the zoster-spectrum choice banks expect."
            )
    if "trigeminal neuralgia" in stem and "trigger" in stem:
        return A(
            lambda n: "carbamazepine" in n or "oxcarbazepine" in n or "anticonvuls" in n,
            why="Classic TN medical first-line: carbamazepine (or oxcarbazepine). Not opioids as primary.",
        )
    if "cluster" in stem and "headache" in stem:
        if "oxygen" in " ".join(nopts) or "sumatriptan" in " ".join(nopts):
            return A("oxygen", "sumatriptan", why="Cluster headache acute treatment: high-flow O2 and/or sumatriptan.")

    # ---- OMS / trauma / spaces ----
    if "zygomatic" in stem and ("fracture" in stem or "fract" in stem):
        return A(
            "diplopia",
            "double vision",
            "infraorbital",
            "flattening",
            why="Zygomatic complex fractures commonly cause diplopia, infraorbital paresthesia, malar flattening.",
        )
    if "canine fossa" in stem or ("canine space" in stem) or ("infraorbital space" in stem and "odontogenic" in stem):
        return A("canine", "infraorbital", why="Canine fossa/region odontogenic infection → canine (infraorbital) space.")
    if "superior to the mylohyoid" in stem or ("above" in stem and "mylohyoid" in stem):
        return A("sublingual", why="Sublingual space is superior to mylohyoid; submandibular is inferior.")
    if "ludwig" in stem:
        return A(
            lambda n: "bilateral" in n or "submandibular" in n and "sublingual" in n or "airway" in n,
            why="Ludwig angina: bilateral submandibular/sublingual/submental floor-of-mouth infection — airway emergency.",
        )
    if "dry socket" in stem or "alveolar osteitis" in stem:
        return A(
            lambda n: "irrigat" in n or "dressing" in n or "sedative" in n or "eugenol" in n or "pack" in n,
            why="Alveolar osteitis: irrigate and place sedative dressing; systemic abx not first-line if no infection.",
        )
    if "inr" in stem and ("extract" in stem or "surgery" in stem):
        # often continue if therapeutic
        i = opt_i(opts, lambda n: "continue" in n or "do not stop" in n or "3" in n or "2.5" in n or "4" in n)
        if i is not None:
            return i, "For many simple extractions, continue warfarin if INR is in therapeutic range (often ≤3–3.5) with local hemostasis — coordinate with physician."

    if "bisphosphonate" in stem or "mronj" in stem or "bronj" in stem:
        return A(
            lambda n: "atraumatic" in n or "chlorhexidine" in n or "avoid" in n and "extract" in n or "refer" in n or "drug holiday" in n or "risk" in n,
            why="MRONJ risk: medical coordination, prefer atraumatic care, chlorhexidine, avoid elective surgery when possible on high-risk antiresorptives.",
        )

    # ---- Perio ----
    if "biologic width" in stem or "supracrestal" in stem:
        i = opt_i(opts, "2 mm", "2mm", "3 mm", "3mm")
        if i is not None and ("2" in nopts[i]):
            return i, "Classic biologic width / supracrestal attachment ≈ 2 mm (JE + CT). ~3 mm if sulcus included in some teachings."
    if "most common cell" in stem and ("healthy" in stem or "gingiva" in stem) and "connective" in stem:
        return A("fibroblast", why="Fibroblasts predominate in healthy gingival connective tissue.")
    if "first" in stem and ("coloniz" in stem or "attach" in stem) and ("pellicle" in stem or "tooth" in stem):
        return A(
            "gram positive",
            "streptococcus",
            "s. sanguinis",
            "s. oralis",
            why="Early colonizers are primarily gram-positive facultative streptococci on pellicle.",
        )
    if "gracey 11/12" in stem or "11 12" in stem:
        return A("mesial", why="Gracey 11/12 designed for mesial surfaces of posterior teeth.")
    if "gracey 13/14" in stem or "13 14" in stem:
        return A("distal", why="Gracey 13/14 designed for distal surfaces of posterior teeth.")
    if ("probing" in stem or "bop" in stem) and "smok" in stem:
        return A(
            lambda n: "decrease" in n or "less" in n or "mask" in n or "reduce" in n or "false" in n,
            why="Smoking reduces gingival inflammation signs/BOP — can mask disease severity.",
        )

    # ---- Restorative / materials ----
    if "gic" in stem or "glass ionomer" in stem:
        if "fluoride" in stem or "advantage" in stem:
            return A("fluoride", "chemical bond", why="GIC advantages: fluoride release and chemical bond to tooth.")
        if "sensitivity to moisture" in stem or "disadvantage" in stem:
            return A("moisture", "low strength", "wear", why="GIC limitations include lower strength/wear vs composite and technique sensitivity.")
    if "amalgam" in stem and ("gamma" in stem or "weakest" in stem or "phase" in stem):
        return A("gamma 2", "sn-hg", "tin mercury", why="Gamma-2 (Sn-Hg) is the weakest/most corrosion-prone phase in low-copper amalgam.")
    if "composite" in stem and ("polymerization" in stem or "shrink" in stem):
        return A(
            lambda n: "shrink" in n or "contraction" in n or "gap" in n or "stress" in n,
            why="Composite polymerization shrinkage can create marginal gaps and stress — manage with technique/layering.",
        )
    if "c factor" in stem or "configuration factor" in stem:
        return A(
            lambda n: "bonded" in n or "unbonded" in n or "ratio" in n or "class i" in n or "high" in n,
            why="C-factor = bonded/unbonded surface ratio; high C-factor (e.g. Class I) increases shrinkage stress.",
        )
    if "etch" in stem and "enamel" in stem and ("percent" in stem or "%" in stem or "phosphoric" in stem):
        i = opt_i(opts, "37", "35", "30–40", "30-40")
        if i is not None:
            return i, "Enamel etch typically 35–37% phosphoric acid for ~15–30 s (protocol-dependent)."
    if "dentin bonding" in stem and ("smear" in stem or "hybrid" in stem):
        return A("hybrid layer", "resin tags", why="Micromechanical retention via hybrid layer (resin-infiltrated collagen) is key to dentin adhesion.")

    # ---- Ortho / pedo ----
    if "space maintainer" in stem and ("first primary molar" in stem or "primary first molar" in stem):
        return A("band and loop", "bilateral", why="Unilateral loss of primary first molar often → band and loop space maintainer (age-dependent).")
    if ("fluoride supplement" in stem or "fluoride supplements" in stem) and ("3 year" in stem or "3-year" in stem or "caries free" in stem):
        # often 0 if water fluoridated unknown — bank may say no need
        i = opt_i(opts, "no need", "0", "none", "not indicated")
        if i is not None:
            return i, "Fluoride supplements only if low water fluoride and caries risk; caries-free with good hygiene often needs none without water history."
    if "ssc" in stem or "stainless steel crown" in stem:
        if "primary" in stem and ("multi" in stem or "extensive" in stem or "after pulp" in stem):
            return A(
                lambda n: "stainless" in n or "ssc" in n or "crown" in n,
                why="Extensive multi-surface caries or after pulp therapy in primary molars → SSC is durable restoration of choice.",
            )
    if "formocresol" in stem:
        return A("pulpotomy", why="Formocresol historically used in primary tooth pulpotomy (many now prefer MTA/other).")
    if "leeway space" in stem:
        return A(
            lambda n: "e" in n and "premolar" in n or "difference" in n or "md" in n,
            why="Leeway space: MD width difference primary molars/canine vs permanent successors (E space important).",
        )
    if "serial extraction" in stem:
        return A(
            lambda n: "crowding" in n or "severe" in n or "class i" in n,
            why="Serial extraction is for selected severe Class I crowding cases with specific criteria — not routine.",
        )
    if "maxillary constriction" in stem or ("constriction" in stem and "expand" in stem):
        return A("hyrax", "hass", "quad helix", "rpe", "rapid palatal", why="Maxillary transverse constriction in growing patient → expansion appliance (RPE/Hyrax/Haas/quad helix by age/need).")
    if ("sna" in stem and "snb" in stem) or ("decreased snb" in stem):
        return A("retrognathic mandible", "class ii", why="Normal SNA with decreased SNB → mandibular retrognathia (skeletal Class II pattern).")

    # ---- Ethics / professional ----
    if "informed consent" in stem:
        return A(
            lambda n: "risk" in n or "alternative" in n or "benefit" in n or "understand" in n or "autonomy" in n,
            why="Informed consent: diagnosis, proposed treatment, risks/benefits, alternatives, and opportunity for questions.",
        )
    if "confidential" in stem or "hipaa" in stem or "privacy" in stem:
        return A(
            lambda n: "not disclose" in n or "consent" in n or "privacy" in n or "except" in n,
            why="Patient confidentiality: do not disclose PHI without authorization except legal/public-health exceptions.",
        )

    # ---- Implants ----
    if "implant" in stem and ("sinus" in stem or "bone height" in stem) and ("mm" in stem or "length" in stem):
        # leave mostly to human — risky
        pass
    if "platform switch" in stem:
        return A(
            lambda n: "crestal bone" in n or "bone loss" in n or "abutment" in n and "narrower" in n,
            why="Platform switching (narrower abutment) associated with reduced crestal bone loss in many studies.",
        )

    # ---- Medically compromised ----
    if "renal transplant" in stem or ("transplant" in stem and "restoration" in stem):
        return A(
            lambda n: "defer" in n or "prophylaxis" in n or "consult" in n or "medical" in n,
            why="Recent transplant: immunocompromised — coordinate care; often defer elective care, manage infection risk, treat disease thoughtfully.",
        )
    if "uncontrolled diabetes" in stem or ("hba1c" in stem and ("high" in stem or "elevat" in stem)):
        return A(
            lambda n: "defer" in n or "medical" in n or "control" in n or "consult" in n or "antibiotic" in n,
            why="Poorly controlled diabetes: higher infection risk — optimize medical control, caution with elective surgery.",
        )
    if "hemophilia" in stem:
        return A(
            "factor viii",
            "factor 8",
            "desmopressin",
            "ddavp",
            "replacement",
            why="Hemophilia A: factor VIII deficiency — prevent bleeding with factor replacement / hematology protocol (DDAVP in mild selected cases).",
        )
    if "pregnancy" in stem and ("radiograph" in stem or "x-ray" in stem or "xray" in stem):
        return A(
            lambda n: "lead" in n or "necessary" in n or "second trimester" in n or "as needed" in n or "shield" in n,
            why="Indicated radiographs with shielding are acceptable in pregnancy when needed for diagnosis; don't withhold necessary care.",
        )
    if "pregnancy" in stem and ("trimester" in stem or "elective" in stem):
        return A("second", "2nd", why="Elective dental care often preferred in second trimester when possible.")

    # ---- TB ----
    if ("tb" in stem or "tuberculosis" in stem) and ("mm" in stem or "indurat" in stem or "ppd" in stem or "mantoux" in stem):
        # thresholds vary by risk; banks often >15 for low risk or >10/>5
        i = opt_i(opts, ">15", "15", ">10", "10", ">5", "5")
        if i is not None:
            return i, "TST induration cutoffs depend on risk (≥5/10/15 mm). Low-risk often ≥15 mm; higher-risk lower thresholds."

    # ---- Crown / open contact ----
    if "food" in stem and ("accumul" in stem or "impaction" in stem) and ("crown" in stem or "contact" in stem):
        return A("open contact", "contact", why="Food impaction after crown often from open/light proximal contact or poor contour/emergence.")

    # ---- Odontogenic infection bacteria ----
    if "odontogenic infection" in stem and ("bacteria" in stem or "organism" in stem or "flora" in stem):
        return A("mixed", "anaerob", why="Odontogenic infections are typically mixed aerobic/anaerobic oral flora.")

    # ---- Self-evident "no vesicles" labeled wrong options ----
    # If one option literally says correct clinical entity and others contradict stem
    if "no vesicles" in " ".join(nopts) and "vesicle" in stem:
        i = opt_i(opts, "postherpetic", "zoster", "herpes")
        if i is not None:
            return i, (
                "Vesicles + unilateral facial pain → zoster spectrum. Options that note 'no vesicles' for TN "
                "are distractors. Cluster/migraine lack vesicular rash."
            )

    return None, None


def is_placeholder(exp: str | None) -> bool:
    if not exp or not str(exp).strip():
        return True
    if re.search(
        r"Community bank|Extracted from|placeholder|أبطال|verify if no textbook|Review from official|Write the hinge|Study books:",
        exp,
        re.I,
    ):
        return True
    if len(exp) < 50:
        return True
    return False


def main():
    bank = load_bank()
    fixes = []
    skipped = 0
    for q in bank:
        if not is_placeholder(q.get("explanation")):
            continue
        ans, why = pick_answer(q)
        if ans is None or why is None:
            skipped += 1
            continue
        if ans < 0 or ans > 3:
            skipped += 1
            continue
        fixes.append(
            {
                "id": q["id"],
                "answer": ans,
                "explanation": why,
                "auto": True,
                "old_answer": q.get("answer"),
            }
        )
    out_path = OUT / "out_auto_rules.json"
    out_path.write_text(json.dumps(fixes, indent=2, ensure_ascii=False), encoding="utf-8")
    changed = sum(1 for f in fixes if f["answer"] != f["old_answer"])
    print(json.dumps({"auto_fixed": len(fixes), "answer_flips": changed, "still_need_llm": skipped, "out": str(out_path)}, indent=2))


if __name__ == "__main__":
    main()
