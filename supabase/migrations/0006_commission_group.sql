-- ============================================================
-- Commission + exam-group tagging
-- Every piece of content belongs to a commission (APPSC / TGPSC) and an
-- exam group (1 / 2). Existing content is APPSC Group 1, except mains PYQs
-- whose paper_label carried a "(TGPSC)" marker — those are TGPSC Group 1.
-- ============================================================

-- ---- papers ----
alter table public.papers
  add column if not exists commission text not null default 'appsc',
  add column if not exists exam_group text not null default '1';
alter table public.papers
  drop constraint if exists papers_commission_chk,
  add constraint papers_commission_chk check (commission in ('appsc', 'tgpsc'));
alter table public.papers
  drop constraint if exists papers_group_chk,
  add constraint papers_group_chk check (exam_group in ('1', '2'));

-- ---- prelims_questions ----
alter table public.prelims_questions
  add column if not exists commission text not null default 'appsc',
  add column if not exists exam_group text not null default '1';
alter table public.prelims_questions
  drop constraint if exists prelims_questions_commission_chk,
  add constraint prelims_questions_commission_chk check (commission in ('appsc', 'tgpsc'));
alter table public.prelims_questions
  drop constraint if exists prelims_questions_group_chk,
  add constraint prelims_questions_group_chk check (exam_group in ('1', '2'));

-- ---- mains_questions ----
alter table public.mains_questions
  add column if not exists commission text not null default 'appsc',
  add column if not exists exam_group text not null default '1';
alter table public.mains_questions
  drop constraint if exists mains_questions_commission_chk,
  add constraint mains_questions_commission_chk check (commission in ('appsc', 'tgpsc'));
alter table public.mains_questions
  drop constraint if exists mains_questions_group_chk,
  add constraint mains_questions_group_chk check (exam_group in ('1', '2'));

-- ---- materials ----
alter table public.materials
  add column if not exists commission text not null default 'appsc',
  add column if not exists exam_group text not null default '1';
alter table public.materials
  drop constraint if exists materials_commission_chk,
  add constraint materials_commission_chk check (commission in ('appsc', 'tgpsc'));
alter table public.materials
  drop constraint if exists materials_group_chk,
  add constraint materials_group_chk check (exam_group in ('1', '2'));

-- ---- Backfill TGPSC from the "(TGPSC)" marker, then clean the label ----
update public.mains_questions
  set commission = 'tgpsc'
  where paper_label like '%(TGPSC)%';
update public.prelims_questions
  set commission = 'tgpsc'
  where paper_label like '%(TGPSC)%';

update public.mains_questions
  set paper_label = regexp_replace(paper_label, '\s*\(TGPSC\)', '', 'g')
  where paper_label like '%(TGPSC)%';
update public.prelims_questions
  set paper_label = regexp_replace(paper_label, '\s*\(TGPSC\)', '', 'g')
  where paper_label like '%(TGPSC)%';

-- ---- Indexes for per-track filtering ----
create index if not exists papers_track_idx on public.papers (commission, exam_group);
create index if not exists prelims_questions_track_idx on public.prelims_questions (commission, exam_group);
create index if not exists mains_questions_track_idx on public.mains_questions (commission, exam_group);
create index if not exists materials_track_idx on public.materials (commission, exam_group);
