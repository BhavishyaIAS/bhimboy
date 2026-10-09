-- ============================================================
-- Material module
-- Uploaded study material / notes, organised syllabus-wise, in three
-- categories: Comprehensive Material, Prelims Notes, Mains Notes.
-- Each material is a file stored in the `materials` storage bucket plus a
-- metadata row that may be pinned to any level of the syllabus hierarchy
-- (paper / subject / topic / micro-theme) — all nullable so material can be
-- uploaded before the syllabus is fully built out.
-- ============================================================

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('comprehensive', 'prelims', 'mains')),
  title text not null,
  description text not null default '',
  file_path text not null,
  file_name text not null default '',
  file_size bigint not null default 0,
  mime_type text not null default '',
  -- Syllabus placement (as deep as the uploader chooses; all optional).
  paper_id uuid references public.papers (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  topic_id uuid references public.topics (id) on delete set null,
  microtheme_id uuid references public.microthemes (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index materials_category_idx on public.materials (category, sort_order);
create index materials_paper_idx on public.materials (paper_id);
create index materials_subject_idx on public.materials (subject_id);
create index materials_topic_idx on public.materials (topic_id);
create index materials_microtheme_idx on public.materials (microtheme_id);

create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- Row Level Security: admins manage everything; students read published only.
alter table public.materials enable row level security;

create policy materials_admin_all on public.materials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy materials_student_read on public.materials
  for select to authenticated using (status = 'published');

-- ------------------------------------------------------------
-- Storage: `materials` bucket (private — authenticated read, admin write).
-- Private, unlike note-images, because study material may be gated content;
-- downloads are served through short-lived signed URLs.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "materials read (authenticated)" on storage.objects
  for select to authenticated using (bucket_id = 'materials');
create policy "materials admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'materials' and public.is_admin());
create policy "materials admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'materials' and public.is_admin());
create policy "materials admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'materials' and public.is_admin());
