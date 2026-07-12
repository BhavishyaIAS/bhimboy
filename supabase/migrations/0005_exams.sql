-- 0005 — Exam verticals (APPSC / UPSC)
--
-- Adds an `exam` dimension at the root of the content tree so the platform
-- can host multiple exam modules side by side. Existing papers (the whole
-- APPSC Group-1 tree) are backfilled to 'appsc' via the column default.
--
-- Idempotent: safe to run more than once.

alter table public.papers
  add column if not exists exam text not null default 'appsc';

-- Add the check constraint separately so re-runs don't fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'papers_exam_check'
      and conrelid = 'public.papers'::regclass
  ) then
    alter table public.papers
      add constraint papers_exam_check check (exam in ('appsc', 'upsc'));
  end if;
end $$;

create index if not exists papers_exam_idx on public.papers (exam, sort_order);
