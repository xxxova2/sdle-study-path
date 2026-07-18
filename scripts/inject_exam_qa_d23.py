#!/usr/bin/env python3
"""Inject Day 2–3 exam-form + exam-qa (Blocks A/B/C × 5 Qs) into staging HTML
and update pomodoro map lines. Then run merge_generated.py separately.
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
    letters = "abcd"
    assert len(opts) == 4
    assert ans_letter in letters
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


def qa_block(day: int, block: str, title: str, articles: str) -> str:
    return f"""
<section class="exam-qa" data-day="{day}" data-block="{block}" data-count="5">
  <h4>Exam Q&amp;A — Block {block} (self‑test first)</h4>
  <p class="exam-qa-hint">Cover each green box. Pick a/b/c/d out loud. Then expand Answer + hinge. Target ≥4/5 before the next block.</p>

{articles}</section>
"""


# ─── Day 2 content ───────────────────────────────────────────────────────────

D2_A_FORM = form_block(
    2,
    "A",
    "prep · finish lines · ferrule / posts",
    [
        "<b>Shape:</b> short stem or mini‑case with #tooth FDI; four options; one best answer on prep geometry, margin design, or post/ferrule logic.",
        "<b>What they test:</b> the <b>hinge decision</b> (too tapered vs retentive TOC; chamfer vs shoulder vs knife; ferrule height; post only when core needs retention).",
        "<b>Distractors:</b> “pretty” knife edge on ceramic; post “to strengthen the root”; ignore open proximal contact as food packing cause.",
        "<b>Bank signal:</b> open contact after crown, ferrule 1.5–2 mm, finish‑line by material, short clinical crown strategies — free points if automatic.",
        "<b>Your job now:</b> answer the 5 items below like the exam (cover the answer). Misses → one wrong‑book line.",
    ],
)

D2_A_ARTICLES = "".join(
    [
        eq(
            "d2a1",
            "A1",
            "A full‑coverage crown preparation on tooth #46 shows excessive total occlusal convergence (very tapered walls). The most likely clinical consequence among the options is:",
            [
                "Improved retention because more taper always seats better and holds better",
                "Reduced retention/resistance form because walls become too conical for the crown to grip",
                "Automatic perfect marginal seal regardless of cement or fit",
                "Elimination of any need for adequate axial wall height or ferrule",
            ],
            "b",
            "Excessive TOC reduces retention/resistance",
            "Ideal walls are nearly parallel with a small TOC (often taught ~6–10° per wall total range concepts). Too much taper = cone that the crown slides off. Seat is easier; grip is worse — banks love this hinge.",
            "fixed banks + Day‑2 prep principles (TOC / retention form).",
        ),
        eq(
            "d2a2",
            "A2",
            "You are choosing a finish line for an all‑ceramic crown that needs bulk of ceramic at the margin for strength and esthetics. Among the options, the most appropriate classical margin design is:",
            [
                "Knife / feather edge only (minimal reduction, no ceramic bulk)",
                "Rounded shoulder / shoulder that provides room for ceramic at the margin",
                "No finish line at all — polish the root only",
                "Occlusal rest seat preparation as used on RPD abutments only",
            ],
            "b",
            "Shoulder / rounded shoulder for ceramic bulk",
            "Chamfer classically suits many metal / metal‑ceramic / zirconia designs (material‑dependent). Shoulder / rounded shoulder gives ceramic bulk. Knife/feather = thin metal margins, not bulk ceramic. Match margin to material.",
            "finish‑line pickers (chamfer vs shoulder) — high repeat.",
        ),
        eq(
            "d2a3",
            "A3",
            "An endodontically treated tooth is planned for a full crown. “Ferrule” in this context best refers to:",
            [
                "Only the brand of resin cement used at try‑in",
                "Circumferential height of sound tooth structure engaged by the crown that improves fracture resistance",
                "The length of the post inside the canal with no coronal tooth left",
                "Shade matching of the provisional only",
            ],
            "b",
            "Circumferential sound tooth height engaged by the crown",
            "Classic target often taught ≈1.5–2 mm ferrule of sound tooth. Post does not replace ferrule. Inadequate ferrule → crown lengthening / extrusion / rethink plan — not “longer post only.”",
            "ferrule banks + post‑core teaching stems.",
        ),
        eq(
            "d2a4",
            "A4",
            "When is a post most appropriately indicated in a restored endodontically treated tooth among the options below?",
            [
                "Routinely in every RCT tooth to “strengthen the root against fracture”",
                "When remaining tooth structure cannot retain the core/build‑up and a post is needed for core retention — not as a root‑strengthening device",
                "Only when the patient requests a metal post for esthetics on anteriors",
                "Instead of achieving any ferrule or axial wall height",
            ],
            "b",
            "Post for core retention when tooth cannot hold the core",
            "Post retains the core; it does not magically strengthen the root (can weaken if over‑prepared). Prefer conservation + ferrule. No post if core can be retained by remaining walls/pulp chamber.",
            "post/core decision stems (always‑comes logic).",
        ),
        eq(
            "d2a5",
            "A5",
            "A patient returns one week after cementation of a new posterior crown complaining that food packs tightly between the crown and the adjacent tooth. The most likely cause among the options is:",
            [
                "Perfectly tight anatomic contact with ideal embrasure form only",
                "Open or light proximal contact of the crown",
                "Shade mismatch of the ceramic alone",
                "Using too much articulating paper at delivery only",
            ],
            "b",
            "Open / light proximal contact",
            "New crown + food packing interdentally → open/light contact until proven otherwise. Fix contact (remake/adjust lab workflow). Same hinge as Class II open contact on Day 1 — banks hammer it.",
            "crown failure table + always‑comes open contact.",
        ),
    ]
)

D2_B_FORM = form_block(
    2,
    "B",
    "cement · provisionals · crown failures · biologic width",
    [
        "<b>Shape:</b> “crown cemented last month, gums bleed,” “temp fell off,” “food packs,” “impression bloody,” four options with one textbook hinge.",
        "<b>What they test:</b> eugenol vs resin cement conflict, why provisionals exist, open contact / high occlusion / open margin, biologic width violation treatment idea, clean dry field for impressions.",
        "<b>Distractors:</b> ignore occlusion and jump to endo; eugenol under resin “is fine”; blood on impression “does not matter if you scan hard.”",
        "<b>Bank signal:</b> open contact, high bite, open margin, biologic width, eugenol/resin — highest fixed‑prostho free points.",
        "<b>Your job now:</b> 5 exam items. Self‑test first. ≥4/5 before Block C implants.",
    ],
)

D2_B_ARTICLES = "".join(
    [
        eq(
            "d2b1",
            "B1",
            "A provisional was cemented with a eugenol‑containing temporary cement. At the definitive appointment a bonded ceramic crown with resin cement is planned. The main materials concern is:",
            [
                "Eugenol residue can inhibit free‑radical polymerization of resin cements / adhesives if not thoroughly cleaned or avoided",
                "Eugenol always strengthens resin cement bond strength",
                "Eugenol only changes the shade of ceramic and never chemistry",
                "Resin cement requires eugenol as its primary catalyst",
            ],
            "a",
            "Eugenol can inhibit resin set",
            "Same Day‑1 hinge, now in crown cementation: clean thoroughly or use non‑eugenol temps when resin cement is planned. “Temp then resin fails / soft” stems.",
            "materials conflict banks + cementation teaching.",
        ),
        eq(
            "d2b2",
            "B2",
            "Which statement best captures the primary clinical purposes of a well‑made provisional crown while the definitive restoration is fabricated?",
            [
                "Only to change the patient’s legal name on the chart",
                "Protect the prepared tooth, maintain position/occlusion/gingival health, and allow function/esthetics until the final is ready",
                "Eliminate any need for a good definitive impression forever",
                "Replace the need for biologic width and ferrule planning",
            ],
            "b",
            "Protect prep · hold position/occlusion/gingiva · interim function",
            "Provisionals are not “just temps.” Failures: lost temp → drifting/supraeruption; open margin temp → sensitivity/caries; overcontoured temp → inflamed gingiva that ruins the final impression.",
            "provisional purpose + failure stems.",
        ),
        eq(
            "d2b3",
            "B3",
            "Three common crown delivery problems and their first hinge thoughts are tested. Match the best pair: high occlusion on a new crown most appropriately leads you first to:",
            [
                "Ignore the bite and prescribe antibiotics for every case",
                "Adjust the occlusion (articulating paper in MIP and excursions) before assuming mysterious pulp death on day one",
                "Extract the opposing tooth as first‑line therapy",
                "Always place a post immediately without checking the bite",
            ],
            "b",
            "Adjust high occlusion first",
            "High restoration → percussion tenderness / “tooth feels high” → adjust occlusion first (Day‑1 carry‑over). Open contact → food packing. Open margin → leakage/caries/sensitivity. Learn the three hinges cold.",
            "crown failure table (high bite / open contact / open margin).",
        ),
        eq(
            "d2b4",
            "B4",
            "A full‑coverage crown margin was placed deep subgingivally. Weeks later the gingiva remains chronically inflamed and bleeds despite good home care. A leading fixed‑prostho explanation is biologic width violation. The treatment idea banks expect is:",
            [
                "Ignore forever because inflammation always self‑resolves under deep margins",
                "Correct the relationship — typically surgically re‑establish width (crown lengthening concepts) and/or replace the restoration with a properly placed margin",
                "Only bleach the crown shade without addressing the margin position",
                "Prescribe lifelong daily systemic antibiotics as the sole fix",
            ],
            "b",
            "Re‑establish biologic width / remake with correct margin",
            "Biologic width (junctional epithelium + connective tissue attachment ≈2 mm concept) invaded by margin → chronic inflammation. Fix margin position and/or surgically create room — not polish and hope.",
            "biologic width stems (fixed + perio crossover).",
        ),
        eq(
            "d2b5",
            "B5",
            "During a conventional impression (or digital scan workflow) for a crown, the finish line is covered with blood and saliva. The most important reason this is a problem is:",
            [
                "Blood always improves stone surface detail for dies",
                "Moisture/blood obscures the finish line so the lab cannot see/read an accurate margin — remake after hemostasis and isolation",
                "Labs prefer bloody impressions because they set faster",
                "Blood substitutes for retraction cord and is required every case",
            ],
            "b",
            "Cannot read finish line → bad margin / remake",
            "Hemostasis + retraction + dry readable margin are non‑negotiable. Garbage in → open margin out. Same rule for scans: blood/saliva/fog hides the line.",
            "impression / retraction / open‑margin chain.",
        ),
    ]
)

D2_C_FORM = form_block(
    2,
    "C",
    "implants spacing · peri‑implant · medical free points",
    [
        "<b>Shape:</b> number stems (mm distances), mucositis vs peri‑implantitis, uncontrolled DM wanting implants, asthma pain med / gingival hyperplasia triad.",
        "<b>What they test:</b> automatic safety numbers + disease definition hinge + medical red flags that change the plan.",
        "<b>Distractors:</b> 0.1 mm to IAN; call bone loss “mucositis”; place implants in uncontrolled DM as first line.",
        "<b>Bank signal:</b> IAN 2 mm · tooth 1.5 mm · implant–implant ~3 mm · mucositis vs peri‑implantitis · uncontrolled DM → often reversible/safer options first.",
        "<b>Your job now:</b> 5 exam items. ≥4/5 before videos. Numbers must be cold.",
    ],
)

D2_C_ARTICLES = "".join(
    [
        eq(
            "d2c1",
            "C1",
            "When planning a mandibular posterior implant, a commonly taught minimum safety distance from the implant to the inferior alveolar nerve (IAN) canal is approximately:",
            [
                "2 mm",
                "0.1 mm (contact the canal is fine)",
                "10 mm only in every textbook with no other number taught",
                "No distance is needed if the patient is asymptomatic pre‑op",
            ],
            "a",
            "≈2 mm from IAN",
            "IAN ≈2 mm safety buffer is the free‑point number. Violate it → paresthesia risk. Know imaging and planning; do not guess 0.1 mm.",
            "implant spacing always‑comes (IAN 2 mm).",
        ),
        eq(
            "d2c2",
            "C2",
            "Among commonly taught implant spacing guidelines, the usual minimum distance between an implant and an adjacent natural tooth, and between two adjacent implants, is approximately:",
            [
                "Implant–tooth ≈1.5 mm; implant–implant ≈3 mm",
                "Implant–tooth ≈10 mm; implant–implant ≈0.5 mm",
                "No spacing rules exist in any implant textbook",
                "Implants must always touch each other for “splinting strength”",
            ],
            "a",
            "≈1.5 mm to tooth · ≈3 mm implant–implant",
            "Protect interproximal bone and papilla biology. Cramped implants → bone loss / black triangles / hygiene failure. Memorize the trio with IAN 2 mm.",
            "implant spacing triad (2 / 1.5 / ~3).",
        ),
        eq(
            "d2c3",
            "C3",
            "Peri‑implant mucositis is best distinguished from peri‑implantitis by which hinge among the options?",
            [
                "Mucositis = soft‑tissue inflammation around implant without progressive crestal bone loss; peri‑implantitis includes progressive bone loss with inflammation",
                "Mucositis always shows major cratering bone loss; peri‑implantitis never bleeds",
                "Both terms mean exactly the same thing in every exam stem",
                "Peri‑implantitis is only a shade mismatch of the abutment",
            ],
            "a",
            "Mucositis = soft tissue only; peri‑implantitis = + progressive bone loss",
            "Parallel gingivitis vs periodontitis logic. Mucositis is reversible with hygiene/debridement emphasis; peri‑implantitis needs bone‑loss‑aware management. Do not mix the words on the exam.",
            "peri‑implant disease definition stems.",
        ),
        eq(
            "d2c4",
            "C4",
            "A patient with poorly controlled diabetes mellitus wants multiple dental implants to replace missing teeth. Among the options, the most appropriate planning attitude is:",
            [
                "Place immediate full‑arch implants the same day without medical optimization",
                "Prioritize medical control / optimization and consider reversible or lower‑risk options when indicated; uncontrolled DM is a risk for healing and implant complications",
                "Uncontrolled DM always makes implants safer than RPDs",
                "Diabetes is irrelevant to implant planning in every guideline",
            ],
            "b",
            "Control disease first; implants are not automatic in uncontrolled DM",
            "Uncontrolled DM → impaired healing, infection risk, implant failure risk. Stabilize medical status; sometimes RPD/other reversible options bridge care. Banks test judgment, not heroics.",
            "medical free points + implant case selection.",
        ),
        eq(
            "d2c5",
            "C5",
            "An asthmatic patient needs an analgesic recommendation after a dental procedure; the history notes NSAID sensitivity concern. A classic exam free‑point first‑line oral analgesic choice among the options is:",
            [
                "Aspirin or a non‑selective NSAID forced despite known sensitivity",
                "Paracetamol (acetaminophen) as a preferred simple analgesic when NSAIDs are poorly tolerated / contraindicated in the stem",
                "Long‑term high‑dose opioids as routine first line for every filling",
                "No pain control ever for asthmatic patients",
            ],
            "b",
            "Paracetamol when NSAIDs are a problem",
            "Asthma + NSAID/aspirin sensitivity stories → prefer paracetamol. Separately memorize gingival enlargement triad (phenytoin, calcium channel blockers, cyclosporine) for medical free points on the same day.",
            "medical free points (pain med + hyperplasia triad).",
        ),
    ]
)

# ─── Day 3 content ───────────────────────────────────────────────────────────

D3_A_FORM = form_block(
    3,
    "A",
    "Kennedy · Applegate · support / RPI",
    [
        "<b>Shape:</b> arch diagram description or tooth numbers missing → name the Kennedy class; Applegate rule twists; RPI component pickers.",
        "<b>What they test:</b> class by most posterior edentulous pattern; modification spaces; what decides class after planned extractions; RPI parts and stress release on distal extension.",
        "<b>Distractors:</b> call any anterior gap Class IV without midline rule; classify before extractions; confuse rest location on RPI.",
        "<b>Bank signal:</b> Kennedy I/II free‑end, Class IV crosses midline single space, Applegate, RPI = mesial rest + proximal plate + I‑bar.",
        "<b>Your job now:</b> 5 exam items. Cover answers. ≥4/5 before connectors/CD.",
    ],
)

D3_A_ARTICLES = "".join(
    [
        eq(
            "d3a1",
            "A1",
            "A partially edentulous mandibular arch has bilateral posterior edentulous areas posterior to the remaining natural teeth (bilateral free‑end saddles). According to Kennedy classification this is:",
            [
                "Kennedy Class I",
                "Kennedy Class II",
                "Kennedy Class III",
                "Kennedy Class IV",
            ],
            "a",
            "Kennedy Class I — bilateral distal extension",
            "I = bilateral free‑end (distal extension). II = unilateral free‑end. III = tooth‑bounded posterior space (not free‑end). IV = single anterior edentulous area that crosses the midline. Draw it once; never miss again.",
            "Kennedy free points (I vs II vs III vs IV).",
        ),
        eq(
            "d3a2",
            "A2",
            "A patient is missing teeth #12, #11, #21, and #22 as a single continuous anterior edentulous span that crosses the midline; posterior teeth are present. Kennedy classification is:",
            [
                "Kennedy Class I",
                "Kennedy Class II",
                "Kennedy Class III",
                "Kennedy Class IV",
            ],
            "d",
            "Kennedy Class IV — single anterior space crossing midline",
            "Class IV = one anterior edentulous area crossing the midline. It does not take modification spaces the way I–III do (Applegate). Bounded posterior only without free‑end is Class III.",
            "Kennedy IV definition stems.",
        ),
        eq(
            "d3a3",
            "A3",
            "According to Applegate’s rules, classification of a partially edentulous arch should be made:",
            [
                "Before any planned extractions, using the current teeth only and never updating",
                "After extractions that will affect the classification have been performed (class reflects the arch you will restore)",
                "Only by the number of missing anteriors regardless of free‑end saddles",
                "Randomly by the lab technician without examining the patient",
            ],
            "b",
            "Classify after planned extractions that change the class",
            "Applegate: decide class on the arch you will actually restore. Missing third molars not used as abutments are often ignored; if a third molar is present and used as an abutment, it counts. Modification spaces are additional spaces that do not change the main class letter for I–III.",
            "Applegate rules (high yield, not trivia).",
        ),
        eq(
            "d3a4",
            "A4",
            "The RPI clasp system components on a distal‑extension RPD abutment are classically described as which of the following?",
            [
                "Ring clasp only on every tooth without rests",
                "Mesial rest, distal proximal plate, and I‑bar retentive arm",
                "Only wrought wire circumferential clasps on centrals with no rest",
                "Embrasure clasps alone without a rest or plate",
            ],
            "b",
            "RPI = mesial Rest + Proximal plate + I‑bar",
            "R‑P‑I mnemonic. Mesial rest moves the fulcrum; proximal plate + I‑bar disengage under load on free‑end — stress‑releasing design. Do not place a rigid distal rest + cast circumferential that torques the abutment on Class I/II without thinking.",
            "RPI component picker (always‑comes).",
        ),
        eq(
            "d3a5",
            "A5",
            "In a Kennedy Class I distal‑extension RPD, vertical support of the free‑end base under occlusal load is derived primarily from which combination of ideas among the options?",
            [
                "Only from a long cast circumferential clasp on the terminal abutment with zero rest seats",
                "Rests on teeth for tooth‑borne areas plus broad residual ridge coverage / mucosa for the free‑end saddle, with stress‑releasing clasp design to protect abutments",
                "Only from the major connector polish and shade",
                "Only from acrylic color matching the gingiva",
            ],
            "b",
            "Tooth rests + ridge support on free‑end + stress release",
            "Support = resists tissue‑ward movement (rests + ridge). Distal extension compresses mucosa → torque risk on abutments → RPI / stress‑releasing assemblies + broad coverage. Retention ≠ support ≠ stability — define each cold.",
            "support / distal extension / stress‑release stems.",
        ),
    ]
)

D3_B_FORM = form_block(
    3,
    "B",
    "major connectors · complete denture · reline vs rebase",
    [
        "<b>Shape:</b> “which major connector,” VDO error symptoms, post dam purpose, sore spot causes, reline vs rebase definition.",
        "<b>What they test:</b> rigidity and tissue protection of connectors; CR/VDO/phonetics hinges; when to reline vs rebase.",
        "<b>Distractors:</b> horseshoe always for every maxilla; raise VDO randomly for retention; call rebase a soft chairside wipe only.",
        "<b>Bank signal:</b> lingual bar vs plate, A‑P strap, post dam, excessive VDO symptoms, reline = base surface / rebase = most base replaced.",
        "<b>Your job now:</b> 5 items. ≥4/5 before materials Block C.",
    ],
)

D3_B_ARTICLES = "".join(
    [
        eq(
            "d3b1",
            "B1",
            "A mandibular RPD is planned for a patient with only mobile lower anterior teeth remaining and a need for indirect retention / plate support of weakened anteriors. Among the options, the major connector often preferred in this classic stem is:",
            [
                "Lingual plate (linguopolate) that can engage and support compromised anteriors when indicated",
                "A maxillary horseshoe connector placed on the mandible",
                "No major connector at all for a bilateral free‑end case",
                "Only a labial bar in every mobile anterior case without assessment",
            ],
            "a",
            "Lingual plate when anteriors need plating / limited bar space",
            "Lingual bar needs adequate floor‑of‑mouth depth and rigid design; lingual plate when space is limited, teeth need stabilization, or indirect retention/plan demands it. Match connector to anatomy + indication — not one default forever.",
            "major connector pickers (lingual bar vs plate).",
        ),
        eq(
            "d3b2",
            "B2",
            "The single most important mechanical requirement of a major connector in an RPD framework is that it must be:",
            [
                "Flexible enough to spring open under every occlusal load",
                "Rigid, so forces are distributed and the framework does not flex and torque abutments unpredictably",
                "Made only of soft acrylic with no metal ever",
                "Polished only on the tissue side and rough on the tongue side always",
            ],
            "b",
            "Rigidity (distribute force; do not flex‑torque)",
            "Major connector must be rigid. Flexible frameworks stress abutments and bases unevenly. Cross‑section, design (A‑P strap, full palate, lingual bar dimensions), and relief over tori/soft tissue matter.",
            "connector rigidity free point.",
        ),
        eq(
            "d3b3",
            "B3",
            "A newly delivered complete denture patient reports difficulty with “s” sounds, a feeling of too much bulk, and sore ridges after short wear; the teeth appear too tall and the face looks overclosed is NOT the picture — instead the vertical dimension of occlusion (VDO) is excessive. Excessive VDO classically produces:",
            [
                "Only improved comfort and perfect phonetics always",
                "Clicking teeth, muscle fatigue/soreness, difficulty with speech (e.g. sibilants), and trauma to supporting tissues among common stems",
                "Automatic ideal CR recording without any try‑in",
                "Elimination of any need for a post dam",
            ],
            "b",
            "Excess VDO → clicking, fatigue, speech trouble, tissue trauma",
            "Too open VDO = teeth contact too soon / bulk. Too closed VDO = collapsed face, angular cheilitis stories, reduced power. Phonetics (f/v, s) help verify. Adjust at try‑in, not only after sore visits.",
            "CD VDO / phonetics stems.",
        ),
        eq(
            "d3b4",
            "B4",
            "The posterior palatal seal (post dam) on a maxillary complete denture is primarily intended to:",
            [
                "Increase VDO only without affecting seal",
                "Compensate for acrylic processing shrinkage and maintain peripheral seal at the hard/soft palate junction region",
                "Replace the need for any border molding or impression skill",
                "Hold only the posterior artificial teeth with no seal function",
            ],
            "b",
            "Seal at posterior palate + compensate processing change",
            "Post dam = retention via seal where denture ends posteriorly. Wrong depth/position → loss of seal / gag / ulcer. Pair with border molding and CR records as CD free points.",
            "post dam purpose (always‑comes CD).",
        ),
        eq(
            "d3b5",
            "B5",
            "A complete denture fits poorly because the tissue‑contacting base surface no longer matches the residual ridge, but the teeth and occlusion are still acceptable. The procedure that resurfaces the intaglio (tissue side) of the base is:",
            [
                "Relining — adapt/replace the tissue‑contacting surface of the base",
                "Only polishing the polished exterior surface with no tissue‑side change",
                "Only changing the shade of the artificial teeth",
                "Extracting all remaining ridge mucosa as first‑line therapy",
            ],
            "a",
            "Reline = tissue‑side / intaglio resurfacing",
            "Reline = intaglio adaptation when teeth/occlusion still OK. Rebase = replace most of the denture base material (teeth often reused) — different word. Soft liners are temporary comfort tools, not always definitive.",
            "reline vs rebase definition stems.",
        ),
    ]
)

D3_C_FORM = form_block(
    3,
    "C",
    "impression materials · gypsum · acrylic",
    [
        "<b>Shape:</b> “best material for…,” “pour within…,” “Type IV used for…,” porosity cause after processing.",
        "<b>What they test:</b> killer property per material (alginate unstable, PVS stable, polyether stiff/hydrophilic stories, ZOE rigid), gypsum types by use, acrylic porosity cause.",
        "<b>Distractors:</b> leave alginate overnight then pour; use Type II for precision dies; rapid heat → gaseous porosity ignored.",
        "<b>Bank signal:</b> alginate = pour ASAP; PVS = dimensionally stable; Type IV die stone; heat‑cure vs self‑cure; gaseous porosity from improper curing heat.",
        "<b>Your job now:</b> 5 items. ≥4/5 before videos. Material pickers are free points.",
    ],
)

D3_C_ARTICLES = "".join(
    [
        eq(
            "d3c1",
            "C1",
            "Irreversible hydrocolloid (alginate) is used for a diagnostic cast. The most important handling rule among the options is:",
            [
                "Pour as soon as practical; alginate is dimensionally unstable with storage/syneresis/imbibition if delayed or poorly stored",
                "Leave the impression on the bench for 48 hours unwrapped for best accuracy",
                "Alginate is more dimensionally stable than addition silicone for two‑week lab delays",
                "Never rinse alginate; debris improves stone detail",
            ],
            "a",
            "Pour alginate ASAP; unstable if delayed",
            "Alginate = cheap, flexible, irreversible hydrocolloid — poor long‑term dimensional stability. PVS (addition silicone) wins for stability when delay/lab work demands it. Match material to need.",
            "impression material killer properties.",
        ),
        eq(
            "d3c2",
            "C2",
            "For a fixed prosthodontic impression that may sit before pouring or requires high dimensional stability and detail, the material class most often preferred among the options is:",
            [
                "Irreversible hydrocolloid left unpoured for days",
                "Addition silicone (PVS) — excellent dimensional stability and detail when technique is correct",
                "Impression compound alone for full subgingival crown margins in every modern lab",
                "Irreversible hydrocolloid mixed with plaster as a single material for implants only",
            ],
            "b",
            "PVS (addition silicone) for stability/detail",
            "PVS = workhorse for fixed. Polyether also accurate/hydrophilic stories but can be stiff/difficult to remove. ZOE paste = mucostatic edentulous impressions classic. Know one killer line each.",
            "PVS vs alginate vs polyether vs ZOE pickers.",
        ),
        eq(
            "d3c3",
            "C3",
            "Gypsum Type IV (high‑strength die stone) is primarily indicated in the laboratory for which of the following uses?",
            [
                "Mounting plaster only with no strength needs",
                "Dies and working casts requiring high strength and abrasion resistance for crown/bridge fabrication",
                "Only as a final cement for crowns inside the mouth",
                "Only as irreversible hydrocolloid impression material",
            ],
            "b",
            "Type IV = die / high‑strength working casts",
            "Rough map: I impression plaster · II model plaster · III dental stone (casts) · IV high‑strength die stone · V high‑strength high‑expansion. Exam loves Type IV for dies.",
            "gypsum type free points.",
        ),
        eq(
            "d3c4",
            "C4",
            "Heat‑cured acrylic denture base shows internal porosity (gaseous porosity pattern) after processing. A classic processing cause among the options is:",
            [
                "Too rapid heating / improper curing cycle that vaporizes monomer before full polymerization control",
                "Using too much stone on the cast only",
                "Polishing the teeth too much at delivery only",
                "Recording CR at the wrong vertical only (porosity is not from packing/curing heat errors)",
            ],
            "a",
            "Improper/rapid heat → gaseous porosity",
            "Gaseous porosity ↔ curing temperature/time control and monomer. Other porosity types exist (inadequate packing, etc.) but banks hammer heat/cure cycle. Slow controlled cure per technique.",
            "acrylic porosity processing stems.",
        ),
        eq(
            "d3c5",
            "C5",
            "Compared with carefully heat‑cured acrylic denture base resin, chemically activated (self‑/cold‑cure) acrylic is classically:",
            [
                "Always superior in every mechanical property and always preferred for all definitive bases with no trade‑offs",
                "Useful for repairs, relines, and some chairside uses, often with more residual monomer / different strength profile than carefully heat‑cured definitive bases",
                "Impossible to polymerize without a dry‑heat oven at 500 °C",
                "Identical to Type IV gypsum in chemistry",
            ],
            "b",
            "Self‑cure = repairs/relines; heat‑cure often definitive bases",
            "Heat‑cure common for definitive denture bases (controlled cycle). Self‑cure = speed for repairs/relines with trade‑offs (residual monomer, properties). Exam asks use‑case, not brand names.",
            "heat‑cure vs self‑cure use stems.",
        ),
    ]
)


def build_day2_sections() -> dict[str, str]:
    return {
        "A": D2_A_FORM + qa_block(2, "A", "", D2_A_ARTICLES),
        "B": D2_B_FORM + qa_block(2, "B", "", D2_B_ARTICLES),
        "C": D2_C_FORM + qa_block(2, "C", "", D2_C_ARTICLES),
    }


def build_day3_sections() -> dict[str, str]:
    return {
        "A": D3_A_FORM + qa_block(3, "A", "", D3_A_ARTICLES),
        "B": D3_B_FORM + qa_block(3, "B", "", D3_B_ARTICLES),
        "C": D3_C_FORM + qa_block(3, "C", "", D3_C_ARTICLES),
    }


def inject(html: str, day: int, sections: dict[str, str]) -> str:
    if day == 2:
        anchors = {
            "A": "Block A gate:</b> If you cannot write those five without scrolling up",
            "B": "Block B gate:</b> If any line is blank from memory",
            "C": "Block C gate:</b> If you cannot fill those five without scrolling",
        }
        pomo = {
            "A": (
                "<li><b>Block A 45 min</b> — Read A–D <em>actively</em> (not skim): why Day 2 → prep → finish lines → retention/ferrule/posts. Do every STOP. Bold re‑pass + write gate.</li>",
                "<li><b>Block A 45 min</b> — Read A–D <em>actively</em> + do Exam Q&amp;A Block A (cover answers first; open only after you pick). STOPs + bold re‑pass + write gate.</li>",
            ),
            "B": (
                "<li><b>Block B 45 min</b> — Read E–H actively (cement, provisionals, crown failures, biologic width/impressions) + STOPs + bold re‑pass + write gate</li>",
                "<li><b>Block B 45 min</b> — Read E–H actively + do Exam Q&amp;A Block B the same way (cement · provisionals · failures · biologic width)</li>",
            ),
            "C": (
                "<li><b>Block C 45 min</b> — Read I–K actively (implants, medical/traps, finish plan) + STOPs + bold re‑pass + write gate</li>",
                "<li><b>Block C 45 min</b> — Read I–K actively + do Exam Q&amp;A Block C (implants · peri‑implant · medical free points)</li>",
            ),
        }
    else:
        anchors = {
            "A": "Block A gate:</b> If you cannot answer those six without scrolling up",
            "B": "Block B gate:</b> No Block C until those five are spoken without scrolling",
            "C": "Block C gate:</b> Material pickers and porosity are free points",
        }
        pomo = {
            "A": (
                "<li><b>Block A 45 min</b> — Read A–D <em>actively</em> (not skim): why Day 3 → Kennedy I–IV with examples → Applegate → support/stability/retention/reciprocation + distal extension + RPI. Do every STOP. Last 5 min = bold‑only re‑pass. Last write‑gate is part of the 45.</li>",
                "<li><b>Block A 45 min</b> — Read A–D <em>actively</em> + do Exam Q&amp;A Block A (Kennedy · Applegate · RPI). STOPs + bold re‑pass + write‑gate.</li>",
            ),
            "B": (
                "<li><b>Block B 45 min</b> — Read E–G <em>actively</em>: major connectors max/mand → complete denture (CR, VDO, phonetics, post dam, sore spots) → reline vs rebase. Every STOP + bold re‑pass + write‑gate.</li>",
                "<li><b>Block B 45 min</b> — Read E–G <em>actively</em> + do Exam Q&amp;A Block B (connectors · CD · reline/rebase).</li>",
            ),
            "C": (
                "<li><b>Block C 45 min</b> — Read H–J <em>actively</em>: impression materials table → gypsum types + acrylic → traps + finish path. Every STOP + write‑gate before videos.</li>",
                "<li><b>Block C 45 min</b> — Read H–J <em>actively</em> + do Exam Q&amp;A Block C (impressions · gypsum · acrylic).</li>",
            ),
        }

    if "exam-form" in html and f'data-day="{day}"' in html:
        raise SystemExit(f"Day {day} staging already has exam-form — abort to avoid double inject")

    for block, needle in anchors.items():
        i = html.find(needle)
        if i < 0:
            raise SystemExit(f"Day {day} missing anchor for Block {block}: {needle[:50]}")
        j = html.find("</p>", i)
        if j < 0:
            raise SystemExit(f"Day {day} Block {block}: no closing </p>")
        j += 4
        insert = "\n" + sections[block].strip() + "\n"
        html = html[:j] + insert + html[j:]

    for block, (old, new) in pomo.items():
        if old not in html:
            # try softer match — already updated?
            if "Exam Q&amp;A Block " + block in html or f"Exam Q&A Block {block}" in html:
                continue
            raise SystemExit(f"Day {day} pomodoro line for Block {block} not found exactly")
        html = html.replace(old, new, 1)

    return html


def main() -> None:
    d2 = GEN / "day02_reading.html"
    d3 = GEN / "day03_reading.html"
    html2 = inject(d2.read_text(encoding="utf-8"), 2, build_day2_sections())
    html3 = inject(d3.read_text(encoding="utf-8"), 3, build_day3_sections())
    d2.write_text(html2, encoding="utf-8")
    d3.write_text(html3, encoding="utf-8")
    print(f"Day 2: {len(html2)} chars, exam-form={html2.count('exam-form')}, exam-qa={html2.count('exam-qa')}, articles={html2.count('class=\"eq\"')}")
    print(f"Day 3: {len(html3)} chars, exam-form={html3.count('exam-form')}, exam-qa={html3.count('exam-qa')}, articles={html3.count('class=\"eq\"')}")


if __name__ == "__main__":
    main()
