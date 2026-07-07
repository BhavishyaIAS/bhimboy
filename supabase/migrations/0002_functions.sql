-- ============================================================
-- RPC functions: bulk insert (transactional) and global search
-- ============================================================

-- ------------------------------------------------------------
-- Bulk insert: prelims questions (all-or-nothing)
-- rows: jsonb array of objects with keys
--   microtheme_code, year, paper_label, question_text,
--   option_a..option_d, correct_option, explanation,
--   tags (jsonb array), keywords (jsonb array), status
-- ------------------------------------------------------------

create or replace function public.bulk_insert_prelims(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

    select id into v_mt from public.microthemes where code = r ->> 'microtheme_code';
    if v_mt is null then
      raise exception 'Row %: unknown micro-theme code "%"', v_idx, r ->> 'microtheme_code';
    end if;

    insert into public.prelims_questions (
      microtheme_id, year, paper_label, question_text,
      option_a, option_b, option_c, option_d,
      correct_option, explanation, keywords, status
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
      coalesce(nullif(r ->> 'status', ''), 'draft')
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
$$;

-- ------------------------------------------------------------
-- Bulk insert: mains questions (all-or-nothing)
-- rows: jsonb array of objects with keys
--   microtheme_code, year, paper_label, question_text,
--   directive_word, marks, model_answer (TipTap JSON or null),
--   model_answer_text, tags, keywords, status
-- ------------------------------------------------------------

create or replace function public.bulk_insert_mains(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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

    select id into v_mt from public.microthemes where code = r ->> 'microtheme_code';
    if v_mt is null then
      raise exception 'Row %: unknown micro-theme code "%"', v_idx, r ->> 'microtheme_code';
    end if;

    insert into public.mains_questions (
      microtheme_id, year, paper_label, question_text,
      directive_word, marks, model_answer, model_answer_text,
      keywords, status
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
      coalesce(nullif(r ->> 'status', ''), 'draft')
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
$$;

-- ------------------------------------------------------------
-- Global search (SECURITY INVOKER: RLS applies, so students only
-- ever search published content).
-- ------------------------------------------------------------

create or replace function public.global_search(q text)
returns table (
  result_type text,
  id uuid,
  microtheme_id uuid,
  microtheme_slug text,
  microtheme_name text,
  title text,
  snippet text,
  rank real
)
language sql
stable
as $$
  -- Every branch of the UNION aliases its columns, and the whole thing is
  -- wrapped in a CTE so the final ORDER BY can reference "rank" by name
  -- (a bare UNION would otherwise name columns after the first SELECT only).
  with tsq as (
    select websearch_to_tsquery('english', q) as query
  ),
  results as (
    select
      'note'::text          as result_type,
      n.id                  as id,
      m.id                  as microtheme_id,
      m.slug                as microtheme_slug,
      m.name                as microtheme_name,
      m.name                as title,
      ts_headline('english', n.content_text, tsq.query,
        'MaxWords=35, MinWords=15, MaxFragments=2') as snippet,
      ts_rank(n.search_text, tsq.query) as rank
    from public.notes n
    join public.microthemes m on m.id = n.microtheme_id
    cross join tsq
    where n.search_text @@ tsq.query

    union all

    select
      'glossary'::text,
      g.id,
      m.id,
      m.slug,
      m.name,
      g.term,
      ts_headline('english', g.definition, tsq.query,
        'MaxWords=35, MinWords=15'),
      ts_rank(g.search_text, tsq.query)
    from public.glossary_terms g
    join public.microthemes m on m.id = g.microtheme_id
    cross join tsq
    where g.search_text @@ tsq.query

    union all

    select
      'prelims'::text,
      p.id,
      m.id,
      m.slug,
      m.name,
      left(p.question_text, 160),
      ts_headline('english',
        p.question_text || ' ' || coalesce(p.explanation, ''), tsq.query,
        'MaxWords=35, MinWords=15'),
      ts_rank(p.search_text, tsq.query)
    from public.prelims_questions p
    join public.microthemes m on m.id = p.microtheme_id
    cross join tsq
    where p.search_text @@ tsq.query

    union all

    select
      'mains'::text,
      q2.id,
      m.id,
      m.slug,
      m.name,
      left(q2.question_text, 160),
      ts_headline('english', q2.question_text, tsq.query,
        'MaxWords=35, MinWords=15'),
      ts_rank(q2.search_text, tsq.query)
    from public.mains_questions q2
    join public.microthemes m on m.id = q2.microtheme_id
    cross join tsq
    where q2.search_text @@ tsq.query
  )
  select
    result_type, id, microtheme_id, microtheme_slug,
    microtheme_name, title, snippet, rank
  from results
  order by rank desc
  limit 60;
$$;
