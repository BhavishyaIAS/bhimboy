// Extract plain text from a TipTap JSON document, used to feed the
// Postgres full-text search vector and for validation.

interface TipTapNode {
  type?: string;
  text?: string;
  content?: TipTapNode[];
  attrs?: Record<string, unknown>;
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "tableCell",
  "tableHeader",
  "blockquote",
  "codeBlock",
]);

function walk(node: TipTapNode, parts: string[]) {
  if (node.text) parts.push(node.text);
  // Image captions/alt text are searchable too.
  if (node.type === "image" && typeof node.attrs?.alt === "string" && node.attrs.alt) {
    parts.push(node.attrs.alt as string);
  }
  if (node.type === "figcaption" || node.type === "caption") {
    // handled via children below
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) walk(child, parts);
  }
  if (node.type && BLOCK_TYPES.has(node.type)) parts.push("\n");
}

export function extractText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const parts: string[] = [];
  walk(doc as TipTapNode, parts);
  return parts
    .join(" ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Wrap plain text (e.g. from a bulk-upload model answer) in a minimal
// TipTap document, one paragraph per line.
export function plainTextToTipTap(text: string): unknown {
  const paragraphs = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));
  return {
    type: "doc",
    content: paragraphs.length
      ? paragraphs
      : [{ type: "paragraph" }],
  };
}

export const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
