#!/usr/bin/env node
/**
 * Build printable DOCX packs for SDLE prep (always-comes + 14-day plan + high-yield cards).
 */
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  PageBreak,
} = require("docx");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "print");
fs.mkdirSync(OUT, { recursive: true });

// Load data via eval (window globals)
const window = {};
eval(fs.readFileSync(path.join(ROOT, "data/highyield.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "data/lessons.js"), "utf8"));
eval(fs.readFileSync(path.join(ROOT, "data/plan.js"), "utf8"));

const borderBottom = {
  bottom: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6", space: 1 },
};

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun(text)],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun(text)],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: !!opts.bold,
        size: opts.size || 22,
        font: "Arial",
      }),
    ],
  });
}
function bullet(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20 })],
  });
}

const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
    {
      reference: "days",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        },
      ],
    },
  ],
};

const page = {
  size: { width: 12240, height: 15840 },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
};

function makeDoc(title, children) {
  return new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "2E75B6" },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 },
        },
      ],
    },
    numbering,
    sections: [
      {
        properties: { page },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: borderBottom,
                children: [
                  new TextRun({
                    text: `KSA SDLE Prep · ${title}`,
                    font: "Arial",
                    size: 18,
                    color: "666666",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Target ≥80% · Pass ~542/800 · Page ", size: 16, font: "Arial", color: "888888" }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "888888" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

async function writeDoc(filename, title, children) {
  const doc = makeDoc(title, children);
  const buf = await Packer.toBuffer(doc);
  const out = path.join(OUT, filename);
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, buf.length, "bytes");
}

async function main() {
  // 1) Always-comes
  const ac = [];
  ac.push(h1("Always-comes free points"));
  ac.push(p("Memorize cold. These repeat across SDLE-style banks.", { size: 20 }));
  const rules = window.ALWAYS_COMES_READ || [];
  rules.forEach((r, i) => {
    ac.push(h2(`${i + 1}. ${r[0]}`));
    ac.push(p(r[1]));
  });
  await writeDoc("01_always_comes.docx", "Always-comes", ac);

  // 2) 14-day plan
  const plan = [];
  plan.push(h1("14-day SDLE plan (pass-first)"));
  plan.push(
    p(
      "Exam: 200 MCQs · ~4h · Restorative ~40% · Perio 18% · Endo 17% · OMS 15% · Ortho/Pedo 10%. Target practice ≥80%."
    )
  );
  plan.push(h2("ADHD OS"));
  [
    "One day only in the app (Today tab).",
    "Pomodoro: 45 min work · 5 min break · phone away.",
    "Order: Read → Videos (listed only) → Cards → 100–200 MCQs → Mock → Always-comes.",
    "Never stop after one small quiz. Use Block 1 → 2 → 3.",
    "Every miss → one line in Wrong book.",
  ].forEach((t) => plan.push(bullet(t)));

  const lessons = window.LESSONS || [];
  const plan14 = window.PLAN_14 || [];
  for (const L of lessons) {
    const P = plan14.find((x) => x.day === L.day) || {};
    plan.push(h2(`Day ${L.day}: ${L.title}`));
    plan.push(p(`Focus: ${L.focus} · ${L.hours || P.hours || ""}`));
    plan.push(p(`Goal: ${L.goal || P.goal || ""}`));
    if (P.tasks && P.tasks.length) {
      plan.push(p("Tasks:", { bold: true }));
      P.tasks.forEach((t) => plan.push(bullet(t)));
    }
    if (L.videos && L.videos.length) {
      plan.push(p(`Videos (${L.videos.length}):`, { bold: true }));
      L.videos.forEach((v) => plan.push(bullet(v.label || v.file)));
    }
    if (L.quizSets && L.quizSets.length) {
      plan.push(p("Quiz blocks:", { bold: true }));
      L.quizSets.forEach((s) => plan.push(bullet(`${s.label} (${s.topic}, ${s.count}Q)`)));
    }
  }
  await writeDoc("02_14_day_plan.docx", "14-day plan", plan);

  // 3) Flashcards
  const cards = [];
  cards.push(h1("High-yield flashcards"));
  cards.push(p("Cover left column; say answer; check right. ADHD: 15–20 cards per sitting."));
  const decks = {};
  for (const c of window.FLASHCARDS || []) {
    if (!c || !c.front) continue;
    const d = c.deck || "misc";
    if (!decks[d]) decks[d] = [];
    decks[d].push(c);
  }
  for (const [deck, list] of Object.entries(decks)) {
    cards.push(h2(`Deck: ${deck} (${list.length})`));
    list.forEach((c, i) => {
      cards.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `Q${i + 1}. `, bold: true, font: "Arial", size: 20 }),
            new TextRun({ text: c.front, font: "Arial", size: 20 }),
          ],
        })
      );
      cards.push(
        new Paragraph({
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "A: ", bold: true, font: "Arial", size: 20, color: "2E7D32" }),
            new TextRun({ text: c.back, font: "Arial", size: 20 }),
          ],
        })
      );
    });
  }
  await writeDoc("03_flashcards.docx", "Flashcards", cards);

  // 4) Day cheat sheets (strip HTML roughly for days 1-9 goals + first 1500 plain chars)
  const cheats = [];
  cheats.push(h1("Day study sheets (summary)"));
  cheats.push(
    p(
      "Full lessons live in the app. This print pack is a pocket checklist — not a substitute for in-app reading + MCQs."
    )
  );
  for (const L of lessons.filter((x) => x.day <= 9)) {
    cheats.push(h2(`Day ${L.day}: ${L.title}`));
    cheats.push(p(`Goal: ${L.goal}`));
    const plain = String(L.reading || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1800);
    cheats.push(p(plain + (plain.length >= 1800 ? "…" : "")));
    cheats.push(p(`App quiz topic: ${L.quizTopic} · Aim ≥150 MCQs on content days.`, { bold: true }));
  }
  await writeDoc("04_day_cheatsheets.docx", "Day cheatsheets", cheats);

  console.log("All print packs ready in", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
