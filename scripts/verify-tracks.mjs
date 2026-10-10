// Verify commission / exam-group segregation of PYQ content.
//
// Prints, for prelims and mains:
//   • total rows
//   • a breakdown by paper_label (so you can see the "(TGPSC)" variants)
//   • a count of TGPSC-marked labels
//   • if migration 0006 is applied: a breakdown by commission + exam_group
//
// Works BEFORE the migration too (it just skips the commission breakdown).
//
// Run locally:
//   node --env-file=.env.local scripts/verify-tracks.mjs
// Or via GitHub Actions: Actions -> "Verify commission/group tracks" -> Run.

import { createClient } from "@supabase/supabase-js";

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

// Does the commission column exist yet (migration 0006 applied)?
async function hasCommission(table) {
  const { error } = await supabase.from(table).select("commission").limit(1);
  return !error;
}

// Fetch every row's selected columns, paging past PostgREST's row cap.
async function fetchAll(table, columns) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function tally(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function report(table, stageLabel) {
  const withCommission = await hasCommission(table);
  const cols = withCommission
    ? "paper_label, commission, exam_group"
    : "paper_label";
  const rows = await fetchAll(table, cols);

  console.log(`\n================  ${stageLabel}  (${rows.length} rows)  ================`);

  console.log(`\n  By paper_label:`);
  for (const [label, n] of tally(rows, (r) => r.paper_label ?? "(none)")) {
    console.log(`    ${String(n).padStart(5)}  ${label}`);
  }

  const tgMarked = rows.filter((r) =>
    /\(tgpsc\)/i.test(r.paper_label ?? "")
  ).length;
  console.log(`\n  Labels still marked "(TGPSC)": ${tgMarked}`);

  if (withCommission) {
    console.log(`\n  By commission + exam_group (migration 0006 applied):`);
    for (const [k, n] of tally(
      rows,
      (r) => `${r.commission ?? "?"} / Group ${r.exam_group ?? "?"}`
    )) {
      console.log(`    ${String(n).padStart(5)}  ${k}`);
    }
  } else {
    console.log(
      `\n  commission/exam_group columns NOT present yet (migration 0006 not applied).`
    );
  }
}

console.log("Bhavishya · PYQ track verification");
await report("prelims_questions", "PRELIMS");
await report("mains_questions", "MAINS");
console.log("\nDone.");
