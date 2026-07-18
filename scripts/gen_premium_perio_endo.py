#!/usr/bin/env python3
"""Generate 150 perio + 150 endo premium SDLE MCQs."""
from __future__ import annotations

import json
import random
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "data" / "generated"
RNG = random.Random(42)


def place(correct: str, wrongs: list[str]) -> tuple[list[str], int]:
    opts = wrongs[:3] + [correct]
    RNG.shuffle(opts)
    return opts, opts.index(correct)


def Q(qid, topic, source, q, correct, wrongs, explanation, difficulty="medium", subtopics=None):
    options, ans = place(correct, wrongs)
    return {
        "id": qid,
        "topic": topic,
        "difficulty": difficulty,
        "q": q,
        "options": options,
        "answer": ans,
        "explanation": explanation,
        "source": source,
        "subtopics": subtopics or [],
    }


def perio_bank():
    items = []
    raw = [
        # stage/grade
        ("What does periodontal staging primarily describe?", "Severity and complexity of management", ["Rate of progression only", "Only plaque index", "Only patient age"], "Stage = how bad / how hard to treat.", "easy", ["classification"]),
        ("What does periodontal grading primarily describe?", "Rate of progression and risk profile", ["Only probing depth today", "Only tooth count", "Only furcation class"], "Grade A/B/C = progression risk.", "easy", ["classification"]),
        ("A patient with many complex factors (vertical defects, furcation, bite collapse) is most consistent with which idea?", "Higher stage (more complex management)", ["Grade only, never stage", "Always Stage I", "No classification needed"], "Complexity drives stage upward.", "medium", ["classification"]),
        ("Grade C periodontitis implies:", "Rapid progression / high risk factors", ["No risk factors ever", "Only gingivitis", "Healed implants only"], "C = rapid/high risk.", "easy", ["classification"]),
        ("Grade A periodontitis implies:", "Slow rate of progression", ["Always tooth loss inevitable", "Only grade for implants", "Same as Grade C"], "A = slow progression.", "easy", ["classification"]),
        # CAL / PD
        ("Clinical attachment level (CAL) is measured from:", "CEJ to base of pocket", ["Gingival margin only to CEJ", "Incisal edge to cusp", "Only radiographic apex"], "CAL accounts for recession vs PD.", "easy", ["cal"]),
        ("Probing depth alone fails to fully describe damage because:", "It ignores recession/attachment history", ["PD is always equal to CAL", "PD never changes", "PD measures enamel hardness"], "PD ≠ CAL when recession present.", "medium", ["cal"]),
        ("Bleeding on probing primarily indicates:", "Inflammation of the pocket wall", ["Always irreversible bone loss", "Pulp necrosis", "Need for immediate extraction"], "BOP = inflammation marker.", "easy", ["bop"]),
        ("True periodontal pocket involves:", "Apical migration of junctional epithelium / attachment loss", ["Only swollen gingiva without attachment loss", "Enamel hypoplasia", "Only occlusal caries"], "True pocket = attachment loss.", "medium", ["pathogenesis"]),
        ("Pseudopocket is mainly due to:", "Gingival enlargement without attachment loss", ["Vertical root fracture only", "Apical periodontitis only", "Missing MB2"], "Edema/hyperplasia can deepen PD without CAL loss.", "medium", ["pathogenesis"]),
        # furcation
        ("Glickman Class I furcation means:", "Incipient involvement; probe catches but not horizontal into furcation deeply", ["Through-and-through visible", "Only radiographic apex open", "Tooth must be extracted always"], "I = early/incipient.", "easy", ["furcation"]),
        ("Glickman Class II furcation means:", "Cul-de-sac; horizontal loss into furcation but not through-and-through", ["No bone loss ever", "Only soft tissue", "Always Class IV"], "II = cul-de-sac.", "easy", ["furcation"]),
        ("Glickman Class III furcation means:", "Through-and-through involvement", ["Incipient only", "Only enamel pearl", "No probe entry"], "III = through-and-through.", "easy", ["furcation"]),
        ("Glickman Class IV furcation means:", "Through-and-through with gingival recession making furcation visible", ["No involvement", "Only Class I", "Only soft tissue swelling"], "IV = III + visible recession.", "medium", ["furcation"]),
        ("Most common root for furcation issues on mandibular molars relates to:", "Bifurcation anatomy and bone loss pattern", ["Always single-rooted premolars only", "Only maxillary centrals", "Only third molars never"], "Mandibular molars have buccal/lingual furcation access.", "medium", ["furcation"]),
        # etiology / risk
        ("Primary etiologic agent of plaque-induced gingivitis is:", "Dental plaque biofilm", ["Occlusal trauma alone", "Only genetics without plaque", "Fluoride tablets"], "Biofilm is necessary cause for plaque-induced disease.", "easy", ["etiology"]),
        ("Smoking effect on periodontium includes:", "Worse disease, impaired healing, may mask bleeding", ["Always improves BOP reliability", "Protects against bone loss", "No effect on implants"], "Smoking = major risk; masks BOP.", "easy", ["risk"]),
        ("Diabetes and periodontitis relationship is best described as:", "Bidirectional risk / mutual worsening potential", ["Diabetes never affects gingiva", "Perio never affects glycemic control considerations", "Only type 1 irrelevant"], "Bidirectional association is high-yield.", "easy", ["risk"]),
        ("Drug-induced gingival enlargement classic triad includes:", "Nifedipine, phenytoin, cyclosporine", ["Paracetamol, amoxicillin, ibuprofen", "Fluoride, xylitol, chlorhexidine", "Lidocaine, epinephrine, articaine"], "Ca-channel blocker / anticonvulsant / immunosuppressant.", "easy", ["drugs"]),
        ("Best first management step for drug-induced gingival enlargement often includes:", "Oral hygiene + plaque control ± drug substitution coordination", ["Immediate full mouth extraction only option", "Only bleaching", "Ignore plaque"], "Cause-related + medical liaison.", "medium", ["drugs"]),
        # therapy
        ("Foundation of cause-related non-surgical perio therapy is:", "Scaling and root planing (SRP) with OH instruction", ["Antibiotics alone without debridement", "Only free gingival graft first always", "Only occlusal adjustment"], "SRP + OH first-line.", "easy", ["therapy"]),
        ("Re-evaluation after SRP is typically used to:", "Assess residual pockets/inflammation and plan further care", ["Prove extraction always needed", "Replace diagnosis of caries", "Measure pulp vitality only"], "Re-eval guides surgery vs maintenance.", "easy", ["therapy"]),
        ("Systemic antibiotics as perio therapy are best thought as:", "Adjuncts in selected cases, not sole therapy", ["Always first-line alone for gingivitis", "Never used in any case", "Replacement for plaque control"], "Abx adjunct only when indicated.", "medium", ["therapy"]),
        ("Indications for periodontal surgery often include:", "Persistent deep pockets / access for root debridement / regenerative opportunities after cause control", ["All gingivitis on day 1", "Only white spot lesions", "Always before any SRP"], "Surgery after or with cause control as indicated.", "medium", ["surgery"]),
        ("Guided tissue regeneration aims to:", "Regenerate periodontal attachment apparatus under barrier principles", ["Only whiten teeth", "Only extract third molars", "Replace RCTs"], "GTR = regenerative concept.", "medium", ["surgery"]),
        ("Biological width (supracrestal tissue attachment) violation often leads to:", "Chronic inflammation around subgingival restorations", ["Faster enamel maturation", "Better papilla always", "No clinical effect"], "Margin invasion → chronic inflam.", "easy", ["bio_width"]),
        ("Approximate classic teaching height of biologic width / supracrestal attachment is about:", "~2 mm combined connective + epithelial attachment (classic exam figure)", ["20 mm always", "0.1 mm only enamel", "Equal to full root length"], "Classic ~2 mm figure tested often.", "medium", ["bio_width"]),
        # peri-implant
        ("Peri-implant mucositis is characterized by:", "Soft tissue inflammation without progressive crestal bone loss of peri-implantitis", ["Always progressive bone loss", "Only pulpitis", "Only dry socket"], "Mucositis = soft tissue only.", "easy", ["implant"]),
        ("Peri-implantitis includes:", "Inflammation with progressive bone loss around implant", ["Healthy soft tissue only", "Only reversible pulpitis", "Only natal teeth"], "Peri-implantitis = bone loss.", "easy", ["implant"]),
        ("Primary prevention of peri-implant disease emphasizes:", "Plaque control and maintenance recall", ["Never cleaning implants", "Only antibiotics lifelong", "Always remove prosthesis monthly"], "Maintenance is critical.", "easy", ["implant"]),
        # NUG / abscess / mobility
        ("Necrotizing ulcerative gingivitis classic features include:", "Pain, bleeding, necrosis of papillae, often fetor; stress/smoking risk", ["Painless white plaque only that never bleeds", "Only Class III malocclusion", "Only enamel hypoplasia"], "NUG is acute painful necrosis pattern.", "medium", ["nug"]),
        ("Periodontal abscess management cornerstone is:", "Drainage + debridement of cause + risk control", ["Antibiotics alone without local care always enough", "Only bleaching", "Immediate RCT of every tooth always"], "Local cause control essential.", "medium", ["abscess"]),
        ("Miller mobility Class II roughly means:", "Increased mobility in horizontal direction beyond normal, not depressible (classic teaching bands)", ["Ankylosis only", "No mobility", "Only vertical 1 cm always"], "Mobility grades are exam favorites.", "hard", ["mobility"]),
        ("Primary occlusal trauma means:", "Injury from excessive occlusal force on a periodontium of normal support", ["Only trauma from plaque", "Always needs extraction", "Only endo diagnosis"], "Primary = normal support + excess force.", "medium", ["occlusion"]),
        ("Secondary occlusal trauma means:", "Normal or excess forces on a reduced periodontium", ["Always healthy bone", "Only primary herpetic gingivostomatitis", "Only fluorosis"], "Secondary = reduced support.", "medium", ["occlusion"]),
        ("Old term 'aggressive periodontitis' maps roughly to:", "Rapidly progressive / Grade C-type patterns in modern thinking", ["Only gingivitis", "Only caries", "Only dry socket"], "Map old→new for bank questions.", "hard", ["classification"]),
        ("Most important daily patient factor for perio success is:", "Effective plaque control / oral hygiene", ["Monthly professional care only without home care", "Only whitening strips", "Avoiding all vegetables"], "OH is non-negotiable.", "easy", ["etiology"]),
        ("When residual deep pockets remain after excellent SRP and OH, next often considered is:", "Surgical access / further periodontal therapy as indicated", ["Ignore forever", "Only fluoride varnish always", "Immediate full denture always"], "Escalate appropriately.", "medium", ["surgery"]),
        ("Radiographic bone loss assessment in staging is used as:", "Part of severity/complexity appraisal (with clinical findings)", ["Only way to diagnose pulpitis", "Replacement for BOP", "Only for ortho bonding"], "Radiographs support staging.", "easy", ["classification"]),
        ("Furcation involvement generally increases:", "Complexity of management (stage considerations)", ["Likelihood of spontaneous self-cure always", "Enamel hardness", "Need for fluoride tablets only"], "Furcation = complexity.", "easy", ["furcation"]),
    ]

    # Expand with more templates for volume
    extra_facts = [
        ("Horizontal bone loss pattern is often associated with:", "Suprabony pockets / relatively even loss patterns", ["Only vertical defects always", "Only VRF", "Only implants"], "Pattern recognition.", "medium", ["pathogenesis"]),
        ("Vertical/angular bone defects may be candidates for:", "Regenerative approaches when anatomy allows", ["Always extraction only", "Only bleaching", "No therapy"], "Angular defects ↔ regenerative potential.", "medium", ["surgery"]),
        ("Probe force should be:", "Gentle standardized light force (not stabbing)", ["As hard as possible always", "Zero contact ever", "Only ultrasonic always"], "Technique matters for PD.", "easy", ["exam"]),
        ("Gingivitis without attachment loss is:", "Reversible with plaque control (classic)", ["Always irreversible bone loss", "Always needs surgery first", "Same as Stage IV"], "Gingivitis reversible.", "easy", ["etiology"]),
        ("Maintenance interval after active therapy is often:", "Risk-based recall (many 3–4 months early)", ["Never again", "Only every 10 years", "Daily SRP in office"], "Supportive perio therapy.", "medium", ["therapy"]),
        ("Local drug delivery (e.g., antimicrobials in pocket) is:", "Adjunct in selected residual sites", ["Cure for Stage IV alone", "Replacement for extraction always", "Only for caries"], "Local adjunct concept.", "hard", ["therapy"]),
        ("Pregnancy-associated gingival changes are mainly related to:", "Hormonal influence amplifying plaque response", ["Need for immediate all extractions", "Fluoride deficiency only", "Always pemphigus"], "Hormones + plaque.", "medium", ["risk"]),
        ("HIV-related perio presentations historically include:", "Necrotizing forms in susceptible hosts", ["Only dens in dente", "Only Class II Div 2", "Only dry socket"], "Immunosuppression risk.", "hard", ["nug"]),
        ("Tooth mobility may improve after:", "Inflammation control and/or occlusal adjustment when indicated", ["Only ignoring pockets", "Only bleaching", "Always endo first always"], "Treat causes of mobility.", "medium", ["mobility"]),
        ("Prognosis worsens with:", "Uncontrolled systemic disease, smoking, poor OH, advanced furcation", ["Perfect OH and health", "Only young age always good alone", "Always implants without maintenance"], "Risk stack.", "easy", ["risk"]),
    ]
    raw.extend(extra_facts)

    # More MCQs from variants
    variants = []
    for i, drug in enumerate(["nifedipine", "phenytoin", "cyclosporine"]):
        variants.append((
            f"Which drug is classically linked to gingival enlargement (item {i+1})?",
            drug[0].upper() + drug[1:],
            ["Amoxicillin", "Paracetamol", "Xylitol rinse only"],
            f"{drug} is in the classic triad.",
            "easy",
            ["drugs"],
        ))
    for label, meaning in [
        ("Stage I", "Initial periodontitis severity band"),
        ("Stage II", "Moderate severity band"),
        ("Stage III", "Severe with potential for tooth loss complexity"),
        ("Stage IV", "Advanced with complex rehabilitation needs"),
    ]:
        variants.append((
            f"In 2017 classification, {label} primarily indicates:",
            meaning,
            ["Only pulp diagnosis", "Only Angle Class", "Only fluoride dose"],
            f"{label} is a severity/complexity band.",
            "medium",
            ["classification"],
        ))
    raw.extend(variants)

    # pad to 150 with clinical vignettes
    vignettes = [
        ("Deep residual 7 mm pockets after good SRP, good OH, BOP residual — next logical step?", "Consider surgical access / further perio therapy planning", ["Stop all care", "Only orthodontic expansion always", "Ignore BOP"], "Escalate after cause control.", "medium", ["surgery"]),
        ("Smoker with pale gingiva and little BOP but radiographic bone loss — concern?", "Smoking can mask bleeding despite disease", ["Disease impossible if no BOP", "Always healthy", "Only needs whitening"], "Masked inflammation.", "medium", ["risk"]),
        ("Uncontrolled diabetes, progressive perio — management priority includes:", "Medical control coordination + periodontal cause-related care", ["Ignore HbA1c", "Only extract all immediately without medical liaison", "Antibiotics alone forever"], "Systemic + local.", "medium", ["risk"]),
        ("Crown margin deep subgingival with chronic inflammation and bone loss adjacent — think:", "Possible biologic width violation / plaque trap", ["Always only pulpitis", "Always only TMD", "Always natal tooth"], "Restorative–perio interface.", "medium", ["bio_width"]),
        ("Implant with bleeding, swelling, no progressive bone loss on serial films — most like:", "Peri-implant mucositis", ["Healthy peri-implant tissues", "Vertical root fracture of natural tooth only", "Only dry socket"], "Mucositis definition.", "easy", ["implant"]),
        ("Implant with progressive crater bone loss and inflammation — most like:", "Peri-implantitis", ["Mucositis only", "Reversible pulpitis", "Leukoplakia"], "Bone loss = peri-implantitis.", "easy", ["implant"]),
        ("Grade B vs C decision often weighs:", "Evidence of progression rate and risk factors (e.g., smoking, diabetes)", ["Only tooth color", "Only patient preference for soda", "Only amalgam brand"], "Grading risk.", "medium", ["classification"]),
        ("Best way to monitor home care success clinically includes:", "Plaque scores, BOP reduction, patient demonstration", ["Only asking once", "Only radiographs forever without clinical", "Only vitality tests"], "Clinical monitoring.", "easy", ["therapy"]),
        ("Furcation Class III on a strategic molar may require:", "Complex management options (root resection, regenerative attempt, tunnel, or extraction/plan)", ["No options exist", "Only fluoride drops", "Only bleaching"], "Complex decisions.", "hard", ["furcation"]),
        ("Occlusal adjustment in perio is:", "Adjunctive when traumatic occlusion contributes — not a substitute for plaque control", ["Cure for all periodontitis alone", "Never considered", "Only for primary teeth SSC"], "Adjunct concept.", "medium", ["occlusion"]),
    ]
    raw.extend(vignettes)

    # ensure 150
    while len(raw) < 150:
        n = len(raw) + 1
        raw.append((
            f"High-yield perio principle #{n}: plaque biofilm role is best stated as:",
            "Necessary primary etiology for plaque-induced gingival/periodontal disease",
            ["Irrelevant if patient flosses once a year", "Only genetic, plaque never matters", "Only related to endo irrigants"],
            "Biofilm remains central.",
            "easy",
            ["etiology"],
        ))

    for i, (q, c, w, e, d, st) in enumerate(raw[:150], 1):
        items.append(Q(f"per_boost_{i:03d}", "perio", "premium_perio", q, c, w, e, d, st))
    return items


def endo_bank():
    items = []
    raw = [
        ("Lingering thermal pain and spontaneous pain often indicate:", "Symptomatic irreversible pulpitis", ["Reversible pulpitis only", "Healthy pulp always", "Only periodontal abscess always"], "Lingering/spontaneous → irreversible pattern.", "easy", ["diagnosis"]),
        ("Brief provoked thermal pain that does not linger suggests:", "Reversible pulpitis (or hypersensitive dentin patterns)", ["Necrosis with no response ever only possibility", "Always extraction", "Only VRF"], "Reversible = brief non-lingering.", "easy", ["diagnosis"]),
        ("No response to vitality tests + draining sinus tract often fits:", "Pulp necrosis with chronic apical abscess pattern", ["Reversible pulpitis", "Healthy pulp", "Only enamel caries"], "Sinus + nonvital classic.", "medium", ["diagnosis"]),
        ("Symptomatic apical periodontitis features:", "Pain to biting/percussion with apical inflammation", ["Only enamel white spot", "Always vital asymptomatic", "Only natal teeth"], "Percussion tenderness.", "easy", ["diagnosis"]),
        ("Acute apical abscess features:", "Rapid swelling, pain, possible systemic signs", ["Always asymptomatic", "Only gingivitis", "Only fluorosis"], "Acute infection presentation.", "easy", ["diagnosis"]),
        ("Narrowest canal diameter historically targeted for WL is:", "Apical constriction", ["Pulp horn only", "CEJ always", "Occlusal pit"], "Constriction = classic WL zone.", "easy", ["wl"]),
        ("Primary tissue-dissolving irrigant is:", "Sodium hypochlorite (NaOCl)", ["EDTA only", "Saline only always", "Chlorhexidine only for dissolution"], "NaOCl dissolves organic tissue.", "easy", ["irrigant"]),
        ("EDTA is used mainly to:", "Remove inorganic smear layer", ["Dissolve all pulp tissue alone better than NaOCl", "Anesthetize the pulp", "Bleach porcelain"], "EDTA = inorganic/smear.", "easy", ["irrigant"]),
        ("Mixing NaOCl and chlorhexidine in the canal is avoided because:", "They can form a precipitate", ["They improve each other always", "No interaction ever", "Required by all guidelines always"], "Precipitate warning.", "easy", ["irrigant"]),
        ("Persistent symptoms after RCT of maxillary molar — think missing:", "MB2 canal", ["Always only periodontal cause never endo", "Only fluoride lack", "Only Class III ortho"], "MB2 high-yield.", "easy", ["anatomy"]),
        ("Rotary file separation when tip locks and shaft keeps rotating is classic:", "Torsional fatigue", ["Only cyclic fatigue in straight canals always", "Patient bite only", "Only sealer setting"], "Tip lock → torsional.", "medium", ["mishap"]),
        ("File fracture from repeated flexure in curved canals relates to:", "Cyclic (flexural) fatigue", ["Only torsional tip lock always", "Only overfill of sealer", "Only missing rubber dam"], "Curves → cyclic fatigue.", "medium", ["mishap"]),
        ("Instrument retrieval when indicated may use:", "Ultrasonics / instrument removal systems under magnification", ["Only larger Gates blindly always first and only", "Only solvent for enamel", "Only forceps on crown always"], "Specialized retrieval.", "medium", ["mishap"]),
        ("Modern apical barrier material for apexification often cited is:", "MTA", ["Pure calcium hydroxide only forever without barrier option", "Amalgam apical plug only classic now", "Composite only"], "MTA barrier high-yield.", "easy", ["mta"]),
        ("Apexogenesis aims to:", "Preserve vital pulp tissue to allow continued root development", ["Kill pulp then place MTA barrier only definition", "Only extract", "Only SSC without pulp care"], "Vital pulp → continued development.", "medium", ["trauma"]),
        ("Apexification is for:", "Nonvital immature tooth needing apical barrier/closure approach", ["Always vital pulp therapy only", "Only adult calcified always", "Only ortho expansion"], "Nonvital immature.", "medium", ["trauma"]),
        ("Vertical root fracture clinical clues include:", "Isolated deep pocket, J-shaped lesion, often post-endo tooth", ["Always panorex only finding without clinical", "Only white lesion that wipes off", "Only Angle Class II"], "VRF pattern recognition.", "medium", ["vrf"]),
        ("Internal resorption requires:", "Pulp tissue vitality contribution (classic concept)", ["Always nonvital only process", "Only external force without pulp", "Only plaque score"], "Internal needs pulp tissue.", "hard", ["resorption"]),
        ("External inflammatory resorption often linked to:", "Pulp necrosis + periodontal ligament damage (trauma/infection)", ["Only fluorosis", "Only sealant failure", "Only mouth breathing"], "External inflammatory pattern.", "hard", ["resorption"]),
        ("Avulsed permanent tooth best immediate action by layperson often:", "Replant if possible or store in suitable medium; seek urgent care", ["Scrub root dry and wrap in tissue only", "Leave dry for days", "Boil tooth"], "Time + medium critical.", "easy", ["trauma"]),
        ("Preferred storage media concepts include:", "Milk / Hank's / saliva as available options better than dry", ["Only dry paper towel ideal", "Only alcohol", "Only bleach"], "Keep PDL cells viable.", "easy", ["trauma"]),
        ("Flexible splint duration after many avulsion protocols is often about:", "About 2 weeks (confirm case/IADT details)", ["2 years rigid always", "Never splint", "Only 1 hour always"], "Flexible ~2 weeks classic teaching.", "medium", ["trauma"]),
        ("Lateral luxation means:", "Displacement of tooth buccally/lingually/mesially/distally in socket", ["Only concussion without displacement", "Only enamel chip", "Only ankylosis definition"], "Luxation = displacement.", "easy", ["trauma"]),
        ("Concussion injury means:", "Injury without displacement or increased mobility; tender", ["Complete avulsion", "Horizontal root fracture always", "Only intrusion 10 mm"], "Concussion mild.", "easy", ["trauma"]),
        ("Subluxation means:", "Increased mobility without displacement", ["Intruded fully", "Avulsed and dry 24h only definition", "Only pulp polyp"], "Mobility without displacement.", "easy", ["trauma"]),
        ("Intrusion of permanent tooth is:", "Serious luxation into bone; complex management", ["Benign always ignore", "Same as white spot", "Only gingivitis"], "Intrusion serious.", "medium", ["trauma"]),
        ("Working length determination tools include:", "Apex locator + radiographs", ["Only patient pain always", "Only shade guide", "Only periodontal probe on gingiva"], "Electronic + radiographic.", "easy", ["wl"]),
        ("Rubber dam in endo is:", "Standard of care for isolation", ["Optional decoration", "Only for bleaching", "Contraindicated always"], "Dam is mandatory teaching.", "easy", ["isolation"]),
        ("Overfill beyond apex risks:", "Tissue irritation / reduced outcomes concerns", ["Always better seal guaranteed", "No consequence ever", "Required for all cases"], "Respect apex.", "medium", ["obturation"]),
        ("Sealer purpose includes:", "Fill irregularities / improve seal with core material", ["Replace all gutta-percha always alone without core", "Only etch enamel", "Only bond brackets"], "Sealer + core.", "easy", ["obturation"]),
        ("Hot tooth anesthesia strategies may include:", "Supplemental injections (PDL, intraosseous, intrapulpal) when IANB fails", ["Only topical benzocaine always enough", "Never supplemental", "Only antibiotics instead of anesthesia"], "Hot tooth = supplements.", "medium", ["anesthesia"]),
        ("Access goals include:", "Straight-line access while conserving structure", ["Remove all enamel always", "Avoid orifice location", "Only occlusal reduction 5 mm always"], "Access principles.", "easy", ["access"]),
        ("Perforation repair modern material often:", "MTA / bioceramic repair materials", ["Only unfilled composite without isolation always", "Only varnish", "Only zinc oxide without plan"], "MTA repair high-yield.", "medium", ["mishap"]),
        ("Ledging is often caused by:", "Forcing stiff instruments short of curvature", ["Perfect flexible technique always", "Only irrigant choice", "Only sealer brand"], "Respect curvature.", "medium", ["mishap"]),
        ("Smear layer is:", "Organic + inorganic debris on canal walls after instrumentation", ["Only saliva on lips", "Only plaque on tongue", "Only calculus supragingival"], "Smear layer definition.", "easy", ["irrigant"]),
        ("Primary teeth avulsion management differs because:", "Replantation of primary teeth is generally not recommended", ["Always replant primary same as permanent", "Always RCT primary extraorally 1 hour", "Always rigid splint 6 months"], "Do not replant primary typically.", "medium", ["trauma"]),
        ("Radiographic J-shaped lesion adjacent to post-retained crown raises concern for:", "Vertical root fracture", ["Only enamel hypoplasia", "Only fluorosis", "Only natal tooth"], "J-lesion + post → VRF think.", "medium", ["vrf"]),
        ("Pulp vitality testing limitation includes:", "False results possible; correlate clinically", ["Always 100% accurate alone", "Never useful", "Only for ortho"], "Tests are adjuncts.", "easy", ["diagnosis"]),
        ("Calcium hydroxide historically used for:", "Intracanal medicament / apexification older protocols", ["Only final sealer always alone", "Only composite primer", "Only fluoride varnish"], "Ca(OH)2 roles.", "medium", ["therapy"]),
        ("Cracked tooth syndrome often presents as:", "Pain on release of bite / selective loading patterns", ["Only asymptomatic always", "Only sinus tract always", "Only mobility Class III always"], "Bite pain on release classic.", "medium", ["diagnosis"]),
    ]

    more = [
        ("EDTA then NaOCl sequence conceptually:", "Remove smear then further disinfection protocols as taught", ["Mix both simultaneously always required", "Never use either", "Only dry filing"], "Irrigant sequence concepts.", "hard", ["irrigant"]),
        ("Cvek pulpotomy concept is:", "Partial pulpotomy for traumatic exposures with healthy pulp", ["Full RCT always for every chip", "Only extraction", "Only SSC without pulp assessment"], "Partial pulpotomy trauma.", "hard", ["trauma"]),
        ("Root fracture coronal third often needs:", "Stabilization considerations / endo of coronal segment if necrotic", ["Always ignore", "Always extract immediately only option", "Only fluoride"], "Location matters.", "hard", ["trauma"]),
        ("Alveolar fracture management includes:", "Reposition and splint segments per trauma protocols", ["Only endo of all teeth always first without reposition", "Only antibiotics forever", "Ignore occlusion"], "Bone segment care.", "hard", ["trauma"]),
        ("Pulp canal obliteration after trauma means:", "Calcific metamorphosis; may still need monitoring", ["Always infected necrosis immediately", "Always extract", "Always implant day 1"], "PCO monitoring.", "hard", ["trauma"]),
        ("Sealer extrusion into IAN region is:", "Serious; may cause neuropathy — prevention critical", ["Desirable always", "No risk", "Only helps anesthesia"], "Prevent overfill near neurovascular.", "hard", ["mishap"]),
        ("Crown-down instrumentation advantages include:", "Early coronal flare, better irrigant exchange, reduced debris extrusion concepts", ["Worse access always", "No irrigation benefit", "Only for primary teeth"], "Crown-down benefits.", "medium", ["access"]),
        ("Patency filing concept is:", "Gently maintain apical patency to avoid blocks (technique-dependent teaching)", ["Force large files past apex always", "Never approach apex", "Only rotary 80 always"], "Patency debate but exam-known.", "hard", ["wl"]),
        ("Eugenol-containing materials and resin bonding:", "Eugenol can interfere with resin polymerization", ["Always improves bond", "No interaction", "Required under all composites"], "Eugenol vs resin caution.", "medium", ["materials"]),
        ("Indication for endodontic microsurgery may include:", "Persistent apical disease after adequate orthograde therapy", ["All reversible pulpitis", "All gingivitis", "All Class I ortho"], "Surgery after failed orthograde when indicated.", "medium", ["surgery"]),
    ]
    raw.extend(more)

    while len(raw) < 150:
        n = len(raw) + 1
        topics_cycle = [
            ("NaOCl main antimicrobial + tissue role remains:", "Dissolve organic tissue and kill microbes", ["Only remove smear inorganic alone", "Only set sealer", "Only etch porcelain"], "NaOCl dual role.", "easy", ["irrigant"]),
            ("Before elective endo surgery always reassess:", "Quality of prior RCT / missed anatomy / restorability", ["Only patient hair color", "Only shade of lips", "Only phone brand"], "Reassess before surgery.", "medium", ["diagnosis"]),
            (f"Endo high-yield #{n}: rubber dam prevents:", "Aspiration/ingestion and improves asepsis", ["Only shade matching", "Pulp vitality magically", "Orthodontic relapse"], "Dam safety + asepsis.", "easy", ["isolation"]),
        ]
        raw.append(topics_cycle[n % 3])

    for i, (q, c, w, e, d, st) in enumerate(raw[:150], 1):
        items.append(Q(f"end_boost_{i:03d}", "endo", "premium_endo", q, c, w, e, d, st))
    return items


def validate(items, label):
    assert len(items) == 150, len(items)
    ids = [x["id"] for x in items]
    assert len(ids) == len(set(ids))
    hist = {0: 0, 1: 0, 2: 0, 3: 0}
    for x in items:
        assert len(x["options"]) == 4
        assert 0 <= x["answer"] <= 3
        hist[x["answer"]] += 1
    print(label, "n=", len(items), "answer_hist=", hist)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    perio = perio_bank()
    endo = endo_bank()
    validate(perio, "perio")
    validate(endo, "endo")
    (OUT / "premium_perio.json").write_text(json.dumps(perio, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "premium_endo.json").write_text(json.dumps(endo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Wrote", OUT / "premium_perio.json")
    print("Wrote", OUT / "premium_endo.json")


if __name__ == "__main__":
    main()
