-- Practical-coverage metadata on micro-themes:
--   priority     1 = core, 2 = important, 3 = supporting
--   est_minutes  one-sitting study estimate
--   exam_overlap true when the theme serves both Prelims and Mains
alter table public.microthemes
  add column if not exists priority smallint not null default 2
    check (priority between 1 and 3),
  add column if not exists est_minutes smallint,
  add column if not exists exam_overlap boolean not null default false;
