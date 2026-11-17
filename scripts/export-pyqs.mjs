// Export all PYQs + model answers from the live database to portable files,
// so they can be shared with others or imported into another platform.
//
// Produces, in ./export/ :
//   prelims.json  mains.json   — full fidelity (all fields, incl. rich model
//                                 answer JSON and plain-text model answers)
//   prelims.csv   mains.csv    — flat, Excel/Sheets-friendly
//   pyqs.json                  — both sets combined, with a small summary
//
// Run locally:   node --env-file=.env.local scripts/export-pyqs.mjs
// Or via GitHub Actions: Actions -> "Export PYQs" -> Run (downloads artifacts).

import { mkdirSync, writeFileSync } from "node:fs";
import dns from "node:dns";
import { createClient } from "@supabase/supabase-js";

// GitHub runners often fail IPv6 routes to Supabase ("fetch failed"); prefer IPv4.
dns.setDefaultResultOrder("ipv4first");

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch one page, retrying transient network failures ("fetch failed").
async function fetchPage(table, from, pageSize) {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*, microtheme:microthemes (code, name, slug)")
        .order("year", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      return data ?? [];
    } catch (e) {
      lastErr = e;
      // Surface the underlying network error code (ETIMEDOUT / ECONNRESET / ENOTFOUND…).
      const cause = e?.cause ? ` [cause: ${e.cause.code ?? e.cause.message ?? e.cause}]` : "";
      if (attempt < 6) {
        console.log(`  ${table} rows ${from}-${from + pageSize - 1}: ${e.message}${cause} — retry ${attempt}`);
        await sleep(attempt * 2000);
      } else {
        console.error(`  ${table} rows ${from}-${from + pageSize - 1}: giving up — ${e.message}${cause}`);
      }
    }
  }
  throw new Error(`${table}: ${lastErr?.message ?? "fetch failed"}`);
}

// mains rows carry large rich model-answer JSON, so page them in small chunks.
async function fetchAll(table, pageSize = 1000) {
  let from = 0;
  const rows = [];
  for (;;) {
    const page = await fetchPage(table, from, pageSize);
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

// Flatten a DB row into a clean, portable object.
function flatten(r, stage) {
  const base = {
    stage,
    commission: r.commission ?? "appsc",
    exam_group: r.exam_group ?? "1",
    year: r.year,
    paper_label: r.paper_label,
    microtheme_code: r.microtheme?.code ?? "",
    microtheme_name: r.microtheme?.name ?? "",
    question_text: r.question_text,
    keywords: Array.isArray(r.keywords) ? r.keywords.join("; ") : "",
    status: r.status,
  };
  if (stage === "prelims") {
    return {
      ...base,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      correct_option: r.correct_option,
      explanation: r.explanation ?? "",
    };
  }
  return {
    ...base,
    directive_word: r.directive_word ?? "",
    marks: r.marks ?? "",
    model_answer_text: r.model_answer_text ?? "",
  };
}

function toCsv(rows) {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(",")];
  for (const row of rows) lines.push(cols.map((c) => esc(row[c])).join(","));
  return lines.join("\n");
}

console.log("Exporting PYQs from the live database…");
// Sequential (not parallel) and small mains pages, to keep each response small.
const prelimsRaw = await fetchAll("prelims_questions", 300);
console.log(`  fetched prelims: ${prelimsRaw.length}`);
const mainsRaw = await fetchAll("mains_questions", 100);
console.log(`  fetched mains: ${mainsRaw.length}`);

const prelims = prelimsRaw.map((r) => flatten(r, "prelims"));
const mains = mainsRaw.map((r) => flatten(r, "mains"));

// Full-fidelity JSON keeps the rich model_answer document too.
const prelimsFull = prelimsRaw.map((r) => ({
  ...flatten(r, "prelims"),
  keywords_array: r.keywords ?? [],
}));
const mainsFull = mainsRaw.map((r) => ({
  ...flatten(r, "mains"),
  keywords_array: r.keywords ?? [],
  model_answer_richtext: r.model_answer ?? null,
}));

mkdirSync("export", { recursive: true });
writeFileSync("export/prelims.json", JSON.stringify(prelimsFull, null, 2));
writeFileSync("export/mains.json", JSON.stringify(mainsFull, null, 2));
writeFileSync("export/prelims.csv", toCsv(prelims));
writeFileSync("export/mains.csv", toCsv(mains));
writeFileSync(
  "export/pyqs.json",
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      summary: {
        prelims: prelims.length,
        mains: mains.length,
        mains_with_model_answer: mainsRaw.filter(
          (r) => (r.model_answer_text ?? "").trim().length > 0
        ).length,
      },
      prelims: prelimsFull,
      mains: mainsFull,
    },
    null,
    2
  )
);

const mainsWithAnswers = mainsRaw.filter(
  (r) => (r.model_answer_text ?? "").trim().length > 0
).length;
console.log(`\n  prelims: ${prelims.length}`);
console.log(`  mains:   ${mains.length}  (with model answers: ${mainsWithAnswers})`);
console.log("\nWrote: export/prelims.json, export/mains.json,");
console.log("       export/prelims.csv, export/mains.csv, export/pyqs.json");
