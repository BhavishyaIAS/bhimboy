// Import previous-year Mains questions into the PYQ module.
//
// Reads a data/pyq/*.json file (array of question objects) and upserts each
// into `mains_questions`, resolving the micro-theme by its `code`. Idempotent:
// re-running updates a question in place (matched on year + paper_label +
// question_no + part) instead of duplicating it.
//
// Each source item:
//   {
//     "year": 2020,
//     "paper_label": "Paper-II: History, Culture & Geography",
//     "no": 1, "part": "a",              // question number + OR-part (a/b)
//     "microtheme": "MN-PII-HCOI-002",   // micro-theme CODE to attach to
//     "marks": 10,
//     "directive_word": "critically explain",
//     "text": "Critically explain the salient features of urban planning ..."
//   }
//
// Usage:
//   node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/2020-mains.json
//   node --env-file=.env.local scripts/import-pyqs.mjs --file <path> --draft
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, isAbsolute } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const __dirname = dirname(fileURLToPath(import.meta.url));

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
const DRAFT = process.argv.includes("--draft");
const fileArg = argValue("--file");
if (!fileArg) {
  console.error("Missing --file <path to pyq json>");
  process.exit(1);
}
const DATA = isAbsolute(fileArg) ? fileArg : join(process.cwd(), fileArg);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const items = JSON.parse(readFileSync(DATA, "utf8"));
  if (!Array.isArray(items)) throw new Error("data file must be a JSON array");

  // Resolve every referenced micro-theme code -> id in one shot.
  const codes = [...new Set(items.map((it) => it.microtheme))];
  const { data: mts, error: mtErr } = await supabase
    .from("microthemes")
    .select("id, code")
    .in("code", codes);
  if (mtErr) throw new Error(`microtheme lookup: ${mtErr.message}`);
  const idByCode = new Map((mts ?? []).map((m) => [m.code, m.id]));

  const missing = codes.filter((c) => !idByCode.has(c));
  if (missing.length) {
    console.error("Unknown micro-theme codes:\n  " + missing.join("\n  "));
    process.exit(1);
  }

  const status = DRAFT ? "draft" : "published";
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const it of items) {
    const microtheme_id = idByCode.get(it.microtheme);
    const keywords = Array.isArray(it.keywords) ? it.keywords : [];
    // Stable natural key so re-runs update rather than duplicate.
    const naturalKey = `${it.year}|${it.paper_label}|Q${it.no}${it.part ?? ""}`;

    const row = {
      microtheme_id,
      year: it.year,
      paper_label: it.paper_label,
      question_text: it.text.trim(),
      directive_word: it.directive_word ?? null,
      marks: it.marks ?? null,
      model_answer_text: it.model_answer_text ?? "",
      keywords,
      status,
    };

    // Find an existing row with this natural key (same micro-theme + text head).
    const { data: existing } = await supabase
      .from("mains_questions")
      .select("id")
      .eq("year", it.year)
      .eq("paper_label", it.paper_label)
      .eq("microtheme_id", microtheme_id)
      .eq("question_text", row.question_text)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("mains_questions")
        .update(row)
        .eq("id", existing.id);
      if (error) {
        failed++;
        console.error(`✗ ${naturalKey}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from("mains_questions").insert(row);
      if (error) {
        failed++;
        console.error(`✗ ${naturalKey}: ${error.message}`);
      } else {
        inserted++;
        console.log(`✓ ${naturalKey} → ${it.microtheme}`);
      }
    }
  }

  console.log(
    `\n${inserted} inserted, ${updated} updated, ${failed} failed (status: ${status}).`
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
