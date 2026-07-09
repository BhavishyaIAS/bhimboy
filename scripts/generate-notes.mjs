// Generates exam-ready notes for micro-themes using Claude, and writes them
// into the platform (as drafts by default, for admin review).
//
// For each micro-theme it sends Claude the full syllabus context (paper →
// subject → topic → theme), the coverage metadata, and any existing PYQs as
// anchoring, and asks for a structured note (sections, tables, Mermaid
// diagrams, glossary, prelims pointers, mains angles) against a strict JSON
// schema. The shared note-builder converts that into the platform's TipTap
// format, so generated notes render identically to hand-authored ones.
//
// Usage:
//   node --env-file=.env.local scripts/generate-notes.mjs [options]
//     --codes MN-PIII-PC-001,MN-PIII-PC-002   only these codes
//     --paper "Mains — Paper-III"             paper name prefix filter
//     --priority 1                            only this priority tier
//     --limit 25                              stop after N notes (default 10)
//     --publish                               publish instead of draft
//     --overwrite                             regenerate even if a note exists
//
// Requires ANTHROPIC_API_KEY in the environment (plus the Supabase vars).
// Skips micro-themes that already have notes unless --overwrite.

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { uploadNote } from "./lib/note-upload.mjs";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const anthropic = new Anthropic();

// ---- CLI args ----
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const CODES = getArg("codes")?.split(",").map((s) => s.trim());
const PAPER = getArg("paper");
const PRIORITY = getArg("priority") ? Number(getArg("priority")) : undefined;
const LIMIT = getArg("limit") ? Number(getArg("limit")) : 10;
const PUBLISH = args.includes("--publish");
const OVERWRITE = args.includes("--overwrite");

// ---- Strict output schema for the note spec ----
const BLOCK_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: {
        type: { const: "para" },
        text: { type: "string" },
      },
      required: ["type", "text"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { enum: ["bullets", "numbered"] },
        items: { type: "array", items: { type: "string" } },
      },
      required: ["type", "items"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "table" },
        headers: { type: "array", items: { type: "string" } },
        rows: {
          type: "array",
          items: { type: "array", items: { type: "string" } },
        },
      },
      required: ["type", "headers", "rows"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "mermaid" },
        code: { type: "string" },
      },
      required: ["type", "code"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        type: { const: "quote" },
        text: { type: "string" },
      },
      required: ["type", "text"],
      additionalProperties: false,
    },
  ],
};

const NOTE_SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          level: { type: "integer", enum: [2, 3] },
          blocks: { type: "array", items: BLOCK_SCHEMA },
        },
        required: ["heading", "level", "blocks"],
        additionalProperties: false,
      },
    },
    prelimsPointers: { type: "array", items: { type: "string" } },
    mainsAngles: { type: "array", items: { type: "string" } },
    glossary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          definition: { type: "string" },
        },
        required: ["term", "definition"],
        additionalProperties: false,
      },
    },
  },
  required: ["sections", "prelimsPointers", "mainsAngles", "glossary"],
  additionalProperties: false,
};

const SYSTEM = `You are a senior APPSC Group-I faculty member and topper-mentor writing the definitive self-sufficient study notes for one micro-theme at a time. Your notes are what a serious aspirant revises from in the final month — they must be exhaustive in coverage yet ruthlessly concise in expression, and directly reproducible in the examination hall.

Standards:
- Ground every fact in the standard sources: NCERT, Laxmikanth (Polity), Spectrum & Bipan Chandra (Modern India), Ramesh Singh (Economy), Shankar IAS (Environment), Telugu Akademi material for Andhra Pradesh specifics, official government reports (Economic Survey, India Year Book, AP Socio-Economic Survey), and landmark committee reports.
- Andhra Pradesh angle ALWAYS: wherever the theme touches AP, add the AP-specific facts (acts, schemes, data, places, persons). APPSC rewards AP specificity.
- Structure for the exam: definitions → constitutional/legal basis (article/act/section numbers) → features/analysis → criticism/challenges → reforms/way forward → AP dimension.
- Use tables for anything comparative or enumerable (articles, committees, dates, schemes).
- Use ONE Mermaid flowchart where a process/hierarchy/classification genuinely benefits from a schematic (syntax: flowchart TD, simple [] nodes and --> arrows; no styling, no subgraphs).
- Use **bold** for every keyword, article number, case name, year and term an examiner scans for.
- prelimsPointers: 4-7 one-line factual nuggets that MCQs are made from (dates, firsts, smallest/largest, articles, committee-chair pairs).
- mainsAngles: 3-5 directive-style angles ("Critically examine…", "Discuss…") with a one-clause hint of the expected line of argument.
- glossary: 4-6 crisp term-definition pairs a student must be able to write verbatim.
- Length: the whole note must be coverable in one sitting of the stated minutes — typically 600-900 words of body text. Never pad; never omit an examinable fact.
- Current-affairs hooks: include standing, durable current links (schemes, recent acts, SC judgments) but avoid ephemeral news that will date quickly.`;

function userPrompt(mt, pyqs) {
  const pyqText = pyqs.length
    ? `\n\nActual past questions tagged to this micro-theme (anchor your coverage so a student who studies this note can answer these):\n${pyqs
        .map((q) => `- [${q.kind} ${q.year}] ${q.question_text}`)
        .join("\n")}`
    : "";
  return `Write the complete exam-ready note for this micro-theme.

Paper: ${mt.paper_name}
Subject: ${mt.subject_name}
Topic: ${mt.topic_name}
Micro-theme: ${mt.name}
Code: ${mt.code}
Priority: ${mt.priority === 1 ? "CORE (highest PYQ yield)" : mt.priority === 2 ? "Important" : "Supporting"}
One-sitting budget: ${mt.est_minutes ?? 60} minutes
Serves: ${mt.exam_overlap ? "BOTH Prelims and Mains — cover factual recall AND analytical depth" : "primarily this paper's stage"}${pyqText}`;
}

async function fetchTargets() {
  const { data, error } = await supabase
    .from("microthemes")
    .select(
      `id, code, name, priority, est_minutes, exam_overlap, sort_order,
       topic:topics (name, subject:subjects (name, paper:papers (name))),
       notes (id)`
    )
    .order("code");
  if (error) throw new Error(error.message);

  let targets = data.map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    priority: m.priority,
    est_minutes: m.est_minutes,
    exam_overlap: m.exam_overlap,
    topic_name: m.topic?.name,
    subject_name: m.topic?.subject?.name,
    paper_name: m.topic?.subject?.paper?.name,
    hasNote: (m.notes ?? []).length > 0,
  }));

  if (CODES) targets = targets.filter((m) => CODES.includes(m.code));
  if (PAPER) targets = targets.filter((m) => m.paper_name?.startsWith(PAPER));
  if (PRIORITY) targets = targets.filter((m) => m.priority === PRIORITY);
  if (!OVERWRITE) targets = targets.filter((m) => !m.hasNote);
  // Core first, then syllabus order
  targets.sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2) || a.code.localeCompare(b.code));
  return targets.slice(0, LIMIT);
}

async function fetchPyqs(microthemeId) {
  const [pre, mn] = await Promise.all([
    supabase
      .from("prelims_questions")
      .select("year, question_text")
      .eq("microtheme_id", microthemeId)
      .limit(3),
    supabase
      .from("mains_questions")
      .select("year, question_text")
      .eq("microtheme_id", microthemeId)
      .limit(3),
  ]);
  return [
    ...(pre.data ?? []).map((q) => ({ ...q, kind: "Prelims" })),
    ...(mn.data ?? []).map((q) => ({ ...q, kind: "Mains" })),
  ];
}

async function generateOne(mt) {
  const pyqs = await fetchPyqs(mt.id);
  const stream = anthropic.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: NOTE_SCHEMA },
    },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt(mt, pyqs) }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("model declined this request");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("output truncated (max_tokens) — retry");
  }
  const textBlock = message.content.find((b) => b.type === "text");
  const spec = JSON.parse(textBlock.text);
  spec.code = mt.code;
  return { spec, usage: message.usage };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (get one at console.anthropic.com)."
    );
    process.exit(1);
  }

  const targets = await fetchTargets();
  console.log(`Generating notes for ${targets.length} micro-theme(s)${PUBLISH ? " (publishing)" : " (as drafts)"}\n`);

  let done = 0;
  let failed = 0;
  let inputTok = 0;
  let outputTok = 0;

  for (const mt of targets) {
    const label = `[${mt.code}] ${mt.name}`;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { spec, usage } = await generateOne(mt);
        await uploadNote(supabase, spec, { publish: PUBLISH });
        inputTok += usage.input_tokens + (usage.cache_read_input_tokens ?? 0);
        outputTok += usage.output_tokens;
        done++;
        console.log(`✓ ${label} (${usage.output_tokens} out tok)`);
        break;
      } catch (e) {
        if (attempt === 2) {
          failed++;
          console.error(`✗ ${label}: ${e.message}`);
        } else {
          console.warn(`  retrying ${mt.code}: ${e.message}`);
        }
      }
    }
  }

  const cost = (inputTok / 1e6) * 5 + (outputTok / 1e6) * 25;
  console.log(
    `\nDone: ${done} generated, ${failed} failed · ~$${cost.toFixed(2)} (Opus 4.8, cache reads billed lower)`
  );
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
