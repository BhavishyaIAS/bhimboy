// Import the APPSC Group-I syllabus (data/appsc_syllabus.json) into Supabase.
//
// Maps the source's 6 levels (stage → paper → section → unit → theme →
// micro_theme) onto the platform's 4 levels:
//   Paper      = "<stage> — <paper>"      (stage stored on papers.stage)
//   Subject    = section
//   Topic      = unit
//   Micro-theme= "<theme> — <micro_theme>", code = source id
//
// Everything is loaded as `draft` so the admin publishes as content is added.
//
// Usage:
//   node scripts/import-syllabus.mjs           # insert (skips existing codes)
//   node scripts/import-syllabus.mjs --wipe    # delete all papers first
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
// environment (loaded from .env.local when run via npm run import:syllabus).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Honour HTTPS_PROXY when running behind a proxy (dev/CI); no-op otherwise.
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "data", "appsc_syllabus.json");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const WIPE = process.argv.includes("--wipe");

function slugify(input) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "untitled"
  );
}

async function insertReturning(table, rows) {
  // Insert in chunks and collect the returned rows (with ids).
  const out = [];
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const { data, error } = await supabase.from(table).insert(slice).select();
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
  }
  return out;
}

async function main() {
  const doc = JSON.parse(readFileSync(DATA, "utf8"));
  const items = doc.micro_themes;
  console.log(`Loaded ${items.length} micro-themes from ${doc.source}`);

  if (WIPE) {
    // Deleting papers cascades to subjects → topics → microthemes → content.
    const { error } = await supabase
      .from("papers")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(`wipe: ${error.message}`);
    console.log("Wiped existing papers (cascaded to all syllabus content).");
  }

  // ---- Build the ordered hierarchy in memory ----
  const paperOrder = [];
  const papers = new Map(); // key -> { name, stage, sort_order, subjects: Map }

  for (const it of items) {
    const stage = it.stage.toLowerCase() === "prelims" ? "prelims" : "mains";
    const paperName = `${it.stage} — ${it.paper}`;
    if (!papers.has(paperName)) {
      papers.set(paperName, {
        name: paperName,
        stage,
        sort_order: paperOrder.length + 1,
        subjects: new Map(),
        subjectOrder: [],
      });
      paperOrder.push(paperName);
    }
    const paper = papers.get(paperName);

    const section = it.section;
    if (!paper.subjects.has(section)) {
      paper.subjects.set(section, {
        name: section,
        sort_order: paper.subjectOrder.length + 1,
        topics: new Map(),
        topicOrder: [],
      });
      paper.subjectOrder.push(section);
    }
    const subject = paper.subjects.get(section);

    const unit = it.unit;
    if (!subject.topics.has(unit)) {
      subject.topics.set(unit, {
        name: unit,
        sort_order: subject.topicOrder.length + 1,
        micros: [],
      });
      subject.topicOrder.push(unit);
    }
    const topic = subject.topics.get(unit);

    topic.micros.push({
      code: it.id,
      name: `${it.theme} — ${it.micro_theme}`,
      sort_order: topic.micros.length + 1,
    });
  }

  // ---- Skip micro-themes whose code already exists (idempotent) ----
  const { data: existing } = await supabase.from("microthemes").select("code");
  const existingCodes = new Set((existing ?? []).map((r) => r.code));

  // ---- Insert papers ----
  const paperRows = paperOrder.map((name) => ({
    name: papers.get(name).name,
    stage: papers.get(name).stage,
    sort_order: papers.get(name).sort_order,
  }));
  const insertedPapers = await insertReturning("papers", paperRows);
  const paperIdByName = new Map(insertedPapers.map((p) => [p.name, p.id]));
  console.log(`Inserted ${insertedPapers.length} papers`);

  // ---- Insert subjects ----
  const subjectRows = [];
  for (const pName of paperOrder) {
    const paper = papers.get(pName);
    const paperId = paperIdByName.get(pName);
    for (const sName of paper.subjectOrder) {
      const s = paper.subjects.get(sName);
      subjectRows.push({
        paper_id: paperId,
        name: s.name,
        sort_order: s.sort_order,
        status: "draft",
        _key: `${paperId}|${sName}`,
      });
    }
  }
  const insertedSubjects = await insertReturning(
    "subjects",
    subjectRows.map(({ _key, ...r }) => r)
  );
  // Match returned rows back to keys by (paper_id, name) — unique within paper.
  const subjectIdByKey = new Map();
  for (const s of insertedSubjects) {
    subjectIdByKey.set(`${s.paper_id}|${s.name}`, s.id);
  }
  console.log(`Inserted ${insertedSubjects.length} subjects`);

  // ---- Insert topics ----
  const topicRows = [];
  for (const pName of paperOrder) {
    const paper = papers.get(pName);
    const paperId = paperIdByName.get(pName);
    for (const sName of paper.subjectOrder) {
      const s = paper.subjects.get(sName);
      const subjectId = subjectIdByKey.get(`${paperId}|${sName}`);
      for (const tName of s.topicOrder) {
        const t = s.topics.get(tName);
        topicRows.push({
          subject_id: subjectId,
          name: t.name,
          sort_order: t.sort_order,
          status: "draft",
        });
      }
    }
  }
  const insertedTopics = await insertReturning("topics", topicRows);
  const topicIdByKey = new Map();
  for (const t of insertedTopics) {
    topicIdByKey.set(`${t.subject_id}|${t.name}`, t.id);
  }
  console.log(`Inserted ${insertedTopics.length} topics`);

  // ---- Insert micro-themes ----
  const usedSlugs = new Set();
  const microRows = [];
  for (const pName of paperOrder) {
    const paper = papers.get(pName);
    const paperId = paperIdByName.get(pName);
    for (const sName of paper.subjectOrder) {
      const subjectId = subjectIdByKey.get(`${paperId}|${sName}`);
      const s = paper.subjects.get(sName);
      for (const tName of s.topicOrder) {
        const topicId = topicIdByKey.get(`${subjectId}|${tName}`);
        const t = s.topics.get(tName);
        for (const m of t.micros) {
          if (existingCodes.has(m.code)) continue;
          let slug = slugify(m.name);
          if (usedSlugs.has(slug)) slug = `${slug}-${m.code.toLowerCase()}`;
          let n = 2;
          while (usedSlugs.has(slug)) slug = `${slugify(m.name)}-${n++}`;
          usedSlugs.add(slug);
          microRows.push({
            topic_id: topicId,
            name: m.name,
            code: m.code,
            slug,
            sort_order: m.sort_order,
            status: "draft",
          });
        }
      }
    }
  }
  const insertedMicros = await insertReturning("microthemes", microRows);
  console.log(`Inserted ${insertedMicros.length} micro-themes`);

  console.log("\nDone.");
  console.log(
    `Summary: ${insertedPapers.length} papers, ${insertedSubjects.length} subjects, ` +
      `${insertedTopics.length} topics, ${insertedMicros.length} micro-themes.`
  );
}

main().catch((e) => {
  console.error("\nImport failed:", e.message);
  process.exit(1);
});
