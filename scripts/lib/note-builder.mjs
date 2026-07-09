// Converts a structured "note spec" into the platform's TipTap JSON document
// plus the plain text used for full-text search. Shared by the hand-authored
// seed batches and the Claude generation pipeline, so every note in the
// platform has identical, render-safe structure.
//
// Note spec shape:
// {
//   code: "MN-PIII-PC-001",
//   sections: [
//     { heading, level?, blocks: [
//       { type: "para", text },                        // **bold** supported
//       { type: "bullets", items: [text] },
//       { type: "numbered", items: [text] },
//       { type: "table", headers: [..], rows: [[..]] },
//       { type: "mermaid", code },
//       { type: "quote", text },                       // exam-tip callout
//     ]}
//   ],
//   prelimsPointers: [text],   // optional — rendered as a closing section
//   mainsAngles: [text],       // optional — rendered as a closing section
//   glossary: [{ term, definition }],
// }

function inline(text) {
  // Parse **bold** spans into TipTap text nodes with marks.
  const nodes = [];
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) nodes.push({ type: "text", text: m[1], marks: [{ type: "bold" }] });
    else nodes.push({ type: "text", text: part });
  }
  return nodes.length ? nodes : [{ type: "text", text: " " }];
}

function para(text) {
  return { type: "paragraph", content: inline(text) };
}

function list(type, items) {
  return {
    type: type === "numbered" ? "orderedList" : "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [para(item)],
    })),
  };
}

function table(headers, rows) {
  const headerRow = {
    type: "tableRow",
    content: headers.map((h) => ({
      type: "tableHeader",
      content: [para(h)],
    })),
  };
  const bodyRows = rows.map((cells) => ({
    type: "tableRow",
    content: cells.map((c) => ({
      type: "tableCell",
      content: [para(String(c))],
    })),
  }));
  return { type: "table", content: [headerRow, ...bodyRows] };
}

function block(b) {
  switch (b.type) {
    case "para":
      return [para(b.text)];
    case "bullets":
      return [list("bullets", b.items)];
    case "numbered":
      return [list("numbered", b.items)];
    case "table":
      return [table(b.headers, b.rows)];
    case "mermaid":
      return [{ type: "mermaid", attrs: { code: b.code } }];
    case "quote":
      return [{ type: "blockquote", content: [para(b.text)] }];
    default:
      throw new Error(`Unknown block type: ${b.type}`);
  }
}

export function buildNoteDoc(spec) {
  const content = [];
  for (const section of spec.sections) {
    content.push({
      type: "heading",
      attrs: { level: section.level ?? 2 },
      content: inline(section.heading),
    });
    for (const b of section.blocks) content.push(...block(b));
  }
  if (spec.prelimsPointers?.length) {
    content.push({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "🎯 Prelims pointers" }],
    });
    content.push(list("bullets", spec.prelimsPointers));
  }
  if (spec.mainsAngles?.length) {
    content.push({
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "✍️ Mains angles" }],
    });
    content.push(list("bullets", spec.mainsAngles));
  }
  return { type: "doc", content };
}

// Plain-text extraction matching src/lib/tiptap-text.ts closely enough
// for the search vector.
export function extractText(node, parts = []) {
  if (node.text) parts.push(node.text);
  if (Array.isArray(node.content)) {
    for (const child of node.content) extractText(child, parts);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
