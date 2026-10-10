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

-- ---- Bulk insert RPCs updated to carry commission + exam_group ----
-- (coalesce to appsc / group 1 when a row omits them)

create or replace function public.bulk_insert_prelims(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $func$
declare
  r jsonb;
  v_mt uuid;
  v_qid uuid;
  v_tag text;
  v_tag_id uuid;
  v_count integer := 0;
  v_idx integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can bulk upload';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;

    v_mt := (select id from public.microthemes where code = r ->> 'microtheme_code' limit 1);
    if v_mt is null then
      raise exception 'Row %: unknown micro-theme code "%"', v_idx, r ->> 'microtheme_code';
    end if;

    insert into public.prelims_questions (
      microtheme_id, year, paper_label, question_text,
      option_a, option_b, option_c, option_d,
      correct_option, explanation, keywords, status,
      commission, exam_group
    ) values (
      v_mt,
      (r ->> 'year')::integer,
      r ->> 'paper_label',
      r ->> 'question_text',
      r ->> 'option_a',
      r ->> 'option_b',
      r ->> 'option_c',
      r ->> 'option_d',
      upper(r ->> 'correct_option'),
      nullif(r ->> 'explanation', ''),
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(r -> 'keywords') as x),
        '{}'
      ),
      coalesce(nullif(r ->> 'status', ''), 'draft'),
      coalesce(nullif(r ->> 'commission', ''), 'appsc'),
      coalesce(nullif(r ->> 'exam_group', ''), '1')
    )
    returning id into v_qid;

    if r ? 'tags' then
      for v_tag in
        select trim(x) from jsonb_array_elements_text(r -> 'tags') as x
        where trim(x) <> ''
      loop
        insert into public.tags (name) values (v_tag)
        on conflict (name) do update set name = excluded.name
        returning id into v_tag_id;

        insert into public.question_tags (tag_id, question_type, question_id)
        values (v_tag_id, 'prelims', v_qid)
        on conflict do nothing;
      end loop;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$func$;

create or replace function public.bulk_insert_mains(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $func$
declare
  r jsonb;
  v_mt uuid;
  v_qid uuid;
  v_tag text;
  v_tag_id uuid;
  v_count integer := 0;
  v_idx integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can bulk upload';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;

    v_mt := (select id from public.microthemes where code = r ->> 'microtheme_code' limit 1);
    if v_mt is null then
      raise exception 'Row %: unknown micro-theme code "%"', v_idx, r ->> 'microtheme_code';
    end if;

    insert into public.mains_questions (
      microtheme_id, year, paper_label, question_text,
      directive_word, marks, model_answer, model_answer_text,
      keywords, status, commission, exam_group
    ) values (
      v_mt,
      (r ->> 'year')::integer,
      r ->> 'paper_label',
      r ->> 'question_text',
      nullif(r ->> 'directive_word', ''),
      nullif(r ->> 'marks', '')::integer,
      case when r -> 'model_answer' = 'null'::jsonb then null else r -> 'model_answer' end,
      coalesce(r ->> 'model_answer_text', ''),
      coalesce(
        (select array_agg(x) from jsonb_array_elements_text(r -> 'keywords') as x),
        '{}'
      ),
      coalesce(nullif(r ->> 'status', ''), 'draft'),
      coalesce(nullif(r ->> 'commission', ''), 'appsc'),
      coalesce(nullif(r ->> 'exam_group', ''), '1')
    )
    returning id into v_qid;

    if r ? 'tags' then
      for v_tag in
        select trim(x) from jsonb_array_elements_text(r -> 'tags') as x
        where trim(x) <> ''
      loop
        insert into public.tags (name) values (v_tag)
        on conflict (name) do update set name = excluded.name
        returning id into v_tag_id;

        insert into public.question_tags (tag_id, question_type, question_id)
        values (v_tag_id, 'mains', v_qid)
        on conflict do nothing;
      end loop;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$func$;
