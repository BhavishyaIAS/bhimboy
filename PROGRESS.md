# PROGRESS — APPSC Group 1 Exam Prep Platform (Bhimboy)

Running log of milestones, decisions and open items. Newest changes at the top
of each section.

## Status by milestone

| Milestone | Status | Notes |
|---|---|---|
| M0 — Scaffold | ✅ Done | Next.js 16 (App Router) + TS strict + Tailwind v4, vendored shadcn/ui, Supabase clients, env handling |
| M1 — Database & auth | ✅ Verified | Migrations run on live Supabase; RLS matrix proven (student/admin/anon); storage bucket live; profile trigger fires; admin seeded |
| M2 — Syllabus Manager | ✅ Verified | Tree CRUD, dnd-kit reordering, draft/publish, code generation + inline editing, typed delete confirmation; renders live tree |
| M3 — Notes system | ✅ Verified | TipTap editor (Mermaid node, image upload, tables, YouTube), 10s autosave, shared renderer; Mermaid renders to SVG in-browser against live data |
| M4 — PYQ system | ✅ Verified | Prelims/mains forms, model-answer editor, admin table, student vault; answer-reveal + collapsible model answer verified in-browser |
| M5 — Bulk upload | ✅ Verified | Template downloads, parse→validate→preview→commit (atomic RPC), xlsx error report, upload logs; admin RPC insert confirmed, student RPC blocked |
| M6 — Search & polish | ✅ Verified | `global_search` RPC returns ranked grouped results; search page, micro-theme prev/next + breadcrumbs, mobile bottom nav, loading/empty states |
| M7 — Hardening & deploy | ✅ Done | RLS hardened; deployed to Vercel at https://bhimboy.vercel.app and verified live (auth + DB reads from Vercel↔Supabase) |

### Live verification (2026-07-07)

Run against the connected Supabase project with a real admin account and a
throwaway student account (since deleted):

- **RLS matrix** — student reads only published rows; cannot read drafts;
  cannot INSERT/UPDATE; `bulk_insert_*` rejects non-admins ("Only admins can
  bulk upload"); anon sees nothing; admin (authenticated) can INSERT/UPDATE and
  run the bulk RPC. Profile row auto-created by trigger on signup.
- **Student browser flow (12/12)** — login → syllabus → micro-theme page with
  notes, **Mermaid diagram rendered to SVG**, YouTube embed, glossary; prelims
  answer-reveal; mains collapsible model answer; PYQ vault; grouped search;
  blocked from `/admin`.
- **Admin browser flow (6/6)** — login, dashboard live counts, syllabus
  manager tree, PYQ manager, bulk-upload page + template download.

### Fixes made during verification

- `0002_functions.sql` — `global_search` ordered a UNION by column alias,
  which failed (`42703`). Wrapped the UNION in a CTE with explicit aliases.
- `0003_fix_role_trigger.sql` (new) — the role-escalation guard blocked *all*
  role changes, including from the SQL Editor / service role (where
  `auth.uid()` is null), making first-admin promotion impossible. Now only
  blocks authenticated non-admins. Folded into `promote-admin.sql` too.
- `src/instrumentation.ts` (new) — makes the Node server honour `HTTPS_PROXY`
  (needed only in proxied dev/CI environments; a no-op on Vercel).

## Key decisions (deviations & interpretations)

1. **shadcn/ui vendored by hand** — the shadcn CLI registry (ui.shadcn.com) is
   blocked from this build environment, so the standard component sources were
   committed directly under `src/components/ui/` with Radix primitives from
   npm. Identical result, no CLI dependency.
2. **Next.js 16 / Tailwind v4** — "Next.js 14+" resolved to the current stable
   (16.2). Tailwind v4 uses CSS-based config (`globals.css`), no
   `tailwind.config.ts`.
3. **Search vectors are `GENERATED` columns**, not trigger-maintained — same
   behaviour, less code to break. Plain text for notes is extracted from
   TipTap JSON app-side (`src/lib/tiptap-text.ts`) and stored in
   `notes.content_text`.
4. **Videos & glossary terms default to `status='published'`** — they become
   visible the moment their micro-theme is published. Rationale: a solo admin
   shouldn't need a second publish click for every video/term. RLS still
   requires the parent micro-theme to be published.
5. **Image captions use the image `alt`/`title` attribute** — the editor
   prompts for a caption on upload and the student renderer shows it as a
   `<figcaption>`. Keeps the document schema simple.
6. **`question_tags` is one polymorphic join table** (`question_type` +
   `question_id`) matching the brief's single-table wording; cleanup triggers
   on both question tables replace the FK that can't span two tables.
7. **Bulk upload commits are all-or-nothing for valid rows** via
   `bulk_insert_prelims/mains` SQL functions (single transaction). Invalid
   rows never reach the database; they go into the downloadable error report.
8. **Mains bulk-upload `model_answer` plain text** is converted app-side into
   a minimal TipTap doc (one paragraph per line) so it is editable later in
   the rich editor.
9. **APPSC 2018 mains pattern seeded** as: English + Telugu qualifying papers
   and Papers 1–5 (Essay; History/Culture/Geography; Polity/Law/Ethics;
   Economy & Development; S&T/Environment) = the "Mains Papers 1–7" in the
   brief. Rename/reorder freely in the Syllabus Manager.
10. **Platform name "Bhimboy"** (from the repo) as the working brand; changing
    it later is a find-replace in ~4 files.

## Design language — "Sharad", the autumn sanctuary (2026-07-07)

Full UI/UX reskin with a meditative, autumn-spiritual identity:
- Warm parchment/saffron/ember palette (all semantic tokens in
  `globals.css`), Fraunces serif display type for headings.
- `FallingLeaves` — slow (22–48s) CSS-only drifting leaves on landing/auth
  (full) and browsing pages (whisper); seeded PRNG so SSR markup is
  deterministic; hidden under `prefers-reduced-motion`.
- `Lotus` breathing ornament + `LeafDivider` between reading-page sections
  (reading pages stay motion-free for distraction-free study).
- Landing rebuilt: dawn-light gradient, Telugu shloka, serif hero, glowing
  CTAs; auth pages match. Student syllabus/PYQ/search pages restyled.
- Student-area queries now filter `publishedOnly` explicitly so admins
  previewing the student area see exactly what students see.

## Live

- **App:** https://bhimboy.vercel.app (Vercel, auto-deploys from the branch)
- **Database:** Supabase project `jdxmavlygphwszclsxdi`
- **Content loaded:** full APPSC Group-I syllabus — 9 papers, 39 subjects,
  97 topics, 458 micro-themes, all drafts (see `scripts/import-syllabus.mjs`).

Production verified 2026-07-07: admin login works on Vercel, `/admin/syllabus`
serves the imported tree read live from Supabase, protected routes redirect,
student + admin pages render.

### Remaining setup niceties (non-blocking)
- Change the admin password (currently a temporary generated one).
- Optionally set Supabase Auth **Site URL** / **Redirect URLs** to the Vercel
  domain — needed later for email confirmation & password-reset links, not for
  password login (already working).
- Content is all draft; publish papers/subjects/topics/micro-themes as notes
  are added.

## How to run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```
