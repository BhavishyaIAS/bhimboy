// Export PYQs + model answers from the live database to portable files,
// so they can be shared with others or imported into another platform.
//
// Produces, in ./export/ :
//   pyqs.xlsx     — one Excel workbook: "Prelims" sheet + "Mains" sheet
//   prelims.json  mains.json — full fidelity (incl. rich + plain model answers)
//   pyqs.json     — both sets combined, with a summary + the filters used
//
// Optional filters (env vars; the GitHub workflow exposes them as inputs):
//   EXPORT_COMMISSION   all | appsc | tgpsc            (default all)
//   EXPORT_GROUP        all | 1 | 2                    (default all)
//   EXPORT_STAGE        both | prelims | mains         (default both)
//   EXPORT_ONLY_ANSWERED  true | false — mains with a model answer only
//
// Run locally:   node --env-file=.env.local scripts/export-pyqs.mjs
// Or via GitHub Actions: Actions -> "Export PYQs" -> Run workflow.

import { mkdirSync, writeFileSync } from "node:fs";
import dns from "node:dns";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// GitHub runners often fail IPv6 routes to Supabase ("fetch failed"); prefer IPv4.
dns.setDefaultResultOrder("ipv4first");

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

// ---------------- filters ----------------
const pick = (v, allowed, dflt) => {
  const s = String(v ?? "").trim().toLowerCase();
  return allowed.includes(s) ? s : dflt;
};
const FILTER = {
  commission: pick(process.env.EXPORT_COMMISSION, ["all", "appsc", "tgpsc"], "all"),
  group: pick(process.env.EXPORT_GROUP, ["all", "1", "2"], "all"),
  stage: pick(process.env.EXPORT_STAGE, ["both", "prelims", "mains"], "both"),
  onlyAnswered: pick(process.env.EXPORT_ONLY_ANSWERED, ["true", "false"], "false") === "true",
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fetch one page, retrying transient network failures.
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
      if (attempt < 6) {
        console.log(`  ${table} rows ${from}-${from + pageSize - 1}: ${String(e.message).slice(0, 120)} — retry ${attempt}`);
        await sleep(attempt * 2000);
      }
    }
  }
  throw new Error(`${table}: ${String(lastErr?.message ?? "fetch failed").slice(0, 300)}`);
}

// mains rows carry large rich model-answer JSON, so page them in small chunks.
async function fetchAll(table, pageSize) {
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

// Commission works before AND after migration 0006: use the column when it
// exists, otherwise fall back to the legacy "(TGPSC)" label marker.
function commissionOf(r) {
  if (r.commission) return r.commission;
  return /\(TGPSC\)/i.test(r.paper_label ?? "") ? "tgpsc" : "appsc";
}
const cleanLabel = (l) => String(l ?? "").replace(/\s*\(TGPSC\)/gi, "").trim();
const hasAnswer = (r) => (r.model_answer_text ?? "").trim().length > 0;

function keep(r, stage) {
  if (FILTER.commission !== "all" && commissionOf(r) !== FILTER.commission) return false;
  if (FILTER.group !== "all" && String(r.exam_group ?? "1") !== FILTER.group) return false;
  if (stage === "mains" && FILTER.onlyAnswered && !hasAnswer(r)) return false;
  return true;
}

// Flatten a DB row into a clean, portable object (column order = sheet order).
function flatten(r, stage) {
  const base = {
    commission: commissionOf(r).toUpperCase(),
    group: `Group ${r.exam_group ?? "1"}`,
    year: r.year,
    paper: cleanLabel(r.paper_label),
    microtheme_code: r.microtheme?.code ?? "",
    microtheme: r.microtheme?.name ?? "",
    question: r.question_text,
  };
  const tail = {
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
      ...tail,
    };
  }
  return {
    ...base,
    directive_word: r.directive_word ?? "",
    marks: r.marks ?? "",
    model_answer: r.model_answer_text ?? "",
    ...tail,
  };
}

// Excel caps a cell at 32,767 characters — trim the rare oversized answer.
const EXCEL_CELL_MAX = 32000;
function excelSafe(rows) {
  let trimmed = 0;
  const out = rows.map((row) => {
    const copy = { ...row };
    for (const [k, v] of Object.entries(copy)) {
      if (typeof v === "string" && v.length > EXCEL_CELL_MAX) {
        copy[k] = v.slice(0, EXCEL_CELL_MAX) + " …[truncated — full text in mains.json]";
        trimmed++;
      }
    }
    return copy;
  });
  return { out, trimmed };
}

function sheet(rows, widths) {
  const ws = XLSX.utils.json_to_sheet(rows);
  if (rows.length) {
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: widths[k] ?? 14 }));
    ws["!autofilter"] = { ref: ws["!ref"] };
  }
  return ws;
}

// ---------------- run ----------------
console.log("Exporting PYQs from the live database…");
console.log(
  `  filters: commission=${FILTER.commission}, group=${FILTER.group}, stage=${FILTER.stage}, only-answered-mains=${FILTER.onlyAnswered}`
);

const wantPrelims = FILTER.stage !== "mains";
const wantMains = FILTER.stage !== "prelims";

const prelimsRaw = wantPrelims
  ? (await fetchAll("prelims_questions", 300)).filter((r) => keep(r, "prelims"))
  : [];
if (wantPrelims) console.log(`  prelims kept: ${prelimsRaw.length}`);
const mainsRaw = wantMains
  ? (await fetchAll("mains_questions", 100)).filter((r) => keep(r, "mains"))
  : [];
if (wantMains) console.log(`  mains kept:   ${mainsRaw.length}`);

const prelims = prelimsRaw.map((r) => flatten(r, "prelims"));
const mains = mainsRaw.map((r) => flatten(r, "mains"));

mkdirSync("export", { recursive: true });

// --- Excel workbook ---
const wb = XLSX.utils.book_new();
const common = { commission: 8, group: 9, year: 6, paper: 34, microtheme_code: 16, microtheme: 30, question: 70, keywords: 24, status: 10 };
let truncated = 0;
if (wantPrelims) {
  XLSX.utils.book_append_sheet(
    wb,
    sheet(prelims, { ...common, option_a: 28, option_b: 28, option_c: 28, option_d: 28, correct_option: 8, explanation: 50 }),
    "Prelims"
  );
}
if (wantMains) {
  const { out, trimmed } = excelSafe(mains);
  truncated = trimmed;
  XLSX.utils.book_append_sheet(
    wb,
    sheet(out, { ...common, directive_word: 14, marks: 7, model_answer: 100 }),
    "Mains"
  );
}
const readme = [
  { field: "Exported at", value: new Date().toISOString() },
  { field: "Commission filter", value: FILTER.commission },
  { field: "Group filter", value: FILTER.group },
  { field: "Stage filter", value: FILTER.stage },
  { field: "Only mains with model answers", value: String(FILTER.onlyAnswered) },
  { field: "Prelims rows", value: wantPrelims ? prelims.length : "—" },
  { field: "Mains rows", value: wantMains ? mains.length : "—" },
  {
    field: "Mains with a model answer",
    value: wantMains ? mainsRaw.filter(hasAnswer).length : "—",
  },
  { field: "Cells trimmed for Excel's 32,767-char limit", value: truncated },
];
XLSX.utils.book_append_sheet(wb, sheet(readme, { field: 40, value: 40 }), "About");
writeFileSync("export/pyqs.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

// --- JSON (full fidelity, incl. rich model answer) ---
const prelimsFull = prelimsRaw.map((r) => ({ ...flatten(r, "prelims"), keywords_array: r.keywords ?? [] }));
const mainsFull = mainsRaw.map((r) => ({
  ...flatten(r, "mains"),
  keywords_array: r.keywords ?? [],
  model_answer_richtext: r.model_answer ?? null,
}));
if (wantPrelims) writeFileSync("export/prelims.json", JSON.stringify(prelimsFull, null, 2));
if (wantMains) writeFileSync("export/mains.json", JSON.stringify(mainsFull, null, 2));
writeFileSync(
  "export/pyqs.json",
  JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      filters: FILTER,
      summary: {
        prelims: prelims.length,
        mains: mains.length,
        mains_with_model_answer: mainsRaw.filter(hasAnswer).length,
      },
      prelims: prelimsFull,
      mains: mainsFull,
    },
    null,
    2
  )
);

console.log(`\nWrote export/pyqs.xlsx (${wantPrelims ? "Prelims" : ""}${wantPrelims && wantMains ? " + " : ""}${wantMains ? "Mains" : ""} + About sheets)`);
console.log(`      export/${[wantPrelims && "prelims.json", wantMains && "mains.json", "pyqs.json"].filter(Boolean).join(", export/")}`);
if (truncated) console.log(`  note: ${truncated} cell(s) trimmed to fit Excel; full text is in the JSON.`);
