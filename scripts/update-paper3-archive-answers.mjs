// Attach authored model answers to the archived Paper-III PYQs
// (data/pyq/paper3-archive.json — Paper-III PYQs from years whose full mains
// papers are not ingested: 2008/2011/2012/2016/2017/2024 APPSC + TGPSC 2016/2024).
//
// Reads:
//   data/pyq/paper3-archive.json                  — question source (no, year, paper_label, text)
//   data/pyq/answers/paper3-archive-answers.json  — { "Q7": "<markdown answer>", ... }
//
// Keys use the archive's stable `no` (the compilation's numbering), which
// is unique across the whole file. Answers are converted from the same
// Markdown subset used by update-model-answers.mjs into a TipTap doc
// (`model_answer`) plus a plain-text mirror (`model_answer_text`).
// Idempotent: rows are matched on (year, paper_label, question_text) and
// overwritten in place; keys missing from the answers map are skipped so
// the file can be filled in incrementally.
//
// Usage:
//   node --env-file=.env.local scripts/update-paper3-archive-answers.mjs

import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { createClient } from "@supabase/supabase-js";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
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

// ---- Markdown subset -> TipTap (same subset as update-model-answers.mjs) ----

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
  let list = null;

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
  const questions = JSON.parse(readFileSync(rel("data/pyq/paper3-archive.json"), "utf8"));
  const answers = JSON.parse(
    readFileSync(rel("data/pyq/answers/paper3-archive-answers.json"), "utf8")
  );

  const status = DRAFT ? "draft" : "published";
  let updated = 0;
  let missing = 0;
  let notFound = 0;
  let failed = 0;

  for (const q of questions) {
    const qkey = `Q${q.no}`;
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
      .eq("year", q.year)
      .eq("paper_label", q.paper_label)
      .eq("question_text", q.text.trim());
    if (selErr) {
      failed++;
      console.error(`✗ ${qkey}: ${selErr.message}`);
      continue;
    }
    if (!rows || rows.length === 0) {
      notFound++;
      console.error(`? ${qkey}: no matching row (${q.year}, ${q.paper_label})`);
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
    `\n${updated} answered, ${missing} still blank, ${notFound} not-found, ${failed} failed.`
  );
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
