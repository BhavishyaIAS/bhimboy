-- ============================================================
-- APPSC Group 1 Exam Prep Platform — initial schema
-- Run this in the Supabase SQL Editor (or via supabase db push).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- array_to_string is only STABLE, so wrap it for use in generated columns.
create or replace function public.immutable_join(arr text[])
returns text
language sql
immutable
as $$
  select coalesce(array_to_string(arr, ' '), '')
$$;

-- ------------------------------------------------------------
-- Profiles & roles
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so policies can check the caller's role without
-- recursing into the profiles policies themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Students may edit their own profile but never their role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ------------------------------------------------------------
-- Syllabus hierarchy
-- ------------------------------------------------------------

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stage text not null check (stage in ('prelims', 'mains')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.microthemes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete cascade,
  name text not null,
  code text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subjects_paper_id_idx on public.subjects (paper_id, sort_order);
create index topics_subject_id_idx on public.topics (subject_id, sort_order);
create index microthemes_topic_id_idx on public.microthemes (topic_id, sort_order);
create index microthemes_code_idx on public.microthemes (code);
create index microthemes_slug_idx on public.microthemes (slug);

-- ------------------------------------------------------------
-- Content: notes, videos, glossary
-- ------------------------------------------------------------

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  microtheme_id uuid not null unique references public.microthemes (id) on delete cascade,
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  content_text text not null default '',
  search_text tsvector generated always as (to_tsvector('english', content_text)) stored,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_search_idx on public.notes using gin (search_text);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  microtheme_id uuid not null references public.microthemes (id) on delete cascade,
  youtube_url text not null,
  title text not null default '',
  sort_order integer not null default 0,
  -- Videos default to published: they become visible as soon as their
  -- micro-theme is published (decision noted in PROGRESS.md).
  status text not null default 'published' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_microtheme_id_idx on public.videos (microtheme_id, sort_order);

create table public.glossary_terms (
  id uuid primary key default gen_random_uuid(),
  microtheme_id uuid not null references public.microthemes (id) on delete cascade,
  term text not null,
  definition text not null default '',
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published')),
  search_text tsvector generated always as (
    to_tsvector('english', term || ' ' || definition)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index glossary_terms_microtheme_id_idx on public.glossary_terms (microtheme_id, sort_order);
create index glossary_terms_search_idx on public.glossary_terms using gin (search_text);

-- ------------------------------------------------------------
-- Tags
-- ------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.question_tags (
  tag_id uuid not null references public.tags (id) on delete cascade,
  question_type text not null check (question_type in ('prelims', 'mains')),
  question_id uuid not null,
  primary key (tag_id, question_type, question_id)
);

create index question_tags_question_idx on public.question_tags (question_type, question_id);

-- ------------------------------------------------------------
-- PYQs
-- ------------------------------------------------------------

create table public.prelims_questions (
  id uuid primary key default gen_random_uuid(),
  microtheme_id uuid not null references public.microthemes (id) on delete cascade,
  year integer not null,
  paper_label text not null,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text,
  keywords text[] not null default '{}',
  search_text tsvector generated always as (
    to_tsvector('english',
      question_text || ' ' || coalesce(explanation, '') || ' ' || public.immutable_join(keywords))
  ) stored,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prelims_questions_microtheme_idx on public.prelims_questions (microtheme_id);
create index prelims_questions_year_idx on public.prelims_questions (year);
create index prelims_questions_search_idx on public.prelims_questions using gin (search_text);

create table public.mains_questions (
  id uuid primary key default gen_random_uuid(),
  microtheme_id uuid not null references public.microthemes (id) on delete cascade,
  year integer not null,
  paper_label text not null,
  question_text text not null,
  directive_word text,
  marks integer,
  model_answer jsonb,
  model_answer_text text not null default '',
  keywords text[] not null default '{}',
  search_text tsvector generated always as (
    to_tsvector('english',
      question_text || ' ' || coalesce(directive_word, '') || ' ' ||
      model_answer_text || ' ' || public.immutable_join(keywords))
  ) stored,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mains_questions_microtheme_idx on public.mains_questions (microtheme_id);
create index mains_questions_year_idx on public.mains_questions (year);
create index mains_questions_search_idx on public.mains_questions using gin (search_text);

-- Clean up tag links when a question is deleted (no FK possible across
-- the two question tables with one join table).
create or replace function public.cleanup_question_tags()
returns trigger
language plpgsql
as $$
begin
  delete from public.question_tags
  where question_id = old.id
    and question_type = tg_argv[0];
  return old;
end;
$$;

create trigger prelims_questions_cleanup_tags
  after delete on public.prelims_questions
  for each row execute function public.cleanup_question_tags('prelims');

create trigger mains_questions_cleanup_tags
  after delete on public.mains_questions
  for each row execute function public.cleanup_question_tags('mains');

-- ------------------------------------------------------------
-- Bulk upload logs
-- ------------------------------------------------------------

create table public.bulk_upload_logs (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  type text not null check (type in ('prelims', 'mains')),
  rows_total integer not null default 0,
  rows_inserted integer not null default 0,
  rows_failed integer not null default 0,
  error_report jsonb,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'papers', 'subjects', 'topics', 'microthemes', 'notes',
    'videos', 'glossary_terms', 'prelims_questions', 'mains_questions'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.microthemes enable row level security;
alter table public.notes enable row level security;
alter table public.videos enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.tags enable row level security;
alter table public.question_tags enable row level security;
alter table public.prelims_questions enable row level security;
alter table public.mains_questions enable row level security;
alter table public.bulk_upload_logs enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- papers (no status column: readable by any signed-in user)
create policy papers_admin_all on public.papers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy papers_student_read on public.papers
  for select to authenticated using (true);

-- subjects / topics / microthemes: students read published only
create policy subjects_admin_all on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy subjects_student_read on public.subjects
  for select to authenticated using (status = 'published');

create policy topics_admin_all on public.topics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy topics_student_read on public.topics
  for select to authenticated using (status = 'published');

create policy microthemes_admin_all on public.microthemes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy microthemes_student_read on public.microthemes
  for select to authenticated using (status = 'published');

-- notes / videos / glossary: published rows under published micro-themes
create policy notes_admin_all on public.notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy notes_student_read on public.notes
  for select to authenticated using (
    status = 'published'
    and exists (
      select 1 from public.microthemes m
      where m.id = microtheme_id and m.status = 'published'
    )
  );

create policy videos_admin_all on public.videos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy videos_student_read on public.videos
  for select to authenticated using (
    status = 'published'
    and exists (
      select 1 from public.microthemes m
      where m.id = microtheme_id and m.status = 'published'
    )
  );

create policy glossary_admin_all on public.glossary_terms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy glossary_student_read on public.glossary_terms
  for select to authenticated using (
    status = 'published'
    and exists (
      select 1 from public.microthemes m
      where m.id = microtheme_id and m.status = 'published'
    )
  );

-- tags
create policy tags_admin_all on public.tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy tags_student_read on public.tags
  for select to authenticated using (true);

create policy question_tags_admin_all on public.question_tags
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy question_tags_student_read on public.question_tags
  for select to authenticated using (true);

-- questions
create policy prelims_admin_all on public.prelims_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy prelims_student_read on public.prelims_questions
  for select to authenticated using (
    status = 'published'
    and exists (
      select 1 from public.microthemes m
      where m.id = microtheme_id and m.status = 'published'
    )
  );

create policy mains_admin_all on public.mains_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy mains_student_read on public.mains_questions
  for select to authenticated using (
    status = 'published'
    and exists (
      select 1 from public.microthemes m
      where m.id = microtheme_id and m.status = 'published'
    )
  );

-- bulk upload logs: admin only
create policy bulk_upload_logs_admin_all on public.bulk_upload_logs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- Storage: note-images bucket (public read, admin write)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

create policy "note images public read" on storage.objects
  for select using (bucket_id = 'note-images');
create policy "note images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-images' and public.is_admin());
create policy "note images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'note-images' and public.is_admin());
create policy "note images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-images' and public.is_admin());
