// Slug and micro-theme code generation.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

// Short uppercase code chunk from a name: first letters of up to `maxWords`
// significant words, e.g. "Constitutional Framework" -> "CF",
// "Polity" -> "POL" (single word: first 3 letters).
const STOP_WORDS = new Set(["of", "the", "and", "in", "to", "for", "a", "an", "&"]);

export function codeChunk(name: string, singleWordLen = 3, maxWords = 3): string {
  const words = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return "XX";
  if (words.length === 1) {
    return words[0].slice(0, singleWordLen).toUpperCase();
  }
  return words
    .slice(0, maxWords)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// e.g. subject "Polity", topic "Constitutional Framework", seq 73
// -> POL-CF-073
export function buildMicrothemeCode(
  subjectName: string,
  topicName: string,
  seq: number
): string {
  return `${codeChunk(subjectName)}-${codeChunk(topicName)}-${String(seq).padStart(3, "0")}`;
}
