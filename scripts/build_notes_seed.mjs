#!/usr/bin/env node
/**
 * Extract ALL notes from data/exam_packs.js → data/generated/phase_a/notes_seed.json
 * Full dump — no truncation of the notes list.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JSON = path.join(ROOT, "data/generated/phase_a/notes_seed.json");
const OUT_MD = path.join(ROOT, "data/generated/phase_a/NOTES_SEED_REPORT.md");

function loadExamPacks() {
  const src = fs.readFileSync(path.join(ROOT, "data/exam_packs.js"), "utf8");
  const g = { window: {} };
  const fn = new Function("window", src + "\n;return window.EXAM_PACKS;");
  return fn(g.window);
}

/** Keyword department guess (first match wins; order = specificity). */
function guessDepartment(text) {
  const t = String(text || "").toLowerCase();

  const rules = [
    {
      dept: "endo",
      re: /\b(endo|endodont|pulp|periapical|apexif|obtura|gutta[\s-]?percha|root\s*canal|rct|irri(?:gation|gant)|sodium\s*hypochlorite|naocl|mta\b|calcium\s*hydroxide|ledermix|file\s*separation|working\s*length)\b/i,
    },
    {
      dept: "perio",
      re: /\b(perio|periodont|gingiv|pocket|scaling|root\s*plan|srp\b|furcation|attachment\s*loss|osseous\s*surgery|gtr\b|guided\s*tissue|plaque\s*index|bleeding\s*on\s*probing|bop\b|cal\b|periodontal)\b/i,
    },
    {
      dept: "ortho",
      re: /\b(ortho|orthodont|malocclusion|class\s*[i1]{1,3}\b|cephalometr|bracket|archwire|retainer|space\s*maintainer|leeway|mixed\s*dentition|growth\s*modif|headgear|functional\s*appliance|pedo|pediatric|fluoride\s*varnish|ssc\b|stainless\s*steel\s*crown|pulpotomy|pulpectomy)\b/i,
    },
    {
      dept: "operative",
      re: /\b(operative|composite|amalgam|black'?s?\s*class|matrix\s*band|tofflemire|cavity\s*prep|acid\s*etch|bonding\s*agent|shade\s*match|g\.?i\.?c\.?|glass\s*ionomer|caries|incremental\s*build|rubber\s*dam)\b/i,
    },
    {
      dept: "prostho",
      re: /\b(prostho|prosthodont|rpd\b|fpd\b|fixed\s*partial|removable\s*partial|complete\s*denture|cd\b|overdenture|abutment|pontic|impression\s*material|pvs\b|alginate|occlusion\s*scheme|centric\s*relation|crown\s*prep|veneer|implant\s*crown|cement\s*retained|screw\s*retained)\b/i,
    },
    {
      dept: "oms",
      re: /\b(oms\b|oral\s*surg|maxillofac|extraction|impacted|third\s*molar|wisdom|fracture|trauma|biopsy|cyst|tumor|patholog|anesthesia|la\b|local\s*anest|lidocaine|articaine|nerve\s*block|ianb|medical\s*emergency|syncope|asprin|aspirin|warfarin|bisphosphon|mronj|orofacial)\b/i,
    },
    {
      dept: "ethics",
      re: /\b(ethic|consent|confidential|malpractice|infection\s*control|steriliz|autoclave|cross[\s-]?infect|ppe\b|needle\s*stick|professionalism|negligence|informed\s*consent|hipaa|scfhs|licensure)\b/i,
    },
  ];

  for (const { dept, re } of rules) {
    if (re.test(t)) return dept;
  }
  return "mixed";
}

function stemPreview(stem, max = 120) {
  const s = String(stem || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function main() {
  const packsRoot = loadExamPacks();
  const packs = packsRoot.packs || [];
  const notes = [];
  let noteIdx = 0;
  const byDept = {
    endo: 0,
    perio: 0,
    ortho: 0,
    operative: 0,
    prostho: 0,
    oms: 0,
    ethics: 0,
    mixed: 0,
  };
  const byPack = {};

  for (const pack of packs) {
    const packId = pack.id || "unknown";
    byPack[packId] = { items: (pack.items || []).length, notes: 0, itemsWithNotes: 0 };
    for (const item of pack.items || []) {
      const itemNotes = item.notes || [];
      if (itemNotes.length) byPack[packId].itemsWithNotes++;
      for (const raw of itemNotes) {
        const text = typeof raw === "string" ? raw : String(raw?.text ?? raw ?? "");
        if (!text.trim()) continue;
        noteIdx += 1;
        const blob = `${item.stem || ""}\n${text}`;
        const department = guessDepartment(blob);
        byDept[department] = (byDept[department] || 0) + 1;
        byPack[packId].notes += 1;
        notes.push({
          id: `note_${String(noteIdx).padStart(5, "0")}`,
          text,
          sourcePack: packId,
          month: item.month || null,
          stemPreview: stemPreview(item.stem),
          department,
          itemN: item.n ?? null,
        });
      }
    }
  }

  const payload = {
    built: new Date().toISOString().slice(0, 10),
    purpose: "Phase A seed: every item.notes[] from EXAM_PACKS (full dump, no cap).",
    totalNotes: notes.length,
    byDepartment: byDept,
    byPack,
    packMeta: packs.map((p) => ({
      id: p.id,
      itemCountExtracted: p.itemCountExtracted,
      itemsLength: (p.items || []).length,
      noteCountMeta: p.noteCount ?? null,
      notesExtracted: byPack[p.id]?.notes ?? 0,
      itemsWithNotes: byPack[p.id]?.itemsWithNotes ?? 0,
    })),
    notes,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + "\n", "utf8");

  const deptLines = Object.entries(byDept)
    .sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `| ${d} | ${n} |`)
    .join("\n");

  const packLines = payload.packMeta
    .map(
      (p) =>
        `| ${p.id} | ${p.itemsLength} | ${p.itemCountExtracted} | ${p.noteCountMeta ?? "—"} | ${p.itemsWithNotes} | ${p.notesExtracted} |`
    )
    .join("\n");

  const md = `# Notes seed report (Phase A)

**Built:** ${payload.built}  
**Source:** \`data/exam_packs.js\` → all \`item.notes[]\` (full dump, no truncation).  
**Output:** \`data/generated/phase_a/notes_seed.json\`

## Totals

| Metric | Count |
|--------|------:|
| Total notes | **${notes.length}** |
| Packs scanned | ${packs.length} |

## By department (keyword guess)

| Department | Notes |
|------------|------:|
${deptLines}

## By pack

| Pack | items.length | itemCountExtracted | noteCount meta | items w/ notes | notes extracted |
|------|-------------:|-------------------:|---------------:|---------------:|----------------:|
${packLines}

## Schema (each note)

\`\`\`json
{
  "id": "note_00001",
  "text": "...",
  "sourcePack": "abtal_mar_june_2026",
  "month": "March 2026",
  "stemPreview": "…",
  "department": "endo|perio|ortho|operative|prostho|oms|ethics|mixed",
  "itemN": 1
}
\`\`\`

Department is a **keyword heuristic** on stem+note text — not final clinical labeling.
`;

  fs.writeFileSync(OUT_MD, md, "utf8");

  console.log("Wrote", OUT_JSON);
  console.log("Wrote", OUT_MD);
  console.log("totalNotes:", notes.length);
  console.log("byDepartment:", JSON.stringify(byDept, null, 2));
}

main();
