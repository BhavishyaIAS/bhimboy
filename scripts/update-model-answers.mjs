// Attach authored model answers to existing Mains PYQ rows.
//
// For a given year it reads:
//   data/pyq/<year>-mains.json            — question source (no, part, text, paper_label)
//   data/pyq/answers/<year>-mains-answers.json — { "P2-Q1a": "<markdown answer>", ... }
//
// Answer keys are paper-qualified ("P1".."P5" + "-Q" + no + part) because
// question numbers repeat across the five papers.
//
// Each answer is written as a rich TipTap document into `model_answer`
// (rendered on the micro-theme + PYQ vault cards) and mirrored as plain
// text into `model_answer_text` (fed to the search vector). Idempotent:
// re-running overwrites the same rows, matched on
// (year, paper_label, question_text). Answers missing from the map are
// skipped, so the file can be filled in incrementally.
//
// Usage:
//   node --env-file=.env.local scripts/update-model-answers.mjs --year 2020
//
// A lightweight Markdown subset is supported in the answer text:
//   ## Heading / ### Heading      -> heading (level 2 / 3)
//   - item  (or * item)           -> bullet list
//   1. item                       -> ordered list
//   blank-line separated blocks   -> paragraphs
//   **bold**  and  *italic*       -> inline marks

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
const year = argValue("--year");
if (!year) {
  console.error("Missing --year <YYYY>");
  process.exit(1);
}
const DRAFT = process.argv.includes("--draft");
const rel = (p) => (isAbsolute(p) ? p : join(process.cwd(), p));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---- Markdown subset -> TipTap ----

// Inline: **bold**, *italic* -> TipTap text nodes with marks.
function inline(text) {
  const nodes = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push({ type: "text", text: text.slice(last, m.index) });
    if (m[2] !== undefined) {
      nodes.push({ type: "text", text: m[2], marks: [{ type: "bold" }] });
    } else {
      nodes.push({ type: "text", text: m[3], marks: [{ type: "italic" }] });
    }
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push({ type: "text", text: text.slice(last) });
  return nodes.length ? nodes : [{ type: "text", text }];
}

function mdToTipTap(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const content = [];
  let para = [];
  let list = null; // { type: 'bulletList'|'orderedList', items: [] }

  const flushPara = () => {
    if (para.length) {
      content.push({ type: "paragraph", content: inline(para.join(" ")) });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      content.push({ type: list.type, content: list.items });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      content.push({
        type: "heading",
        attrs: { level: h[1].length },
        content: inline(h[2]),
      });
      continue;
    }
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || ordered) {
      flushPara();
      const type = bullet ? "bulletList" : "orderedList";
      if (!list || list.type !== type) {
        flushList();
        list = { type, items: [] };
      }
      list.items.push({
        type: "listItem",
        content: [{ type: "paragraph", content: inline((bullet || ordered)[1]) }],
      });
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

function plainText(md) {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^#{2,4}\s+/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

async function main() {
  const questions = JSON.parse(
    readFileSync(rel(`data/pyq/${year}-mains.json`), "utf8")
  );
  const answers = JSON.parse(
    readFileSync(rel(`data/pyq/answers/${year}-mains-answers.json`), "utf8")
  );

  const status = DRAFT ? "draft" : "published";
  let updated = 0;
  let missing = 0;
  let notFound = 0;
  let failed = 0;

  // "Paper-II: History, ..." -> "P2"
  const paperTag = (label) => {
    const roman = { III: 3, II: 2, IV: 4, VI: 6, V: 5, I: 1 };
    // Longest Roman numerals first so "IV"/"III" aren't shadowed by "I".
    const m = /Paper-(III|II|IV|VI|V|I)\b/.exec(label);
    return m ? `P${roman[m[1]]}` : label;
  };

  for (const q of questions) {
    const qkey = `${paperTag(q.paper_label)}-Q${q.no}${q.part ?? ""}`;
    const md = answers[qkey];
    if (!md || !md.trim()) {
      missing++;
      continue;
    }
    const model_answer = mdToTipTap(md);
    const model_answer_text = plainText(md);

    const { data: rows, error: selErr } = await supabase
      .from("mains_questions")
      .select("id")
      .eq("year", Number(year))
      .eq("paper_label", q.paper_label)
      .eq("question_text", q.text.trim());
    if (selErr) {
      failed++;
      console.error(`✗ ${qkey}: ${selErr.message}`);
      continue;
    }
    if (!rows || rows.length === 0) {
      notFound++;
      console.error(`? ${qkey}: no matching row for ${q.paper_label}`);
      continue;
    }
    for (const r of rows) {
      const { error } = await supabase
        .from("mains_questions")
        .update({ model_answer, model_answer_text, status })
        .eq("id", r.id);
      if (error) {
        failed++;
        console.error(`✗ ${qkey}: ${error.message}`);
      } else {
        updated++;
      }
    }
  }

  console.log(
    `\n${updated} answered, ${missing} still blank, ${notFound} not-found, ${failed} failed (year ${year}).`
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
