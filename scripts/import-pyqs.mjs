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
//     "microtheme": "MN-PII-HCOI-002",   // primary micro-theme CODE
//     // ...or, when a question genuinely straddles two themes:
//     "microthemes": ["MN-PIII-PAG-014", "MN-PIII-PAG-015"],
//       // first = primary (microtheme_id); the rest are stored as secondary
//       // placements in `keywords` so the question also surfaces on those
//       // micro-theme pages, without duplicating it in the PYQ vault.
//     "marks": 10,
//     "directive_word": "critically explain",
//     "text": "Critically explain the salient features of urban planning ..."
//   }
//
// Prelims (--type prelims) reads the same shape plus `answer` (and optional
// `explanation`). APPSC releases prelims papers as FINAL KEY documents that
// print only the correct answer under each question — the distractor options
// are not published, and we never invent them. Such rows store the official
// answer in option_a with option_b/c/d empty; the UI renders them as a
// think-then-reveal card instead of a four-option MCQ.
//
// Usage:
//   node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/2020-mains.json
//   node --env-file=.env.local scripts/import-pyqs.mjs --file data/pyq/2022-prelims.json --type prelims
//   node --env-file=.env.local scripts/import-pyqs.mjs --file <path> --draft
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.

import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
const DRAFT = process.argv.includes("--draft");
const TYPE = argValue("--type") ?? "mains";
if (!["mains", "prelims"].includes(TYPE)) {
  console.error(`Unknown --type "${TYPE}" (expected mains or prelims)`);
  process.exit(1);
}
const TABLE = TYPE === "prelims" ? "prelims_questions" : "mains_questions";
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

  // Each item may carry a single `microtheme` or a `microthemes` array
  // (first = primary, rest = secondary). Normalise to an array.
  const codesFor = (it) =>
    Array.isArray(it.microthemes) && it.microthemes.length
      ? it.microthemes
      : [it.microtheme];

  // Resolve every referenced micro-theme code -> id in one shot.
  const codes = [...new Set(items.flatMap(codesFor))];
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
    const [primaryCode, ...secondaryCodes] = codesFor(it);
    const microtheme_id = idByCode.get(primaryCode);
    // Secondary micro-theme codes are stored in `keywords` so the question
    // also appears on those micro-theme pages (queried via keyword-contains),
    // while staying a single row in the vault.
    const extraKeywords = Array.isArray(it.keywords) ? it.keywords : [];
    const keywords = [...new Set([...secondaryCodes, ...extraKeywords])];
    // Stable natural key so re-runs update rather than duplicate.
    const naturalKey = `${it.year}|${it.paper_label}|Q${it.no}${it.part ?? ""}`;

    if (TYPE === "prelims" && !(it.answer ?? "").trim() && !it.option_a) {
      failed++;
      console.error(`✗ ${naturalKey}: prelims item missing \`answer\``);
      continue;
    }

    // Two prelims source shapes:
    //  - Full MCQ (question paper): option_a..d + correct_option (A/B/C/D).
    //  - Key-only (final-key paper): only `answer` (the correct option text);
    //    stored in option_a with b/c/d empty so the card renders a reveal.
    const fullMcq = it.option_a != null && it.option_b != null;
    const prelimsRow = fullMcq
      ? {
          microtheme_id,
          year: it.year,
          paper_label: it.paper_label,
          question_text: it.text.trim(),
          option_a: (it.option_a ?? "").trim(),
          option_b: (it.option_b ?? "").trim(),
          option_c: (it.option_c ?? "").trim(),
          option_d: (it.option_d ?? "").trim(),
          correct_option: it.correct_option ?? "A",
          explanation: it.explanation ?? null,
          keywords,
          status,
        }
      : {
          microtheme_id,
          year: it.year,
          paper_label: it.paper_label,
          question_text: it.text.trim(),
          option_a: (it.answer ?? "").trim(),
          option_b: it.option_b ?? "",
          option_c: it.option_c ?? "",
          option_d: it.option_d ?? "",
          correct_option: it.correct_option ?? "A",
          explanation: it.explanation ?? null,
          keywords,
          status,
        };

    const row =
      TYPE === "prelims"
        ? prelimsRow
        : {
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
      .from(TABLE)
      .select("id")
      .eq("year", it.year)
      .eq("paper_label", it.paper_label)
      .eq("microtheme_id", microtheme_id)
      .eq("question_text", row.question_text)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from(TABLE)
        .update(row)
        .eq("id", existing.id);
      if (error) {
        failed++;
        console.error(`✗ ${naturalKey}: ${error.message}`);
      } else {
        updated++;
      }
    } else {
      const { error } = await supabase.from(TABLE).insert(row);
      if (error) {
        failed++;
        console.error(`✗ ${naturalKey}: ${error.message}`);
      } else {
        inserted++;
        const shown =
          secondaryCodes.length > 0
            ? `${primaryCode} (+${secondaryCodes.join(", ")})`
            : primaryCode;
        console.log(`✓ ${naturalKey} → ${shown}`);
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
