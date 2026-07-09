// Uploads hand-authored note spec files from data/notes/ into the platform.
// Each file is a JSON array of note specs (see scripts/lib/note-builder.mjs
// for the spec shape); specs are keyed to micro-themes by code.
//
// Usage:
//   node --env-file=.env.local scripts/upload-notes.mjs [options]
//     --file mn-piii-polity            only files whose name contains this
//     --codes MN-PIII-PC-001,...       only these codes
//     --draft                          upload as drafts (default: publish)
//
// Idempotent: re-running updates the note in place (upsert by micro-theme).

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { uploadNote } from "./lib/note-upload.mjs";

if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  const { setGlobalDispatcher, EnvHttpProxyAgent } = await import("undici");
  setGlobalDispatcher(new EnvHttpProxyAgent());
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = join(__dirname, "..", "data", "notes");

const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const FILE = getArg("file");
const CODES = getArg("codes")?.split(",").map((s) => s.trim());
const PUBLISH = !args.includes("--draft");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  let files = readdirSync(NOTES_DIR).filter((f) => f.endsWith(".json"));
  if (FILE) files = files.filter((f) => f.includes(FILE));
  if (!files.length) {
    console.error("No note files matched in data/notes/");
    process.exit(1);
  }

  let done = 0;
  let failed = 0;
  for (const file of files.sort()) {
    const specs = JSON.parse(readFileSync(join(NOTES_DIR, file), "utf8"));
    for (const spec of specs) {
      if (CODES && !CODES.includes(spec.code)) continue;
      try {
        const res = await uploadNote(supabase, spec, { publish: PUBLISH });
        done++;
        console.log(`✓ [${res.code}] ${res.name}${PUBLISH ? "" : " (draft)"}`);
      } catch (e) {
        failed++;
        console.error(`✗ [${spec.code}] ${e.message}`);
      }
    }
  }
  console.log(`\n${done} uploaded, ${failed} failed`);
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
