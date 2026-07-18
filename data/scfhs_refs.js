/**
 * SCFHS Appendix C — Suggested SDLE Examination References (Jan 2019).
 * Source: Drive SDLE Book / References.jpg → data/raw/books/meta/References.jpg
 * DISCLAIMER (on sheet): study aid only; SCFHS does not claim exam items come from these texts.
 * Use for honest "suggested study refs" badges — never invent page numbers.
 */
(function (w) {
  const DISCLAIMER =
    "SCFHS Appendix C (Jan 2019) suggested study texts only — not proof that this MCQ is quoted from them.";

  const SECTIONS = {
    oral_medicine_surgery: {
      label: "Oral Medicine / Oral Surgery",
      books: [
        "Neville — Oral & Maxillofacial Pathology (4e)",
        "White & Pharoah — Oral Radiology (7e)",
        "Little & Falace — Dental Management of the Medically Compromised (9e)",
        "Hupp — Contemporary Oral & Maxillofacial Surgery (6e)",
      ],
    },
    periodontics: {
      label: "Periodontics",
      books: [
        "Lang & Lindhe — Clinical Periodontology & Implant Dentistry (6e)",
        "Carranza — Clinical Periodontology (latest)",
        "Rose — Periodontics: Medicine, Surgery and Implants",
      ],
    },
    ortho_pedo: {
      label: "Orthodontics / Pediatric Dentistry",
      books: [
        "McDonald & Avery — Dentistry for the Child and Adolescent (10e)",
        "Casamassimo — Pediatric Dentistry: Infancy through Adolescence (5e)",
        "Mitchell — An Introduction to Orthodontics (4e)",
        "Proffit — Contemporary Orthodontics (5e)",
      ],
    },
    restorative: {
      label: "Restorative (Operative / Prostho / basic implant)",
      books: [
        "Sturdevant — Art & Science of Operative Dentistry (5e)",
        "McCracken — Removable Partial Prosthodontics (12e)",
        "Rosenstiel — Contemporary Fixed Prosthodontics (4e)",
        "Rahn — Textbook of Complete Dentures (5e)",
      ],
    },
    endodontics: {
      label: "Endodontics",
      books: [
        "Cohen / Hargreaves — Pathways of the Pulp (11e)",
        "Torabinejad — Endodontics Principles and Practice (5e)",
      ],
    },
    common: {
      label: "Local anesthesia / Infection control / Ethics",
      books: [
        "Malamed — Handbook of Local Anesthesia (6e)",
        "CDC / Basic Guide to Infection Prevention & Control in Dentistry (2009)",
        "Pankhurst & Coulter — Infection control in dental settings (2003)",
        "SCFHS — Professionalism and Ethics Handbook for Residents (2015)",
      ],
    },
  };

  /** Map app topic / pool / focus → section key */
  const TOPIC_TO_SECTION = {
    perio: "periodontics",
    periodontics: "periodontics",
    endo: "endodontics",
    endodontics: "endodontics",
    operative: "restorative",
    restorative: "restorative",
    resto: "restorative",
    fixed: "restorative",
    rpd: "restorative",
    complete_denture: "restorative",
    materials: "restorative",
    implant: "restorative",
    prostho: "restorative",
    oms: "oral_medicine_surgery",
    surgery: "oral_medicine_surgery",
    path: "oral_medicine_surgery",
    omfs: "oral_medicine_surgery",
    oral_med: "oral_medicine_surgery",
    ortho: "ortho_pedo",
    pedo: "ortho_pedo",
    ortho_pedo: "ortho_pedo",
    ethics: "common",
    infection_control: "common",
    anesthesia: "common",
    local_anesthesia: "common",
    med: "common",
    always: "common",
    mixed: "restorative",
  };

  function sectionForTopic(topic) {
    if (!topic) return null;
    const t = String(topic).toLowerCase().trim();
    if (TOPIC_TO_SECTION[t]) return TOPIC_TO_SECTION[t];
    // fuzzy
    if (t.includes("perio")) return "periodontics";
    if (t.includes("endo")) return "endodontics";
    if (t.includes("ortho") || t.includes("pedo")) return "ortho_pedo";
    if (t.includes("surg") || t.includes("path") || t.includes("oms")) return "oral_medicine_surgery";
    if (t.includes("ethic") || t.includes("infect") || t.includes("anesth")) return "common";
    if (
      t.includes("resto") ||
      t.includes("oper") ||
      t.includes("fixed") ||
      t.includes("rpd") ||
      t.includes("denture") ||
      t.includes("material") ||
      t.includes("implant")
    )
      return "restorative";
    return null;
  }

  function scfhsRefsForTopic(topic) {
    const key = sectionForTopic(topic);
    if (!key || !SECTIONS[key]) return [];
    return SECTIONS[key].books.slice();
  }

  function scfhsSectionLabel(topic) {
    const key = sectionForTopic(topic);
    return key && SECTIONS[key] ? SECTIONS[key].label : "";
  }

  function scfhsRefsHtml(topic, opts) {
    opts = opts || {};
    const books = scfhsRefsForTopic(topic);
    if (!books.length) return "";
    const label = scfhsSectionLabel(topic) || "Study refs";
    const short = opts.short;
    const list = short ? books.slice(0, 2) : books;
    const more = short && books.length > 2 ? ` (+${books.length - 2} more)` : "";
    return (
      `<div class="scfhs-refs">` +
      `<div class="scfhs-refs-title"><strong>Suggested study refs</strong> — ${escape(label)}</div>` +
      `<ul class="scfhs-refs-list">${list.map((b) => `<li>${escape(b)}</li>`).join("")}</ul>` +
      (more ? `<div class="muted">${escape(more)}</div>` : "") +
      `<div class="src-line muted">${escape(DISCLAIMER)}</div>` +
      `</div>`
    );
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  w.SCFHS_APPENDIX_C = {
    disclaimer: DISCLAIMER,
    sections: SECTIONS,
    topicMap: TOPIC_TO_SECTION,
  };
  w.scfhsRefsForTopic = scfhsRefsForTopic;
  w.scfhsSectionLabel = scfhsSectionLabel;
  w.scfhsRefsHtml = scfhsRefsHtml;
  w.scfhsSectionForTopic = sectionForTopic;
})(typeof window !== "undefined" ? window : globalThis);
