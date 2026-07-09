// Builds data/appsc_syllabus_v2.json from the base breakdown plus
// data/syllabus-refinements.json (audit-driven renames/additions), and
// enriches EVERY micro-theme with practical-coverage metadata:
//
//   priority     1 = core (highest PYQ yield / AP-specific / do first)
//                2 = important (full-coverage layer)
//                3 = supporting (qualifying papers, low-yield depth)
//   est_minutes  one-sitting estimate from cognitive level + stage
//   exam_overlap true when the theme serves both Prelims and Mains
//
// Run: node scripts/refine-syllabus.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "appsc_syllabus.json"), "utf8")
);
const overlay = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "syllabus-refinements.json"), "utf8")
);

const items = base.micro_themes.map((m) => ({ ...m }));

// ---- 1. renames ----
for (const r of overlay.renames) {
  const item = items.find((m) => m.id === r.code);
  if (!item) throw new Error(`rename: unknown code ${r.code}`);
  if (r.theme) item.theme = r.theme;
  if (r.micro_theme) item.micro_theme = r.micro_theme;
}

// ---- 2. additions (inserted after an anchor; "CODE+n" = after the nth
//         previously-added node that followed CODE) ----
// New ids continue each paper's numeric series (globally unique).
function paperKey(id) {
  return id.split("-").slice(0, 2).join("-"); // e.g. "MN-PII", "PRE-PI"
}
const maxNum = new Map();
for (const m of items) {
  const key = paperKey(m.id);
  const n = parseInt(m.id.split("-").pop(), 10);
  maxNum.set(key, Math.max(maxNum.get(key) ?? 0, n));
}

const inserted = new Map(); // anchor code -> array of new ids in order
for (const a of overlay.additions) {
  let anchorId = a.after;
  const plus = anchorId.match(/^(.*)\+(\d+)$/);
  if (plus) {
    const priorInserts = inserted.get(plus[1]) ?? [];
    anchorId = priorInserts[Number(plus[2]) - 1];
    if (!anchorId) throw new Error(`addition anchor not found: ${a.after}`);
  }
  const idx = items.findIndex((m) => m.id === anchorId);
  if (idx < 0) throw new Error(`addition: unknown anchor ${a.after}`);

  const anchor = items[idx];
  const key = paperKey(anchor.id);
  const nextNum = (maxNum.get(key) ?? 0) + 1;
  maxNum.set(key, nextNum);
  const prefix = anchor.id.split("-").slice(0, -1).join("-");
  const id = `${prefix}-${String(nextNum).padStart(3, "0")}`;

  const node = {
    id,
    stage: anchor.stage,
    paper: a.paper,
    section: a.section,
    unit_no: a.unit_no,
    unit: a.unit,
    theme: a.theme,
    micro_theme: a.micro_theme,
    geographic_scope: anchor.geographic_scope ?? "India/General",
    cognitive_level: a.cognitive_level ?? "Conceptual",
    in_both_prelims_mains: a.in_both_prelims_mains ?? true,
    content: { notes_id: null, video_id: null, quiz_id: null, flashcards_id: null },
    status: "not_started",
  };
  items.splice(idx + 1, 0, node);
  const list = inserted.get(a.after.replace(/\+\d+$/, "")) ?? [];
  list.push(id);
  inserted.set(a.after.replace(/\+\d+$/, ""), list);
}

// ---- 3. metadata: priority ----
// Defaults by (paper, section); refined by unit where it matters.
function priorityFor(m) {
  const p = m.paper;
  const s = m.section;
  const u = Number(m.unit_no) || 0;

  // Qualifying language papers: pass, don't rank.
  if (p.startsWith("Language:")) return 3;

  if (p === "Paper-I: General Studies") {
    if (s === "History & Culture") return u >= 4 ? 1 : 2; // modern = core
    if (s === "Polity, Social Justice & IR")
      return m.unit === "Foreign Policy & IR" ? 2 : 1;
    if (s === "Indian & AP Economy") return 1;
    if (s === "Geography") return 2;
  }
  if (p === "Paper-II: General Aptitude") {
    if (s === "Mental & Psychological Abilities")
      return /Emotional|Social/.test(m.unit) ? 2 : 1; // maths/reasoning = score bank
    if (s === "Science & Technology")
      return m.unit === "Environmental Science" ? 1 : 2;
    if (s === "Current Events") return 1;
  }
  if (p === "Paper-I: General Essay")
    return s === "Essay Skills" ? 1 : 2;
  if (p.startsWith("Paper-II: History")) {
    if (s === "History & Culture of India") return u >= 4 ? 1 : 2;
    if (s === "History & Culture of AP") return u >= 8 ? 1 : 2; // modern AP + bifurcation
    if (s === "Geography")
      return m.unit === "Fauna & Flora" ? 3 : m.unit === "Environmental Geography" ? 1 : 2;
  }
  if (p.startsWith("Paper-III")) {
    return s === "Law in India" ? 2 : 1; // polity/governance/ethics = core of GS mains
  }
  if (p.startsWith("Paper-IV")) {
    // AP-specific units + budgeting + challenges + inclusive growth = guaranteed questions
    const coreUnits = new Set([1, 3, 4, 5, 6, 8, 10, 12]);
    return coreUnits.has(u) ? 1 : 2;
  }
  if (p.startsWith("Paper-V")) {
    if (["Environment & Development", "Pollution & Legislation", "Energy"].includes(s)) return 1;
    if (s === "IPR in S&T") return 3;
    return 2;
  }
  return 2;
}

// ---- 4. metadata: est_minutes ----
function minutesFor(m) {
  const byLevel = { Factual: 45, Conceptual: 60, Analytical: 75 };
  let min = byLevel[m.cognitive_level] ?? 60;
  // mains-only themes need answer-writing practice on top of reading
  if (m.stage === "Mains" && !m.in_both_prelims_mains) min += 15;
  if (m.paper.startsWith("Language:")) min = 60;
  if (m.paper === "Paper-I: General Essay" && m.section !== "Essay Skills") min = 90;
  return Math.min(90, Math.max(45, min));
}

for (const m of items) {
  m.priority = priorityFor(m);
  m.est_minutes = minutesFor(m);
  m.exam_overlap = !!m.in_both_prelims_mains;
}

// ---- 5. write v2 + report ----
const out = {
  ...base,
  schema_version: "2.0",
  refined: overlay.rationale,
  count: items.length,
  micro_themes: items,
};
writeFileSync(
  join(__dirname, "..", "data", "appsc_syllabus_v2.json"),
  JSON.stringify(out, null, 2)
);

const byPriority = [1, 2, 3].map(
  (p) => items.filter((m) => m.priority === p).length
);
const totalHours = Math.round(items.reduce((s, m) => s + m.est_minutes, 0) / 60);
const coreHours = Math.round(
  items.filter((m) => m.priority === 1).reduce((s, m) => s + m.est_minutes, 0) / 60
);
console.log(`v2 written: ${items.length} micro-themes (was ${base.micro_themes.length})`);
console.log(`priority: core=${byPriority[0]} important=${byPriority[1]} supporting=${byPriority[2]}`);
console.log(`one-pass coverage: ~${totalHours}h total · ~${coreHours}h core-first`);
console.log(`overlap (study once, counts twice): ${items.filter((m) => m.exam_overlap).length}`);
const newOnes = items.filter((m) => !base.micro_themes.some((b) => b.id === m.id));
console.log("new nodes:");
for (const n of newOnes) console.log(`  [${n.id}] ${n.micro_theme}`);
