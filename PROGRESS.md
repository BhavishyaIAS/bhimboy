# PROGRESS — APPSC Group 1 Exam Prep Platform (Bhimboy)

Running log of milestones, decisions and open items. Newest changes at the top
of each section.

## Status by milestone

| Milestone | Status | Notes |
|---|---|---|
| M0 — Scaffold | ✅ Done | Next.js 16 (App Router) + TS strict + Tailwind v4, vendored shadcn/ui, Supabase clients, env handling |
| M1 — Database & auth | 🟡 Code complete | Migrations, RLS, storage policies, seed & admin-promotion scripts written; **needs a live Supabase project to run against** (waiting on credentials — see PAUSE) |
| M2 — Syllabus Manager | 🟡 Code complete | Tree CRUD, dnd-kit reordering, draft/publish, code generation + inline editing, typed delete confirmation |
| M3 — Notes system | 🟡 Code complete | TipTap editor (Mermaid node, image upload, tables, YouTube), 10s autosave with indicator, shared student renderer, videos + glossary tabs |
| M4 — PYQ system | 🟡 Code complete | Prelims/mains forms, model-answer editor, admin table, student vault with filters/answer-reveal/collapsible answers |
| M5 — Bulk upload | 🟡 Code complete | Template downloads, parse→validate→preview→commit (atomic RPC), xlsx error report, upload logs |
| M6 — Search & polish | 🟡 Code complete | `global_search` RPC + search page + header search, micro-theme page with prev/next + breadcrumbs, mobile bottom nav, loading/empty states |
| M7 — Hardening & deploy | ⬜ Pending | RLS verification with a real student account + Vercel deploy — blocked on Supabase credentials |

"Code complete" = written and passing the production build, but not yet
exercised against a live database. Full verification happens as soon as the
Supabase project is connected.

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

## PAUSE — waiting on Girish

Everything up to M6 is built. To go live I need:
- (a) Supabase project URL + anon key + service role key
- (b) confirmation of the admin email (assumed girishvenky007@gmail.com)
- (c) the SQL files under `supabase/` run in the project (instructions provided in chat)

## How to run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```
