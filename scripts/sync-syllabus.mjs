// Syncs data/appsc_syllabus_v2.json into the live database BY CODE:
//   - updates name / theme-prefix / sort_order / metadata of existing nodes
//   - inserts new nodes (as drafts) in the right position
//   - NEVER deletes anything and never touches notes/videos/PYQs/glossary
// Safe to run repeatedly. Run supabase/migrations/0004 first for metadata.
//
// Run: node --env-file=.env.local scripts/sync-syllabus.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(join(__dirname, "..", "data", "appsc_syllabus_v2.json"), "utf8")
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function slugify(input) {
  return (
    input.toLowerCase().normalize("NFKD")
      .replace(/[̀-ͯ]/g, "").replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) ||
    "untitled"
  );
}

// Detect whether the 0004 metadata columns exist.
async function metadataReady() {
  const { error } = await supabase.from("microthemes").select("priority").limit(1);
  return !error;
}

async function main() {
  const hasMeta = await metadataReady();
  if (!hasMeta) {
    console.warn(
      "⚠ metadata columns missing — run supabase/migrations/0004 first;" +
        " syncing structure only."
    );
  }

  // Existing state
  const { data: existing, error: exErr } = await supabase
    .from("microthemes")
    .select("id, code, name, sort_order, topic_id");
  if (exErr) throw new Error(exErr.message);
  const byCode = new Map(existing.map((r) => [r.code, r]));

  const { data: topics, error: tErr } = await supabase
    .from("topics")
    .select("id, name, subject:subjects (name, paper:papers (name))");
  if (tErr) throw new Error(tErr.message);
  function topicIdFor(paperName, unitName) {
    const t = topics.find(
      (t) => t.name === unitName && t.subject?.paper?.name === paperName
    );
    return t?.id ?? null;
  }

  const { data: slugRows } = await supabase.from("microthemes").select("slug");
  const usedSlugs = new Set((slugRows ?? []).map((r) => r.slug));

  // Group v2 items by topic to compute sort_order within each topic.
  let updated = 0;
  let insertedCount = 0;

  const perTopicIndex = new Map();

  for (const m of doc.micro_themes) {
    const paperName = `${m.stage} — ${m.paper}`;
    const key = `${paperName}|${m.unit}`;
    const sort = (perTopicIndex.get(key) ?? 0) + 1;
    perTopicIndex.set(key, sort);

    const name = `${m.theme} — ${m.micro_theme}`;
    const meta = hasMeta
      ? {
          priority: m.priority,
          est_minutes: m.est_minutes,
          exam_overlap: m.exam_overlap,
        }
      : {};

    const current = byCode.get(m.id);
    if (current) {
      const patch = { name, sort_order: sort, ...meta };
      const { error } = await supabase
        .from("microthemes")
        .update(patch)
        .eq("code", m.id);
      if (error) throw new Error(`${m.id}: ${error.message}`);
      updated++;
    } else {
      const topicId = topicIdFor(paperName, m.unit);
      if (!topicId) {
        console.warn(`  skip ${m.id}: topic "${m.unit}" not found in ${paperName}`);
        continue;
      }
      let slug = slugify(name);
      let n = 2;
      while (usedSlugs.has(slug)) slug = `${slugify(name)}-${n++}`;
      usedSlugs.add(slug);
      const { error } = await supabase.from("microthemes").insert({
        topic_id: topicId,
        name,
        code: m.id,
        slug,
        sort_order: sort,
        status: "draft",
        ...meta,
      });
      if (error) throw new Error(`insert ${m.id}: ${error.message}`);
      insertedCount++;
      console.log(`  + ${m.id} ${name}`);
    }
  }

  console.log(
    `\nSync done: ${insertedCount} inserted, ${updated} updated, metadata=${hasMeta ? "yes" : "SKIPPED"}`
  );
}

main().catch((e) => {
  console.error("sync failed:", e.message);
  process.exit(1);
});
