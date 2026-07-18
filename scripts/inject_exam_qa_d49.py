#!/usr/bin/env python3
"""Inject Days 4–9 exam-form + exam-qa into staging HTML; update pomodoro lines.
Run merge_generated.py after. Quality bar matches Days 1–3 (no thin stems).
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "data" / "generated"


def eq(
    data_id: str,
    num: str,
    stem: str,
    opts: list[str],
    ans_letter: str,
    ans_short: str,
    hinge: str,
    src: str,
) -> str:
    assert len(opts) == 4 and ans_letter in "abcd"
    li = "\n".join(f"      <li>{o}</li>" for o in opts)
    return f"""  <article class="eq" data-id="{data_id}">
    <span class="eq-num">{num}</span>
    <p class="exam-stem">{stem}</p>
    <ol class="exam-opts" type="a">
{li}
    </ol>
    <details class="exam-ans"><summary>Answer + hinge (tap after you choose)</summary>
      <p class="ans-line"><b>Answer:</b> {ans_letter} — {ans_short}</p>
      <p class="hinge-line"><b>Hinge:</b> {hinge}</p>
      <p class="src-line">Pattern: {src}</p>
    </details>
  </article>
"""


def form_block(day: int, block: str, title: str, bullets: list[str]) -> str:
    lis = "\n".join(f"    <li>{b}</li>" for b in bullets)
    return f"""
<section class="exam-form" data-day="{day}" data-block="{block}">
  <h4>How SDLE asks Block {block} ({title})</h4>
  <ul>
{lis}
  </ul>
</section>
"""


def qa_block(day: int, block: str, articles: str) -> str:
    return f"""
<section class="exam-qa" data-day="{day}" data-block="{block}" data-count="5">
  <h4>Exam Q&amp;A — Block {block} (self‑test first)</h4>
  <p class="exam-qa-hint">Cover each green box. Pick a/b/c/d out loud. Then expand Answer + hinge. Target ≥4/5 before the next block.</p>

{articles}</section>
"""


def pack(
    day: int,
    block: str,
    title: str,
    bullets: list[str],
    items: list[tuple],
) -> str:
    arts = "".join(eq(*it) for it in items)
    return form_block(day, block, title, bullets) + qa_block(day, block, arts)


# ═══════════════════════════════════════════════════════════════════════════
# DAY 4 — restorative integration (2 blocks × 5)
# ═══════════════════════════════════════════════════════════════════════════

def day4() -> dict[str, str]:
    std = [
        "<b>Shape:</b> mixed restorative stem under time pressure; one best hinge from Days 1–3.",
        "<b>What they test:</b> automatic free points under ~72 s — not new encyclopedia theory.",
        "<b>Distractors:</b> neighbor concepts from wrong day (Class II Black vs Kennedy II; mucositis vs peri‑implantitis).",
        "<b>Bank signal:</b> open contact, eugenol/resin, ferrule, Kennedy/RPI, implant distances — always‑comes.",
        "<b>Your job now:</b> 5 timed‑style items. Cover answers. Misses → wrong‑book one‑liner.",
    ]
    a = pack(
        4,
        "A",
        "trap re‑lock · Days 1–3 free points",
        std,
        [
            (
                "d4a1",
                "A1",
                "A new posterior crown was cemented yesterday. The patient returns complaining that food packs tightly between the crown and the adjacent tooth. The most likely cause among the options is:",
                [
                    "Open or light proximal contact of the crown",
                    "Perfect contact with ideal embrasure form only",
                    "Shade mismatch of the ceramic alone",
                    "Using articulating paper at delivery only",
                ],
                "a",
                "Open / light proximal contact",
                "Food packing after crown = open/light contact until proven otherwise. Same hinge as Class II open contact. Fix contact — do not only polish shade.",
                "always‑comes crown failure (open contact).",
            ),
            (
                "d4a2",
                "A2",
                "A temporary restoration containing eugenol was placed. Next visit a bonded ceramic crown with resin cement is planned. The main materials concern is:",
                [
                    "Eugenol residue can inhibit free‑radical polymerization of resin if not cleaned or avoided",
                    "Eugenol always strengthens resin cement bond",
                    "Eugenol only changes ceramic shade, never chemistry",
                    "Resin cement requires eugenol as its catalyst",
                ],
                "a",
                "Eugenol can inhibit resin set",
                "Clean thoroughly or use non‑eugenol temp when resin cement/composite is planned. Day‑1 and Day‑2 free point under time.",
                "materials conflict (eugenol vs resin).",
            ),
            (
                "d4a3",
                "A3",
                "Ferrule effect for a crowned endodontically treated tooth best refers to which of the following?",
                [
                    "Circumferential sound tooth structure height engaged by the crown that improves fracture resistance",
                    "Only the post length inside the canal with no coronal tooth left",
                    "Cement brand name only",
                    "Shade of the provisional only",
                ],
                "a",
                "Circumferential sound tooth height for the crown",
                "Target often ≈1.5–2 mm sound tooth. Post retains core; it does not replace ferrule. Inadequate ferrule → lengthen/extrude/rethink — not longer post only.",
                "ferrule banks (fixed).",
            ),
            (
                "d4a4",
                "A4",
                "A partially edentulous mandible has bilateral free‑end (distal extension) saddles posterior to remaining teeth. Kennedy classification is:",
                [
                    "Kennedy Class I",
                    "Kennedy Class II",
                    "Kennedy Class III",
                    "Kennedy Class IV",
                ],
                "a",
                "Kennedy Class I — bilateral distal extension",
                "I bilateral free‑end · II unilateral free‑end · III tooth‑bounded posterior · IV single anterior crossing midline. Do not confuse with Black Class II.",
                "Kennedy free points.",
            ),
            (
                "d4a5",
                "A5",
                "Commonly taught implant safety distances include approximately which trio among the options?",
                [
                    "IAN ≈2 mm · implant–tooth ≈1.5 mm · implant–implant ≈3 mm",
                    "IAN ≈0.1 mm · implant–tooth ≈10 mm · implants must touch",
                    "No spacing rules exist in implant planning",
                    "Only shade of the abutment matters for spacing",
                ],
                "a",
                "2 / 1.5 / ~3 mm spacing triad",
                "Memorize cold for timed blocks. Violate IAN → paresthesia risk; cramped implants → bone/papilla loss.",
                "implant spacing always‑comes.",
            ),
        ],
    )
    b = pack(
        4,
        "B",
        "always‑comes sheet · pace under 72 s",
        std,
        [
            (
                "d4b1",
                "B1",
                "Rubber dam sheet shows wrinkles/folds between two teeth being restored. The most likely cause is that the punched holes were:",
                [
                    "Too far apart",
                    "Too close together",
                    "Always caused only by an oversized clamp",
                    "Always caused only by a sheet that is too thick",
                ],
                "a",
                "Holes too far apart → wrinkles",
                "Excess dam bags and wrinkles. Holes too close stretch/tear. Free operative point — answer in under 20 seconds on exam day.",
                "always‑comes dam wrinkles.",
            ),
            (
                "d4b2",
                "B2",
                "An anterior highly polishable restoration fractures under load; original material was microfilled composite. Best replacement class among the options is:",
                [
                    "Hybrid / nanohybrid (strength + acceptable polish)",
                    "Another pure microfill only for maximum strength",
                    "Unfilled bonding resin alone as the entire restoration",
                    "Zinc oxide eugenol as definitive esthetic material",
                ],
                "a",
                "Hybrid / nanohybrid",
                "Microfill = polish ↑ strength ↓. Load/fracture → hybrid. Classic أبطال composite table stem.",
                "microfill → hybrid.",
            ),
            (
                "d4b3",
                "B3",
                "RPI clasp system components on a distal‑extension abutment are classically:",
                [
                    "Mesial rest, distal proximal plate, and I‑bar retentive arm",
                    "Ring clasp only without rests",
                    "Only wrought wire on centrals with no rest",
                    "Embrasure clasps alone without plate",
                ],
                "a",
                "RPI = mesial Rest + Proximal plate + I‑bar",
                "Stress‑releasing design for free‑end. Distal rest + rigid cast circumferential can torque abutments on Class I/II.",
                "RPI picker.",
            ),
            (
                "d4b4",
                "B4",
                "On a 200‑item timed exam (~4 hours), a practical average pace is about 72 seconds per question. The best strategy when a hard item stalls you past ~90 seconds is:",
                [
                    "Flag it, pick a provisional best answer if needed, and move — protect easy free points later",
                    "Stay on it for 8 minutes until perfect certainty every time",
                    "Leave all hard items blank forever without flagging",
                    "Abandon the rest of the exam after one hard stem",
                ],
                "a",
                "Flag · move · protect easy points",
                "Day‑4 pace rule: easy under ~40–50 s; hard flag by ~90 s. Do not donate five free points to one ego item.",
                "exam pace strategy (72 s).",
            ),
            (
                "d4b5",
                "B5",
                "After a timed restorative set you miss five items. The wrong‑book method that multiplies Day 4 is:",
                [
                    "Write one clear hinge rule per miss and drill those rules — not only re‑read the whole PDF",
                    "Ignore misses and only celebrate correct answers",
                    "Copy the full textbook chapter for every miss without a one‑line rule",
                    "Delete the score and never review",
                ],
                "a",
                "One hinge rule per miss → drill",
                "Wrong book = stem hinge → rule. Integration day fails if you only re‑read theory. Volume + written hinges win SDLE.",
                "wrong‑book method (Day 4 core).",
            ),
        ],
    )
    return {"A": a, "B": b}


# ═══════════════════════════════════════════════════════════════════════════
# DAY 5 — perio
# ═══════════════════════════════════════════════════════════════════════════

def day5() -> dict[str, str]:
    def bullets(topic: str) -> list[str]:
        return [
            f"<b>Shape:</b> short stem or mini‑case on {topic}; four options; one definition hinge.",
            "<b>What they test:</b> stage ≠ grade, CAL vs PD, furcation grade, smoking/DM modifiers, peri‑implant language.",
            "<b>Distractors:</b> swap stage with grade; call mucositis peri‑implantitis; treat PD as CAL without recession math.",
            "<b>Bank signal:</b> 2017 stage/grade, Glickman, enlargement triad, SRP → re‑eval, mucositis vs peri‑implantitis.",
            "<b>Your job now:</b> 5 items. Cover answers. ≥4/5 before next block.",
        ]

    a = pack(
        5,
        "A",
        "2017 stage/grade · CAL · furcation",
        bullets("classification / measurement"),
        [
            (
                "d5a1",
                "A1",
                "In the 2017 periodontitis classification, which statement correctly separates stage from grade?",
                [
                    "Stage describes severity/complexity of disease; grade describes rate of progression / risk of progression",
                    "Stage and grade are identical words with the same meaning on every stem",
                    "Grade only means pocket depth in millimeters with no risk concept",
                    "Stage only means the patient’s age at first visit",
                ],
                "a",
                "Stage = severity/complexity · Grade = progression rate/risk",
                "Stage I–IV from severity/complexity (CAL, bone loss, tooth loss, complexity factors). Grade A/B/C from progression evidence and risk (smoking, DM). Never swap the words under speed.",
                "2017 classification free points.",
            ),
            (
                "d5a2",
                "A2",
                "Clinical attachment level (CAL) differs from probing depth (PD) because CAL accounts for the position of the gingival margin relative to the CEJ. When there is recession, a useful relationship is:",
                [
                    "CAL ≈ PD + recession (when margin is apical to CEJ) — attachment loss is not just the pocket number",
                    "CAL is always identical to PD in every patient with no exception",
                    "CAL ignores the CEJ and only measures soft tissue color",
                    "PD always equals bone loss in millimeters on every radiograph",
                ],
                "a",
                "CAL uses CEJ reference; PD alone can mislead with recession/enlargement",
                "Enlarged gingiva can give deep PD with less true CAL; recession can hide severity if you only quote PD. Banks test measurement literacy.",
                "CAL vs PD stems.",
            ),
            (
                "d5a3",
                "A3",
                "Glickman furcation Class II is best described as:",
                [
                    "Cul‑de‑sac involvement into the furcation that does not go through‑and‑through to the other side",
                    "Incipient catch only with no horizontal component",
                    "Through‑and‑through furcation involvement (Class III)",
                    "Only soft‑tissue inflammation with zero bone loss ever",
                ],
                "a",
                "Class II = cul‑de‑sac (not through‑and‑through)",
                "I incipient · II cul‑de‑sac · III through‑and‑through · IV through‑and‑through + visible recession. Say four words each until automatic.",
                "Glickman furcation grades.",
            ),
            (
                "d5a4",
                "A4",
                "A patient has interdental CAL consistent with Stage III complexity and also smokes heavily with rapid destruction pattern. Which pair is most coherent?",
                [
                    "Stage reflects severity/complexity; grade (e.g. C) can be raised by smoking / rapid progression risk",
                    "Smoking changes only the shade of calculus, never grade",
                    "Stage is deleted when the patient smokes",
                    "Grade replaces the need for any CAL measurement",
                ],
                "a",
                "Keep stage for severity; modify grade for progression/risk",
                "Smoking and diabetes are grade modifiers / risk factors. Do not “stage = smoker.” Separate the axes.",
                "stage + grade modifiers.",
            ),
            (
                "d5a5",
                "A5",
                "Miller Class I recession (classic teaching) is characterized by which hinge among the options?",
                [
                    "Recession not extending to the mucogingival junction; interdental bone/soft tissue generally intact — good graft prognosis classically",
                    "Recession to/beyond MGJ with severe interdental bone loss always (worst prognosis class)",
                    "Only furcation Class IV with no soft tissue change",
                    "Only implant peri‑implantitis by definition",
                ],
                "a",
                "Miller I = not to MGJ; interdental intact → better prognosis",
                "Higher Miller classes worsen with MGJ involvement and interdental loss. Know I vs worse for exam pickers; details of every subclass less critical than the hinge.",
                "Miller recession (brief).",
            ),
        ],
    )
    b = pack(
        5,
        "B",
        "biofilm · smoking/DM · SRP · old aggressive map",
        bullets("etiology / therapy map"),
        [
            (
                "d5b1",
                "B1",
                "Which statement best separates dental biofilm from calculus in periodontal disease logic?",
                [
                    "Biofilm is the primary etiologic living community; calculus is mineralized deposit that harbors biofilm and must be removed but is not the sole living cause by itself",
                    "Calculus is alive and biofilm is only stain",
                    "Neither relates to periodontitis in any modern classification",
                    "Scaling removes only enamel and never calculus",
                ],
                "a",
                "Biofilm = living driver · calculus = mineralized niche",
                "Disrupt biofilm + remove calculus. Host response determines destruction pattern. Banks hate “calculus alone = all disease” oversimplification and “ignore calculus” equally.",
                "biofilm vs calculus.",
            ),
            (
                "d5b2",
                "B2",
                "A heavy smoker may show less bleeding on probing than expected for the pocket depths present. The exam hinge is:",
                [
                    "Smoking can mask BOP / vascular response — do not assume healthy tissue from low BOP alone in smokers",
                    "Smokers never get periodontitis",
                    "Low BOP in a smoker always proves Grade A slow disease only",
                    "BOP is irrelevant in every periodontal exam",
                ],
                "a",
                "Smoking can mask BOP — do not be fooled",
                "Smoking worsens perio risk/progression yet can reduce overt bleeding. Pair with grade risk. Examine attachment, bone, and risk factors — not BOP alone.",
                "smoking BOP trap.",
            ),
            (
                "d5b3",
                "B3",
                "After thorough SRP, when should you typically re‑evaluate periodontal response before deciding surgery for residual deep pockets (classic teaching window)?",
                [
                    "Weeks later (often taught ~4–6 weeks) after hygiene phase — not the same afternoon as SRP only",
                    "Two minutes after the last scaling stroke always",
                    "Ten years later with no interim care",
                    "Never re‑evaluate; extract all residual pocket teeth immediately",
                ],
                "a",
                "Re‑eval weeks after SRP (classic ~4–6 wk window)",
                "Healing and hygiene change PD/BOP. Residual deep PD + anatomy/furcation after good cause‑related therapy → surgery/regenerative options case‑based. Do not skip re‑eval.",
                "SRP → re‑eval timing.",
            ),
            (
                "d5b4",
                "B4",
                "Old “aggressive periodontitis” patterns in a young patient with rapid destruction often map in 2017 language most closely toward:",
                [
                    "Higher grade (e.g. Grade C) periodontitis — rapid progression / risk — not a totally separate forever disease name on every new stem",
                    "Only gingivitis with zero attachment loss by definition",
                    "Only peri‑implant mucositis",
                    "Only necrotizing disease in every case without exception",
                ],
                "a",
                "Old aggressive ≈ molar‑incisor / rapid → high grade map",
                "2017 unified periodontitis with stage+grade. “Aggressive” history → think rapid Grade C patterns + local factors. Still treat infection + risk.",
                "old aggressive → 2017 map.",
            ),
            (
                "d5b5",
                "B5",
                "Diabetes mellitus and periodontitis are best described for exam purposes as:",
                [
                    "Bidirectional relationship — poor glycemic control worsens perio; perio inflammation can impair glycemic control",
                    "Completely unrelated in all guidelines",
                    "Only diabetes helps periodontal health always",
                    "Only a shade‑matching problem for crowns",
                ],
                "a",
                "Bidirectional DM ↔ periodontitis",
                "Grade modifier / risk. Control medical disease + perio therapy. Same mindset as implant planning in uncontrolled DM (Day 2 carry).",
                "diabetes bidirectional free point.",
            ),
        ],
    )
    c = pack(
        5,
        "C",
        "enlargement · biologic width · peri‑implant · abx/trauma",
        bullets("medical + implant + adjuncts"),
        [
            (
                "d5c1",
                "C1",
                "Drug‑induced gingival enlargement classically associates with which drug triad among the options?",
                [
                    "Phenytoin, calcium channel blockers (e.g. nifedipine), and cyclosporine",
                    "Paracetamol, amoxicillin, and fluoride varnish only",
                    "Only topical chlorhexidine forever",
                    "Only vitamin C deficiency with no drug list",
                ],
                "a",
                "Phenytoin · CCBs · cyclosporine",
                "Memorize the triad cold. Management: OH, debridement, medical consult for drug alternatives, surgery if needed. High‑yield medical free point.",
                "gingival enlargement triad.",
            ),
            (
                "d5c2",
                "C2",
                "Biologic width (supracrestal tissue attachment) violation by a deep crown margin classically leads to:",
                [
                    "Chronic gingival inflammation around the restoration until the margin relationship is corrected",
                    "Automatic perfect periodontal health always",
                    "Only enamel hypoplasia of adjacent teeth",
                    "Only a change in tooth shade without soft tissue effect",
                ],
                "a",
                "Deep margin invading width → chronic inflammation",
                "≈2 mm soft tissue attachment concept above bone. Fix with crown lengthening / remake margin position. Fixed–perio crossover (Day 2 + Day 5).",
                "biologic width violation.",
            ),
            (
                "d5c3",
                "C3",
                "Peri‑implant mucositis is best distinguished from peri‑implantitis by:",
                [
                    "Mucositis = inflammation of soft tissue without progressive crestal bone loss; peri‑implantitis includes progressive bone loss with inflammation",
                    "Mucositis always shows cratering bone loss; peri‑implantitis never bleeds",
                    "Both terms are identical on every exam stem",
                    "Peri‑implantitis means only abutment shade mismatch",
                ],
                "a",
                "Mucositis soft‑only · peri‑implantitis + progressive bone loss",
                "Parallel gingivitis vs periodontitis. Do not mix language. Hygiene/debridement emphasis for mucositis; bone‑loss‑aware care for peri‑implantitis.",
                "peri‑implant definitions.",
            ),
            (
                "d5c4",
                "C4",
                "Systemic antibiotics in periodontitis are best framed among the options as:",
                [
                    "Adjunct in selected cases (e.g. aggressive/severe patterns, specific diagnoses) — not a replacement for SRP and home care in routine chronic cases",
                    "First‑line sole therapy instead of any mechanical debridement always",
                    "Required for every 4 mm pocket forever",
                    "Contraindicated in all dental patients always",
                ],
                "a",
                "Abx adjunct selected cases — not SRP replacement",
                "Cause‑related mechanical therapy first. Abx stems want “adjunct / specific situations,” not “pills alone cure perio.”",
                "antibiotics role in perio.",
            ),
            (
                "d5c5",
                "C5",
                "Primary occlusal trauma vs secondary occlusal trauma — the hinge is:",
                [
                    "Primary = excessive force on a tooth with normal support; secondary = normal or excessive force on a tooth with reduced support (periodontitis)",
                    "Primary always means the tooth is already periodontally hopeless only",
                    "Secondary means the patient has never had teeth",
                    "Occlusal trauma alone always causes pocketing identical to pure plaque periodontitis without nuance",
                ],
                "a",
                "Primary = normal support + excess force · Secondary = reduced support",
                "Occlusal trauma can widen PDL / mobility patterns; treat inflammation and forces. Banks test the definition pair more than elaborate equilibration recipes.",
                "occlusal trauma primary vs secondary.",
            ),
        ],
    )
    return {"A": a, "B": b, "C": c}


# ═══════════════════════════════════════════════════════════════════════════
# DAY 6 — endo
# ═══════════════════════════════════════════════════════════════════════════

def day6() -> dict[str, str]:
    def bullets(t: str) -> list[str]:
        return [
            f"<b>Shape:</b> diagnosis language or procedure hinge on {t}.",
            "<b>What they test:</b> reversible vs irreversible vs necrosis; SAP vs AAP; irrigant jobs; apexogenesis vs apexification; trauma media/splint.",
            "<b>Distractors:</b> treat irreversible with bigger filling; mix NaOCl+CHX; reimplant primary avulsion.",
            "<b>Bank signal:</b> lingering cold · NaOCl/EDTA/CHX · precipitate · avulsion medium · flexible splint.",
            "<b>Your job now:</b> 5 items. Cover. ≥4/5 next block.",
        ]

    a = pack(
        6,
        "A",
        "pulp · apical diagnoses · tests",
        bullets("diagnosis"),
        [
            (
                "d6a1",
                "A1",
                "A patient has brief sharp pain to cold that stops within seconds when the stimulus is removed; no spontaneous night pain. The best pulp diagnosis language among the options is:",
                [
                    "Reversible pulpitis pattern — remove cause and restore; monitor",
                    "Necrotic pulp with acute apical abscess requiring extraction only always",
                    "Irreversible pulpitis with lingering thermal pain (opposite of this stem)",
                    "Normal pulp with no need to examine caries",
                ],
                "a",
                "Reversible = brief provoked pain that resolves quickly",
                "Irreversible = lingering thermal / spontaneous / night pain → endo path. Necrosis = no vital response (with caveats). Match language to stem.",
                "pulp diagnosis free points.",
            ),
            (
                "d6a2",
                "A2",
                "Lingering pain to cold for minutes and spontaneous night pain most strongly suggests:",
                [
                    "Symptomatic irreversible pulpitis — endodontic treatment path, not a bigger composite alone",
                    "Reversible pulpitis only with fluoride varnish as sole therapy always",
                    "Completely normal pulp with no treatment ever",
                    "Only periodontal abscess with vital asymptomatic pulp always",
                ],
                "a",
                "Irreversible pulpitis → endo path",
                "Do not “fill over” lingering spontaneous pulp pain. Diagnose pulp + apical status together.",
                "irreversible pulpitis hinge.",
            ),
            (
                "d6a3",
                "A3",
                "Symptomatic apical periodontitis (SAP) classically features which hinge versus a tooth with a chronic apical radiolucency that is not tender?",
                [
                    "SAP = painful to biting/percussion (inflammation of apical periodontium); chronic apical periodontitis often a radiolucency that may be asymptomatic to percussion",
                    "SAP never has percussion pain by definition",
                    "Radiolucency always means the pulp is vital and reversible only",
                    "Apical diagnoses replace the need for any pulp testing",
                ],
                "a",
                "SAP = bite/percussion pain · chronic often silent RL",
                "Pair pulp diagnosis + apical diagnosis. Acute apical abscess = swelling/pus pathway. AAA vs SAP vs AAP language must be cold.",
                "apical diagnosis pairing.",
            ),
            (
                "d6a4",
                "A4",
                "A cold test on a tooth with a full gold crown is difficult. Among options, a useful approach concept is:",
                [
                    "Use best available vitality testing (cold on accessible metal/tooth, EPT, compare control teeth) and combine with history, percussion, and radiographs — do not invent vitality from color alone",
                    "Assume every crowned tooth is necrotic without testing",
                    "Never test crowned teeth; always extract",
                    "Vitality tests are illegal on exams",
                ],
                "a",
                "Combine tests + history + radiograph; control teeth",
                "No single test is perfect. Isolation, control teeth, and concordance win. Banks punish one‑test dogma.",
                "vitality testing literacy.",
            ),
            (
                "d6a5",
                "A5",
                "Percussion tenderness is most useful as a signal of:",
                [
                    "Apical periodontium inflammation / periradicular involvement (or traumatic occlusion) — not a pure “enamel only” finding",
                    "Only the shade of the temporary filling",
                    "Only whether the patient flosses",
                    "Only the brand of rubber dam clamp",
                ],
                "a",
                "Percussion → apical periodontium / occlusion issues",
                "Palpation helps buccal apical soft tissue. Vertical root fracture and high occlusion also enter differential with bite pain. Integrate, do not single‑label blindly.",
                "percussion/palpation hinges.",
            ),
        ],
    )
    b = pack(
        6,
        "B",
        "WL · irrigants · obturation · mishaps",
        bullets("chemo‑mechanical therapy"),
        [
            (
                "d6b1",
                "B1",
                "The classical working length target among options is at or near the:",
                [
                    "Apical constriction (minor apical diameter) — not arbitrarily 5 mm beyond the radiographic apex every case",
                    "Halfway down the crown only",
                    "Only the pulp horn orifices with no canal length",
                    "Random length without any reference",
                ],
                "a",
                "WL ≈ apical constriction",
                "Apex locator + radiograph concepts. Overextension risks; underextension leaves debris. Constriction is the teaching target.",
                "working length / constriction.",
            ),
            (
                "d6b2",
                "B2",
                "Sodium hypochlorite (NaOCl) primary endodontic job among the options is:",
                [
                    "Dissolve organic tissue / disinfect (with caveats on extrusion injury)",
                    "Only remove the inorganic smear layer like EDTA’s main classic role",
                    "Only set the sealer chemically as a catalyst",
                    "Only radiopaque dye for every canal",
                ],
                "a",
                "NaOCl = organic dissolution + disinfection",
                "EDTA = chelate / smear (inorganic). CHX = antimicrobial substantivity stories. Never mix NaOCl + CHX in canal → brown/orange precipitate (para‑chloroaniline concern).",
                "irrigant triad + precipitate trap.",
            ),
            (
                "d6b3",
                "B3",
                "If NaOCl and chlorhexidine are mixed in the canal, the classic exam problem is:",
                [
                    "A precipitate forms (brown/orange) that can occlude tubules and raise toxic concern — avoid sequential mixing without intermediate flush strategy",
                    "They form a perfect synergistic colorless solution always recommended",
                    "They create free gold inside the canal",
                    "Nothing ever happens chemically",
                ],
                "a",
                "NaOCl + CHX → precipitate — do not mix",
                "Flush/intermediate rinse teaching varies by protocol, but the exam hinge is “do not mix → precipitate.”",
                "NaOCl+CHX precipitate.",
            ),
            (
                "d6b4",
                "B4",
                "MB2 canal in maxillary molars is classically found:",
                [
                    "In the mesial half of the access toward the MB system — miss it → failure of “RCT done” stems",
                    "Only in mandibular incisors always",
                    "Never present in any maxillary molar",
                    "Only after obturation cement has set for one year",
                ],
                "a",
                "MB2 in maxillary molar MB complex — look for it",
                "Access outline and negotiation matter. Missed canal = residual infection. High‑yield anatomy free point.",
                "MB2 miss trap.",
            ),
            (
                "d6b5",
                "B5",
                "A separated file deep in a canal — the best immediate exam attitude among the options is:",
                [
                    "Inform the patient; attempt bypass/removal when feasible; do not irrigate aggressively past a blockage blindly; assess restorability and referral if needed",
                    "Hide the event and never document",
                    "Always extract the same hour without discussion",
                    "Ignore and obturate over without any attempt or disclosure",
                ],
                "a",
                "Disclose · attempt manage/bypass · refer as needed",
                "Prevention > drama. Ledge/perforation also need honest management. Banks test ethics + endo judgment together sometimes.",
                "file separation management.",
            ),
        ],
    )
    c = pack(
        6,
        "C",
        "immature apex · trauma · resorption/VRF",
        bullets("trauma / immature apex"),
        [
            (
                "d6c1",
                "C1",
                "Apexogenesis vs apexification — the correct hinge is:",
                [
                    "Apexogenesis preserves vital pulp tissue to allow continued root development; apexification induces a hard barrier in a non‑vital immature tooth",
                    "Both words always mean extract immediately",
                    "Apexification requires a vital pulp always",
                    "Apexogenesis is only for fully mature apex teeth with prior RCT",
                ],
                "a",
                "Apexogenesis = vital grow · apexification = non‑vital barrier",
                "MTA/bioceramic appear in both modern protocols. Vital immature trauma/pulpitis paths lean apexogenesis/regenerative concepts when indicated.",
                "apexogenesis vs apexification.",
            ),
            (
                "d6c2",
                "C2",
                "For an avulsed permanent tooth with extra‑oral dry time considerations, the best storage medium concept among options is:",
                [
                    "Physiologic media (e.g. milk, Hank’s balanced salt solution, saline) better than dry pocket storage — replant ASAP with flexible splint protocols",
                    "Dry paper towel for 24 hours is ideal storage always",
                    "Household bleach as storage medium of choice",
                    "Never replant permanent teeth under any guideline",
                ],
                "a",
                "Wet physiologic media · replant ASAP · flexible splint",
                "Dry time drives PDL survival and ankylosis/resorption risk. Flexible splint often ~2 weeks classically (protocol nuances). Primary teeth generally not reimplanted.",
                "avulsion media + dry time.",
            ),
            (
                "d6c3",
                "C3",
                "Primary tooth avulsion management free point among the options is:",
                [
                    "Do not reimplant primary teeth (risk to permanent successor) — manage space/soft tissue and monitor successor",
                    "Always reimplant primary teeth identically to permanent guidelines",
                    "Primary avulsion always needs RCT of the permanent bud the same day",
                    "Ignore completely without soft tissue care",
                ],
                "a",
                "Primary avulsion → generally do not reimplant",
                "Protect permanent follicle. Different from permanent avulsion algorithm. Day 9 trauma overlaps — lock both.",
                "primary vs permanent avulsion.",
            ),
            (
                "d6c4",
                "C4",
                "Vertical root fracture (VRF) classic exam flags include:",
                [
                    "Deep narrow isolated probing defect, J‑shaped or halo bone loss patterns, often post‑restored tooth — poor perio‑endo prognosis often leading to extraction",
                    "Only reversible pulpitis with no probing change ever",
                    "Only white sponge nevus of the cheek",
                    "Always cured by antibiotics alone",
                ],
                "a",
                "Isolated deep probing + J‑shaped bone loss ± post tooth",
                "Do not endless endo redo when VRF is the real diagnosis. Banks mix with perio‑endo lesions.",
                "VRF flags.",
            ),
            (
                "d6c5",
                "C5",
                "External inflammatory root resorption after trauma is most associated among options with:",
                [
                    "Infected necrotic pulp maintaining inflammation after injury — control infection / endo when indicated as part of management logic",
                    "Perfectly vital pulp with no bacterial role ever in all cases",
                    "Only fluoride varnish excess on enamel",
                    "Only orthodontic elastic wear for one day",
                ],
                "a",
                "Infection + damaged root surface → inflammatory resorption logic",
                "Differentiate replacement (ankylosis) vs inflammatory resorption stories. Trauma table free points win multi‑item slices.",
                "resorption after trauma.",
            ),
        ],
    )
    return {"A": a, "B": b, "C": c}


# ═══════════════════════════════════════════════════════════════════════════
# DAY 7 — OMS / LA
# ═══════════════════════════════════════════════════════════════════════════

def day7() -> dict[str, str]:
    def bullets(t: str) -> list[str]:
        return [
            f"<b>Shape:</b> OMS/LA stem on {t}.",
            "<b>What they test:</b> dry socket timing, anticoagulant local control, Winter/Pell‑Gregory, Ludwig, ZMC, MRONJ, LA dose/toxicity.",
            "<b>Distractors:</b> treat dry socket as Ludwig; stop warfarin for simple extraction without thinking; miss amide allergy vs ester.",
            "<b>Bank signal:</b> dry socket 2–4 d · warfarin local · lido max · Ludwig airway · ZMC diplopia.",
            "<b>Your job now:</b> 5 items. Cover. ≥4/5.",
        ]

    a = pack(
        7,
        "A",
        "extraction · 3rd molars · dry socket · bleeding",
        bullets("exodontia basics"),
        [
            (
                "d7a1",
                "A1",
                "Alveolar osteitis (dry socket) typically presents how many days after extraction, and with which hinge treatment idea?",
                [
                    "Often day 2–4 with severe pain; irrigate gently + medicated dressing + analgesia — not automatic IV antibiotics for every simple dry socket",
                    "Always within 30 minutes of extraction with fever and airway compromise only",
                    "Only after six months with no pain ever",
                    "Always requires immediate neck dissection",
                ],
                "a",
                "Day 2–4 severe pain · dressing + analgesia",
                "Not the same as normal day‑0 pain. Not Ludwig. Clot lost / fibrinolysis story. Prevention: trauma control, instructions, smoking risk.",
                "dry socket free point.",
            ),
            (
                "d7a2",
                "A2",
                "A patient on stable warfarin needs a simple extraction. INR is in a therapeutic acceptable range for the procedure per medical context. The classic exam attitude is:",
                [
                    "Often continue anticoagulant and use local hemostatic measures (pack, suture, pressure, agents) rather than routine abrupt stop without medical plan",
                    "Always stop warfarin for 30 days before any extraction without consulting anyone",
                    "Always hospitalize for every class I mobility extraction without local measures",
                    "Antibiotics alone replace hemostasis",
                ],
                "a",
                "Local hemostasis · coordinate — do not casual stop",
                "Risk of thrombosis vs bleeding. Local measures are high‑yield. Newer DOACs have their own timing rules — stem will hint.",
                "anticoagulant + extraction.",
            ),
            (
                "d7a3",
                "A3",
                "Winter’s classification of impacted third molars primarily describes:",
                [
                    "Angulation of the third molar relative to the long axis of the second molar (mesioangular, vertical, horizontal, distoangular, etc.)",
                    "Only the patient’s blood type",
                    "Only Pell‑Gregory ramus relationship with no angulation concept",
                    "Only the shade of enamel",
                ],
                "a",
                "Winter = angulation",
                "Pell‑Gregory = ramus relationship (1–3) + depth (A–C). Both appear. Mesioangular often “easier” story; horizontal/distoangular harder patterns.",
                "Winter vs Pell‑Gregory.",
            ),
            (
                "d7a4",
                "A4",
                "Pell and Gregory Class II (ramus relationship) means approximately:",
                [
                    "Approximately half of the crown is covered by the ramus (intermediate) — between Class I (enough room) and Class III (all/most in ramus)",
                    "The tooth is fully erupted in the arch always",
                    "Only soft tissue impaction with zero bone",
                    "Only maxillary teeth by definition",
                ],
                "a",
                "Class II ramus ≈ partial coverage by ramus",
                "Class I space OK · II partial · III in ramus. Depth A/B/C separate axis. Difficulty rises with III + C patterns.",
                "Pell‑Gregory free point.",
            ),
            (
                "d7a5",
                "A5",
                "Absolute or strong relative medical contraindications / cautions for elective extraction include which exam‑style idea among options?",
                [
                    "Uncontrolled systemic disease, acute uncontrolled infection contexts case‑based, recent radiation to jaws with MRONJ/ORN risk planning — stabilize and plan, do not heroically extract blindly",
                    "Every controlled hypertensive patient can never have dentistry",
                    "Local anesthesia is forbidden in all adults forever",
                    "Only shade mismatch is a contraindication",
                ],
                "a",
                "Uncontrolled systemic disease / special jaw risks → plan first",
                "Indications vs contraindications stems test judgment. Uncontrolled DM, bleeding disorders, bisphosphonate/radiation history change the plan.",
                "extraction ind/contraind.",
            ),
        ],
    )
    b = pack(
        7,
        "B",
        "spaces · fractures · MRONJ · LA basics",
        bullets("infections / fractures / LA"),
        [
            (
                "d7b1",
                "B1",
                "Ludwig’s angina is best defined among the options as:",
                [
                    "Bilateral rapidly spreading cellulitis of submandibular / sublingual / submental spaces with airway risk — emergency",
                    "A mild dry socket on day 3 only",
                    "Only a maxillary sinus cold",
                    "Only reversible pulpitis of one incisor",
                ],
                "a",
                "Bilateral floor‑of‑mouth space infection · airway emergency",
                "Source control + airway + antibiotics. Do not call every post‑op pain Ludwig. High‑stakes free point.",
                "Ludwig definition.",
            ),
            (
                "d7b2",
                "B2",
                "Zygomaticomaxillary complex (ZMC) fracture classic exam symptom among options is:",
                [
                    "Diplopia / infraorbital nerve sensory change / step deformity / limited mandibular movement patterns — orbital floor involvement stories",
                    "Only dry socket of a lower third molar",
                    "Only reversible pulpitis",
                    "Only gingival hyperplasia from phenytoin",
                ],
                "a",
                "ZMC → diplopia / V2 / facial step patterns",
                "Facial fracture hooks: Le Fort levels, mandible site, ZMC orbital signs. Diplopia is a classic ZMC/orbital flag.",
                "ZMC fracture hook.",
            ),
            (
                "d7b3",
                "B3",
                "MRONJ risk is most associated among options with:",
                [
                    "Antiresorptive drugs (bisphosphonates, denosumab) and related agents — exposed bone in jaws without radiation as the classic contrast to ORN",
                    "Only fluoride toothpaste at normal doses",
                    "Only orthodontic elastics for one week",
                    "Only reversible pulpitis treatment",
                ],
                "a",
                "Bisphosphonates / denosumab → MRONJ risk",
                "ORN = radiation history. MRONJ = meds, no RT required. Prevention and atraumatic care matter. Day 8 will re‑lock vs ORN.",
                "MRONJ drug association.",
            ),
            (
                "d7b4",
                "B4",
                "Lidocaine with epinephrine maximum dose concepts on exams usually hinge on:",
                [
                    "Weight‑based maximums (commonly taught ~7 mg/kg with epi in healthy adults for lido — know the stem’s number and do not exceed)",
                    "Unlimited cartridges for every child always",
                    "Zero maximum because amide LA has no toxicity",
                    "Only the color of the cartridge band without dose math",
                ],
                "a",
                "Weight‑based max dose — do not exceed",
                "Toxicity: CNS excitation then depression, cardiovascular effects. Aspirate, slow inject. Know amide vs ester metabolism stories.",
                "LA max dose.",
            ),
            (
                "d7b5",
                "B5",
                "Ester vs amide local anesthetics — a classic allergy‑history hinge is:",
                [
                    "True allergy more often discussed with esters (PABA) than modern amides; if true amide allergy rare — choose carefully / alternatives; do not assume every “reaction” is allergy",
                    "Amides and esters are chemically identical always",
                    "All LA are esters only in modern cartridges",
                    "Allergy history never matters for LA choice",
                ],
                "a",
                "Esters ↔ PABA allergy stories · amides more common clinically",
                "Lidocaine, articaine (amide with ester side‑chain nuances), mepivacaine, bupivacaine = amide family map. Read the stem’s allergy claim carefully.",
                "amide vs ester.",
            ),
        ],
    )
    c = pack(
        7,
        "C",
        "IANB fail · toxicity · epi · emergencies",
        bullets("LA complications / emergencies"),
        [
            (
                "d7c1",
                "C1",
                "Inferior alveolar nerve block failure common reasons include:",
                [
                    "Anatomic variation, deposition too low/too far anterior, accessory innervation — correct technique / alternatives (Gow‑Gates, Akinosi, buccal infiltration adjuncts)",
                    "Only the shade of the rubber dam",
                    "Only using too much topical fluoride",
                    "IANB always works 100% if any liquid was injected anywhere in the cheek",
                ],
                "a",
                "Anatomy / deposition site / accessory innervation",
                "Do not keep dumping cartridges into the wrong place. Reassess landmarks. Banks love “why did IANB fail.”",
                "IANB failure causes.",
            ),
            (
                "d7c2",
                "C2",
                "Early local anesthetic systemic toxicity symptoms classically include:",
                [
                    "CNS signs such as tinnitus, metallic taste, agitation/circumoral numbness progressing toward seizures — stop injection, manage airway/ABC, support",
                    "Only improved vision and calmness always",
                    "Only gingival hyperplasia three months later",
                    "Only dry socket on day 3",
                ],
                "a",
                "Early CNS prodrome → stop · ABC · support",
                "Prevention: aspirate, slow, dose limits. Lipid emulsion appears in advanced management teaching for severe LAST — know your exam depth.",
                "LA toxicity sequence.",
            ),
            (
                "d7c3",
                "C3",
                "Epinephrine in LA should be used with extra caution among options in:",
                [
                    "Uncontrolled hyperthyroidism / certain severe cardiovascular states / drug interactions (e.g. nonselective beta‑blocker stories) — case‑based limits",
                    "Every healthy adult for routine care with no thought needed ever",
                    "Only patients who floss daily",
                    "Only when using fluoride varnish",
                ],
                "a",
                "Uncontrolled hyperthyroid / severe CV / interaction caution",
                "Asthma: prefer non‑irritating management; sulfite sensitivity rare cartridge stories. Pain control: paracetamol if NSAID problem (Day 2 carry).",
                "epi cautions.",
            ),
            (
                "d7c4",
                "C4",
                "First drug for anaphylaxis in the dental chair among options is:",
                [
                    "Epinephrine IM (thigh) promptly — then airway/oxygen, help, antihistamine/steroid adjuncts as protocols allow",
                    "Only oral amoxicillin slowly over hours",
                    "Only topical fluoride gel",
                    "Only a glass of cold water",
                ],
                "a",
                "Epinephrine IM first for anaphylaxis",
                "Do not delay epi for antihistamine‑only strategies in true anaphylaxis. Position, oxygen, emergency services.",
                "anaphylaxis free point.",
            ),
            (
                "d7c5",
                "C5",
                "Syncope (vasovagal) in the dental chair is best first‑line managed among options by:",
                [
                    "Supine / legs elevated, protect airway, oxygen as needed, cool compress, stop treatment — most recover; differentiate from hypoglycemia/anaphylaxis/cardiac",
                    "Immediate epinephrine IM for every faint without assessment",
                    "Immediate extraction of all remaining teeth",
                    "Ignore and continue drilling",
                ],
                "a",
                "Supine + airway + oxygen · differential",
                "Most common dental emergency. Anxiety + pain. Prevention: supine, late morning meals, good technique.",
                "syncope management.",
            ),
        ],
    )
    return {"A": a, "B": b, "C": c}


# ═══════════════════════════════════════════════════════════════════════════
# DAY 8 — path / IC / ethics
# ═══════════════════════════════════════════════════════════════════════════

def day8() -> dict[str, str]:
    def bullets(t: str) -> list[str]:
        return [
            f"<b>Shape:</b> lesion or IC/ethics stem on {t}.",
            "<b>What they test:</b> wipe test, red vs white risk, biopsy type, MRONJ vs ORN, Spaulding, consent.",
            "<b>Distractors:</b> call hairy leukoplakia thrush; ORN without radiation; sterilize dirty instruments first.",
            "<b>Bank signal:</b> wipe off · erythroplakia · cotton‑wool · ground glass · clean→disinfect→sterilize · spore BI.",
            "<b>Your job now:</b> 5 items. Cover. ≥4/5.",
        ]

    a = pack(
        8,
        "A",
        "white/red · lichen · biopsy · cysts",
        bullets("soft tissue pathology"),
        [
            (
                "d8a1",
                "A1",
                "A white oral lesion wipes off leaving a red base in a patient using inhaled steroids. The most likely diagnosis among the options is:",
                [
                    "Pseudomembranous candidiasis (thrush)",
                    "Hairy leukoplakia (does not wipe; EBV/HIV association)",
                    "Linea alba only with no yeast role",
                    "Torus palatinus",
                ],
                "a",
                "Wipes off → thrush (candidiasis)",
                "Hairy leukoplakia does not wipe; EBV + immunocompromise. Leukoplakia does not wipe and is a clinical risk term. Wipe test is the free hinge.",
                "wipe test white lesions.",
            ),
            (
                "d8a2",
                "A2",
                "Among homogeneous leukoplakia vs erythroplakia risk teaching, which is higher risk for severe dysplasia/carcinoma on classic exams?",
                [
                    "Erythroplakia (velvety red) generally higher risk than many homogeneous white leukoplakias",
                    "Linea alba is higher risk than erythroplakia always",
                    "Fordyce granules are the highest risk red lesion",
                    "All white lesions are always invasive cancer on day one",
                ],
                "a",
                "Erythroplakia > many leukoplakias for risk",
                "Red flags → biopsy/refer. Do not watchful‑wait velvety red high‑risk sites casually.",
                "erythroplakia risk.",
            ),
            (
                "d8a3",
                "A3",
                "Bilateral white striae (Wickham) on buccal mucosa in a middle‑aged patient most suggests:",
                [
                    "Oral lichen planus pattern — distinguish from lichenoid reaction next to amalgam (unilateral contact)",
                    "Only hairy leukoplakia in every bilateral striae case",
                    "Only traumatic fibroma of the tongue tip",
                    "Only torus mandibularis",
                ],
                "a",
                "Bilateral striae → lichen planus pattern",
                "Unilateral next to restoration → lichenoid contact. Blistering diseases (pemphigus/pemphigoid) different flags — flaccid vs tense, Nikolsky concepts.",
                "lichen planus vs lichenoid.",
            ),
            (
                "d8a4",
                "A4",
                "A small pedunculated fibroma on the buccal mucosa is best managed among options by:",
                [
                    "Excisional biopsy / excision of the whole small lesion (diagnosis + treatment)",
                    "Only observation forever without any option for removal when it traumatizes",
                    "Incisional sample of 10% only as mandatory for every 3 mm fibroma",
                    "Radiation therapy first line",
                ],
                "a",
                "Small accessible benign‑looking → excisional",
                "Large/suspicious/malignant‑looking → incisional representative sample + refer. Site and suspicion drive biopsy type.",
                "excisional vs incisional biopsy.",
            ),
            (
                "d8a5",
                "A5",
                "A radiolucency at the apex of a non‑vital tooth most classically suggests which cyst/inflammatory lesion family?",
                [
                    "Radicular (periapical) cyst / apical periodontitis spectrum related to pulp necrosis",
                    "Dentigerous cyst around a vital erupted central always",
                    "Nasopalatine duct cyst only when the tooth tests vital with large restorations never",
                    "Only traumatic bone cyst in every apical lucency",
                ],
                "a",
                "Non‑vital tooth apical lucency → radicular/inflammatory",
                "Dentigerous = around crown of unerupted tooth. OKC (keratocyst) recurrence stories. Vitality + location win cyst stems.",
                "common cysts.",
            ),
        ],
    )
    b = pack(
        8,
        "B",
        "bone patterns · MRONJ/ORN · medical free points",
        bullets("bone + meds"),
        [
            (
                "d8b1",
                "B1",
                "“Cotton‑wool” skull/jaw radiopaque pattern is classically associated with:",
                [
                    "Paget disease of bone",
                    "Fibrous dysplasia ground‑glass only (different classic pattern)",
                    "Only traumatic fibroma of soft tissue",
                    "Only linea alba",
                ],
                "a",
                "Cotton‑wool → Paget",
                "Ground glass → fibrous dysplasia. Mixed radiopaque COD patterns often observe if asymptomatic vital. Pattern recognition free points.",
                "cotton‑wool vs ground glass.",
            ),
            (
                "d8b2",
                "B2",
                "Ground‑glass radiographic appearance is classically linked to:",
                [
                    "Fibrous dysplasia",
                    "Only Paget cotton‑wool as the same identical pattern always",
                    "Only thrush of the tongue",
                    "Only amalgam tattoo",
                ],
                "a",
                "Ground glass → fibrous dysplasia",
                "Do not swap with Paget. Clinical + radio correlation. Syndromic fibrous dysplasia stories exist (exam depth varies).",
                "ground glass free point.",
            ),
            (
                "d8b3",
                "B3",
                "Exposed bone in the jaw after antiresorptive therapy without head‑and‑neck radiation is called:",
                [
                    "MRONJ (medication‑related osteonecrosis of the jaw)",
                    "ORN (osteoradionecrosis) which requires radiation history",
                    "Only dry socket on day 3 of a simple extraction always",
                    "Only reversible pulpitis",
                ],
                "a",
                "Meds + exposed bone no RT → MRONJ",
                "ORN needs radiation. Prevention, atraumatic dentistry, drug history. Same hinge as Day 7.",
                "MRONJ vs ORN.",
            ),
            (
                "d8b4",
                "B4",
                "Pregnancy‑associated pyogenic granuloma (pregnancy tumor) mild bleeding nodule management often starts with:",
                [
                    "Conservative OH, debridement, observation often until after delivery if mild — remove if severe bleeding/function issues",
                    "Immediate full mouth extraction always",
                    "Head and neck radiation first line",
                    "Systemic chemotherapy for every pregnancy nodule",
                ],
                "a",
                "Conservative first if mild · defer aggressive when possible",
                "Hormone‑related vascular lesion. Pair with medical free points (enlargement triad, asthma analgesic).",
                "pregnancy epulis management.",
            ),
            (
                "d8b5",
                "B5",
                "Drug‑induced gingival enlargement triad again (must be automatic on Day 8 medical slice) is:",
                [
                    "Phenytoin, calcium channel blockers, cyclosporine",
                    "Only acetaminophen, amoxicillin, and fluoride",
                    "Only epinephrine and articaine",
                    "Only vitamin D and calcium",
                ],
                "a",
                "Phenytoin · CCB · cyclosporine",
                "Same triad as perio Day 5. Medical free points recur across days — free multi‑item value.",
                "enlargement triad re‑lock.",
            ),
        ],
    )
    c = pack(
        8,
        "C",
        "IC · sterilization · ethics",
        bullets("infection control / ethics"),
        [
            (
                "d8c1",
                "C1",
                "Correct order for instrument reprocessing is:",
                [
                    "Cleaning → disinfection → sterilization (soil blocks sterilant if you skip clean)",
                    "Sterilization of visibly dirty instruments first, then clean later",
                    "Only wipe with dry cloth and call it sterile always",
                    "Skip cleaning if the autoclave is hot",
                ],
                "a",
                "Clean before sterilize",
                "Day‑1 IC carry into ethics/path day. Bioburden blocks steam. Non‑negotiable free point.",
                "clean → disinfect → sterilize.",
            ),
            (
                "d8c2",
                "C2",
                "By Spaulding classification, a scalpel blade that enters sterile tissue is:",
                [
                    "Critical — must be sterile",
                    "Noncritical — only low‑level wipe on intact skin logic",
                    "Only semi‑critical always without sterilization option",
                    "Unclassified and optional to process",
                ],
                "a",
                "Critical → sterilize",
                "Semi‑critical (mucous membrane) → sterilize or high‑level disinfect. Noncritical (intact skin) → low/intermediate. Mirror vs scalpel stems.",
                "Spaulding free point.",
            ),
            (
                "d8c3",
                "C3",
                "The biologic indicator (spore test) for sterilizers is used to:",
                [
                    "Verify sterilization process kill of highly resistant spores — strongest monitoring; run per protocol (often weekly + load types)",
                    "Only check the ink color of the exterior tape with no spore role",
                    "Replace cleaning of instruments entirely",
                    "Measure room temperature only",
                ],
                "a",
                "Spore BI = biologic proof of sterilizer efficacy",
                "Chemical indicators ≠ biologic. Failed BI → quarantine and investigate. High‑yield IC.",
                "sterilization monitoring.",
            ),
            (
                "d8c4",
                "C4",
                "Informed consent free point among options requires:",
                [
                    "Diagnosis, material risks/benefits, alternatives, and opportunity for questions — not a blank signature alone",
                    "Only the fee amount with no risk discussion ever",
                    "Guaranteeing perfect outcomes that cannot be guaranteed",
                    "Hiding complications to reduce anxiety always",
                ],
                "a",
                "Risks · benefits · alternatives · questions",
                "Autonomy + veracity. Document. Emergency exceptions exist but routine elective care needs consent.",
                "consent ethics.",
            ),
            (
                "d8c5",
                "C5",
                "A patient needs complex care beyond your skill/equipment. The ethical action is:",
                [
                    "Refer to an appropriate provider — non‑maleficence / beneficence; do not attempt heroic care outside competence",
                    "Attempt the surgery anyway without disclosure to learn",
                    "Refuse to refer and abandon without options",
                    "Alter records to hide the complexity",
                ],
                "a",
                "Refer when beyond competence",
                "Also: transplant/elective deferral when medically unstable; honesty in records. Ethics free points are easy if automatic.",
                "referral / scope ethics.",
            ),
        ],
    )
    return {"A": a, "B": b, "C": c}


# ═══════════════════════════════════════════════════════════════════════════
# DAY 9 — ortho / pedo
# ═══════════════════════════════════════════════════════════════════════════

def day9() -> dict[str, str]:
    def bullets(t: str) -> list[str]:
        return [
            f"<b>Shape:</b> ortho/pedo stem on {t}.",
            "<b>What they test:</b> Angle II/1 vs II/2, space maintainer choice, pulpotomy vs pulpectomy, fluoride rules, primary trauma.",
            "<b>Distractors:</b> distal shoe when 6 erupted; systemic F when water optimal; reimplant primary avulsion.",
            "<b>Bank signal:</b> band&loop vs distal shoe · SSC after pulp · Tell‑Show‑Do · Pierre Robin triad.",
            "<b>Your job now:</b> 5 items. Cover. ≥4/5.",
        ]

    a = pack(
        9,
        "A",
        "Angle · OJ/OB · habits",
        bullets("occlusion / habits"),
        [
            (
                "d9a1",
                "A1",
                "Angle Class II Division 1 vs Division 2 — the correct hinge is:",
                [
                    "II/1 = distal molar + proclined upper incisors / large overjet; II/2 = distal molar + retroclined upper centrals (often deep bite)",
                    "II/1 and II/2 are identical in incisor inclination always",
                    "Division only describes the mandibular midline diastema",
                    "Class II means mesiobuccal cusp in the lower groove always (that is Class I)",
                ],
                "a",
                "II/1 proclined OJ · II/2 retroclined centrals",
                "Class I MB cusp in groove. Class III MB cusp distal / mesial step patterns. Divisions only for Class II.",
                "Angle classification free points.",
            ),
            (
                "d9a2",
                "A2",
                "Overjet vs overbite — correct definitions among options:",
                [
                    "Overjet = horizontal incisor overlap; overbite = vertical incisor overlap",
                    "Overjet is vertical only; overbite is horizontal only (swapped)",
                    "Both words always mean the same measurement",
                    "Overbite only exists in complete dentures",
                ],
                "a",
                "OJ horizontal · OB vertical",
                "Crossbite = transverse/AB problem; anterior crossbite may be pseudo‑Class III from shift. Open bite = no vertical overlap.",
                "OJ/OB definitions.",
            ),
            (
                "d9a3",
                "A3",
                "A child with unilateral posterior crossbite and a functional shift of the mandible on closure — exam attitude is:",
                [
                    "Often early correction indicated to avoid asymmetric growth / habit of shift — not “wait forever if shifting”",
                    "Always ignore until age 30",
                    "Always extract all primary molars same day without diagnosis",
                    "Crossbite with shift is normal Angle Class I ideal always",
                ],
                "a",
                "Crossbite + functional shift → consider early interceptive",
                "Differentiate dental from skeletal. Expansion appliances (Haas/Hyrax) for transverse deficiency stories.",
                "crossbite + shift.",
            ),
            (
                "d9a4",
                "A4",
                "Prolonged digit‑sucking habit effects classically include:",
                [
                    "Anterior open bite, increased overjet, possible posterior crossbite / narrow maxilla patterns",
                    "Only denser enamel with no occlusal change ever",
                    "Automatic Class III with reverse OJ only always",
                    "Only gingival hyperplasia triad drugs",
                ],
                "a",
                "Open bite + OJ + possible transverse effects",
                "Stop habit for stable ortho result. Age and intensity matter. High‑level habit free point.",
                "digit habit effects.",
            ),
            (
                "d9a5",
                "A5",
                "Pseudo‑Class III idea among options is best described as:",
                [
                    "Anterior shift/functional edge‑to‑edge to crossbite that can look skeletal Class III but has a functional component — diagnose CR vs CO",
                    "True skeletal Class III that never has any dental component ever",
                    "Only Angle Class II Division 2 deep bite",
                    "Only ankylosis of primary molars",
                ],
                "a",
                "Functional shift mimicking Class III — check CR/CO",
                "Do not plan full skeletal surgery from a shift you did not diagnose. Exam depth: interceptive vs refer.",
                "pseudo‑Class III.",
            ),
        ],
    )
    b = pack(
        9,
        "B",
        "space maintainers · expansion · interceptive",
        bullets("space / interceptive"),
        [
            (
                "d9b1",
                "B1",
                "Primary second molar (E) lost early and the permanent first molar (6) is not yet erupted. The classic space maintainer is:",
                [
                    "Distal shoe (guides 6 eruption) when indicated and soft tissue/conditions allow",
                    "Band and loop only when 6 is already fully erupted and E lost (different scenario)",
                    "Nance only on the mandible always",
                    "No space maintenance ever after E loss",
                ],
                "a",
                "E lost + 6 unerupted → distal shoe (classic)",
                "E lost + 6 erupted → band and loop common. Bilateral upper often Nance; lower LLHA. Decision tree gold.",
                "distal shoe vs band&loop.",
            ),
            (
                "d9b2",
                "B2",
                "When the permanent first molar is already erupted and a primary first molar (D) is lost early with successors unerupted, a common unilateral space maintainer is:",
                [
                    "Band and loop",
                    "Distal shoe into the ramus always",
                    "Only a complete denture for the child",
                    "Only headgear without space consideration",
                ],
                "a",
                "Band and loop for unilateral loss with 6 present",
                "Know Nance (maxillary bilateral), LLHA (mandibular bilateral). Do not put distal shoe when 6 already up for the classic E‑loss stem without reading eruption status.",
                "band and loop indication.",
            ),
            (
                "d9b3",
                "B3",
                "Haas or Hyrax appliances are primarily used for:",
                [
                    "Maxillary expansion / transverse deficiency (opening midpalatal suture in growing patients)",
                    "Only bleaching enamel shade",
                    "Only endodontic irrigation",
                    "Only gingival graft harvest",
                ],
                "a",
                "Maxillary expansion (transverse)",
                "Growing patients respond better. Skeletal vs dental expansion nuances. Interceptive free point.",
                "Hyrax/Haas purpose.",
            ),
            (
                "d9b4",
                "B4",
                "Ectopic maxillary canine screening / interceptive age concept among options:",
                [
                    "Palpate/radiograph assessment in late mixed dentition (often around 9–10+ years teaching) — early detect impaction risk",
                    "Only check canines after age 40",
                    "Canines never impact so screening is useless",
                    "Only extract all primary canines at age 4 routinely without exam",
                ],
                "a",
                "Late mixed dentition canine path screening",
                "Asymmetry, non‑palpable bulge, radiographic overlap with lateral → investigate. Interceptive extract primary canine case‑based.",
                "ectopic canine screening.",
            ),
            (
                "d9b5",
                "B5",
                "A high labial frenum with a midline diastema in the mixed dentition — classic sequence idea is:",
                [
                    "Often wait for permanent canines to erupt before frenectomy decision; close space orthodontically as indicated — do not automatic cut first always",
                    "Always frenectomy at age 3 before any teeth erupt",
                    "Frenum never relates to diastema in any textbook",
                    "Only treat with systemic fluoride",
                ],
                "a",
                "Canines first often · then reassess frenum/space",
                "Sequence matters. Banks test “not frenectomy first blindly.”",
                "frenum / diastema sequence.",
            ),
        ],
    )
    c = pack(
        9,
        "C",
        "pedo pulp · SSC · fluoride · behavior · trauma",
        bullets("pedo pulp / prevention / trauma"),
        [
            (
                "d9c1",
                "C1",
                "Primary tooth with deep caries, vital pulp, no irreversible signs — indirect pulp therapy may be preferred over heroic exposure. When pulp is exposed on a vital primary tooth with restorable crown, pulpotomy is often chosen. Pulpectomy is for:",
                [
                    "Non‑vital / irreversible involvement of radicular pulp in a restorable primary tooth when indicated",
                    "Only permanent molars with perfect apexogenesis always",
                    "Only white spot remineralization without caries",
                    "Only when SSC is refused and no other option exists for enamel hypoplasia alone",
                ],
                "a",
                "Pulpectomy = non‑vital / radicular involvement path",
                "IPT conserve · pulpotomy vital coronal remove · pulpectomy canals. After pulp therapy in primary molars → SSC often definitive restoration of choice.",
                "pedo pulp ladder.",
            ),
            (
                "d9c2",
                "C2",
                "After pulpotomy on a primary molar, the preferred full‑coverage restoration among options is often:",
                [
                    "Stainless steel crown (SSC)",
                    "Only a one‑surface sealant without coverage",
                    "Only orthodontic bracket as the restoration",
                    "Only a complete denture tooth",
                ],
                "a",
                "SSC after primary pulp therapy",
                "SSC also for multi‑surface decay, developmental defects, high caries risk. Cement retention; know crimp/fit basics at exam level.",
                "SSC indication.",
            ),
            (
                "d9c3",
                "C3",
                "A child lives in an area with optimally fluoridated water and is low caries risk. Systemic fluoride supplement prescription is:",
                [
                    "Generally not indicated — avoid excess systemic F when water is already optimal",
                    "Always prescribe high‑dose systemic F regardless of water level",
                    "Systemic F replaces all toothpaste forever",
                    "Only adults need systemic F, never children",
                ],
                "a",
                "Optimal water + low risk → no systemic supplement",
                "Toothpaste amount by age; varnish for risk. Fluorosis risk from excess systemic. Free prevention point.",
                "systemic fluoride rules.",
            ),
            (
                "d9c4",
                "C4",
                "First‑line basic behavior guidance for a cooperative‑capable child among options is:",
                [
                    "Tell‑Show‑Do (and appropriate communicative guidance) before jumping to sedation for routine simple care",
                    "Immediate general anesthesia for every prophy",
                    "Restraint without any communication as first line for every child",
                    "Only written Latin instructions without demonstration",
                ],
                "a",
                "Tell‑Show‑Do first‑line communicative guidance",
                "Sedation/GA when indicated by age, extent, cooperation, medical — not default for every exam. Voice control, positive reinforcement appear in banks.",
                "behavior guidance.",
            ),
            (
                "d9c5",
                "C5",
                "Pierre Robin sequence classic triad includes:",
                [
                    "Micrognathia, glossoptosis, and airway problems / cleft palate association patterns — airway first",
                    "Only dens in dente of upper laterals",
                    "Only Angle Class II Division 2 without airway issues",
                    "Only gingival enlargement from phenytoin",
                ],
                "a",
                "Micrognathia + glossoptosis + airway (± cleft)",
                "Natal vs neonatal teeth timing. Primary avulsion not reimplanted (re‑lock Day 6). Syndromic free points are easy if triad is cold.",
                "Pierre Robin triad.",
            ),
        ],
    )
    return {"A": a, "B": b, "C": c}


# ═══════════════════════════════════════════════════════════════════════════
# Injection
# ═══════════════════════════════════════════════════════════════════════════

# (day, block) -> substring that marks insert position (insert BEFORE this)
INSERT_BEFORE: dict[int, dict[str, str]] = {
    4: {
        "A": "<h3>F. Weak‑topic triage algorithm",
        "B": "<h3>I. How to run the actual practice blocks",
    },
    5: {
        "A": "<h3>E. Biofilm, calculus, host response",
        "B": "<h3>I. Drug‑induced gingival enlargement",
        "C": "<h3>N. Finish criteria",
    },
    6: {
        "A": "<h3>E. Access, working length, apical constriction",
        "B": "<h3>I. Immature apex",
        "C": "<h3>L. Exam traps",
    },
    7: {
        "A": "<h3>E. Odontogenic space infections",
        "B": "<h3>I. IANB failures",
        "C": "<h3>K. Exam traps",
    },
    8: {
        "A": "<h3>E. Bone pattern recognition",
        "B": "<h3>H. Infection control",
        "C": "<h3>K. Exam traps",
    },
    9: {
        "A": "<h3>D. Space maintainers",
        "B": "<h3>G. Pedo pulp therapy",
        "C": "<h3>M. Exam traps",
    },
}

# Optional pomodoro line replacements (old, new) if exact old found
POMO_UPDATES: dict[int, list[tuple[str, str]]] = {
    4: [
        (
            "<li><b>Block A 40 min</b> — Read full Day‑4 page once (A–J) actively. Write gates as you go. Do not rabbit‑hole old Day‑1 PDFs during this block.</li>",
            "<li><b>Block A 40 min</b> — Read full Day‑4 page once (A–J) actively + do Exam Q&amp;A Blocks A–B when you hit those sections (cover answers first). Write gates as you go. No Day‑1 PDF rabbit holes.</li>",
        ),
    ],
    5: [
        (
            "Write gate A at end.",
            "Write gate A + Exam Q&amp;A Block A at end.",
        ),
        (
            "Write gate B.",
            "Write gate B + Exam Q&amp;A Block B.",
        ),
        (
            "Write gate C",
            "Write gate C + Exam Q&amp;A Block C",
        ),
    ],
}


def inject_day(day: int, sections: dict[str, str]) -> None:
    path = GEN / f"day{day:02d}_reading.html"
    html = path.read_text(encoding="utf-8")
    if f'data-day="{day}"' in html and "exam-form" in html:
        raise SystemExit(f"Day {day} already has exam-form — abort")

    # Insert from later positions first so indices stay valid... better: insert by search each time from end
    for block in sorted(INSERT_BEFORE[day].keys(), reverse=True):
        needle = INSERT_BEFORE[day][block]
        i = html.find(needle)
        if i < 0:
            raise SystemExit(f"Day {day} Block {block}: needle not found: {needle}")
        chunk = "\n" + sections[block].strip() + "\n\n"
        html = html[:i] + chunk + html[i:]

    for old, new in POMO_UPDATES.get(day, []):
        if old in html:
            html = html.replace(old, new, 1)

    # Generic pomo: append Exam Q&A mention if block lines exist without Exam Q
    for block in sections:
        # soft: if "Block A 45" line lacks Exam Q&A, try light touch via common patterns
        pass

    # Day 6–9: update first matching Block A/B/C read lines if present without Exam
    for block, label in [("A", "A"), ("B", "B"), ("C", "C")]:
        if block not in sections:
            continue
        # find li with Block X and 45 or 40 min READ/Read without Exam Q
        pat_old_substr = f"<b>Block {block} "
        # leave generic; day5/4 handled; for 6-9 replace actively line endings
    # Specific day 6-9 pomo replacements
    specific = {
        6: {
            "A": (
                "Do every STOP. Write 5 “if stem → answer” lines before the break.",
                "Do every STOP + Exam Q&amp;A Block A. Write 5 “if stem → answer” lines before the break.",
            ),
            "B": (
                "STOPs + bold re‑pass + write gate.",
                "STOPs + Exam Q&amp;A Block B + bold re‑pass + write gate.",
            ),
            "C": (
                "Trauma bullets need full attention.",
                "Trauma bullets need full attention + Exam Q&amp;A Block C.",
            ),
        },
        7: {
            "A": (
                "Do every STOP. Write 5 “if stem → answer” lines before the break.",
                "Do every STOP + Exam Q&amp;A Block A. Write 5 “if stem → answer” lines before the break.",
            ),
            "B": (
                "STOPs + bold re‑pass + write gate.",
                "STOPs + Exam Q&amp;A Block B + bold re‑pass + write gate.",
            ),
            "C": (
                "Toxicity sequences need full attention.",
                "Toxicity sequences need full attention + Exam Q&amp;A Block C.",
            ),
        },
        8: {
            "A": (
                "Do every STOP + write gate.",
                "Do every STOP + write gate + Exam Q&amp;A Block A.",
            ),
            "B": (
                "bone patterns, MRONJ vs ORN, pregnancy + medical free points)",
                "bone patterns, MRONJ vs ORN, pregnancy + medical free points) + Exam Q&amp;A Block B",
            ),
            "C": (
                "ethics free points, traps, finish)",
                "ethics free points, traps, finish) + Exam Q&amp;A Block C",
            ),
        },
        9: {
            "A": (
                "STOPs + write gate.",
                "STOPs + write gate + Exam Q&amp;A Block A.",
            ),
            "B": (
                "space maintainers, expansion, interceptive)",
                "space maintainers, expansion, interceptive) + Exam Q&amp;A Block B",
            ),
            "C": (
                "then M traps + N finish as sh",
                "Exam Q&amp;A Block C · then M traps + N finish as sh",
            ),
        },
    }
    if day in specific:
        for block, (old, new) in specific[day].items():
            if old in html:
                html = html.replace(old, new, 1)

    path.write_text(html, encoding="utf-8")
    forms = html.count("exam-form")
    arts = html.count('class="eq"')
    print(f"Day {day}: {len(html)} chars, forms={forms}, articles={arts}")


def main() -> None:
    builders = {
        4: day4,
        5: day5,
        6: day6,
        7: day7,
        8: day8,
        9: day9,
    }
    for d, fn in builders.items():
        inject_day(d, fn())
    print("OK — run: python3 scripts/merge_generated.py && python3 scripts/audit_lesson_depth.py")


if __name__ == "__main__":
    main()
