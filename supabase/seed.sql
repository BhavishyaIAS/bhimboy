-- ============================================================
-- Seed data: APPSC Group 1 papers (2018 pattern) + one sample
-- subject → topic → micro-theme chain with sample content.
-- Safe to run once on a fresh database.
-- ============================================================

-- Prelims (Screening Test): 2 objective papers
insert into public.papers (name, stage, sort_order) values
  ('Prelims Paper 1 – General Studies', 'prelims', 1),
  ('Prelims Paper 2 – General Aptitude', 'prelims', 2),
  ('Mains Qualifying Paper – English', 'mains', 3),
  ('Mains Qualifying Paper – Telugu', 'mains', 4),
  ('Mains Paper 1 – General Essay', 'mains', 5),
  ('Mains Paper 2 – History, Culture & Geography of India and AP', 'mains', 6),
  ('Mains Paper 3 – Polity, Constitution, Governance, Law & Ethics', 'mains', 7),
  ('Mains Paper 4 – Economy & Development of AP and India', 'mains', 8),
  ('Mains Paper 5 – Science, Technology & Environmental Issues', 'mains', 9);

-- Sample chain: Polity → Constitutional Framework → 73rd & 74th Amendments
with p as (
  select id from public.papers where name = 'Prelims Paper 1 – General Studies'
),
s as (
  insert into public.subjects (paper_id, name, sort_order, status)
  select p.id, 'Polity', 1, 'published' from p
  returning id
),
t as (
  insert into public.topics (subject_id, name, sort_order, status)
  select s.id, 'Constitutional Framework', 1, 'published' from s
  returning id
),
m as (
  insert into public.microthemes (topic_id, name, code, slug, sort_order, status)
  select t.id, '73rd & 74th Amendments', 'POL-CF-001', '73rd-74th-amendments', 1, 'published'
  from t
  returning id
),
n as (
  insert into public.notes (microtheme_id, content, content_text, status, published_at)
  select
    m.id,
    '{
      "type": "doc",
      "content": [
        {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "73rd & 74th Constitutional Amendments"}]},
        {"type": "paragraph", "content": [{"type": "text", "text": "The 73rd and 74th Constitutional Amendment Acts, 1992 gave constitutional status to Panchayati Raj Institutions and Urban Local Bodies respectively. They came into force in 1993 and added Parts IX and IXA, along with the Eleventh and Twelfth Schedules, to the Constitution."}]},
        {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "Key Features"}]},
        {"type": "bulletList", "content": [
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Three-tier system of Panchayati Raj (village, intermediate, district)."}]}]},
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Gram Sabha as the foundation of the system."}]}]},
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Reservation for SCs, STs and women (not less than one-third of seats)."}]}]},
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "State Election Commission and State Finance Commission every five years."}]}]}
        ]},
        {"type": "mermaid", "attrs": {"code": "flowchart TD\n  A[73rd & 74th Amendments, 1992] --> B[Part IX: Panchayats]\n  A --> C[Part IXA: Municipalities]\n  B --> D[11th Schedule: 29 subjects]\n  C --> E[12th Schedule: 18 subjects]"}},
        {"type": "paragraph", "content": [{"type": "text", "text": "For Andhra Pradesh, the AP Panchayat Raj Act, 1994 implements these provisions."}]}
      ]
    }'::jsonb,
    '73rd & 74th Constitutional Amendments. The 73rd and 74th Constitutional Amendment Acts, 1992 gave constitutional status to Panchayati Raj Institutions and Urban Local Bodies respectively. They came into force in 1993 and added Parts IX and IXA, along with the Eleventh and Twelfth Schedules, to the Constitution. Key Features. Three-tier system of Panchayati Raj (village, intermediate, district). Gram Sabha as the foundation of the system. Reservation for SCs, STs and women (not less than one-third of seats). State Election Commission and State Finance Commission every five years. For Andhra Pradesh, the AP Panchayat Raj Act, 1994 implements these provisions.',
    'published',
    now()
  from m
  returning id
),
v as (
  insert into public.videos (microtheme_id, youtube_url, title, sort_order, status)
  select m.id, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Panchayati Raj — overview lecture (replace with your video)', 1, 'published'
  from m
  returning id
),
g as (
  insert into public.glossary_terms (microtheme_id, term, definition, sort_order, status)
  select m.id, x.term, x.definition, x.sort_order, 'published'
  from m,
  (values
    ('Gram Sabha', 'The body of all registered voters of a village panchayat area; the foundation of the Panchayati Raj system.', 1),
    ('State Election Commission', 'Constitutional authority under Article 243K that conducts elections to panchayats and municipalities.', 2),
    ('Eleventh Schedule', 'Lists the 29 functional items placed within the purview of panchayats by the 73rd Amendment.', 3)
  ) as x(term, definition, sort_order)
  returning id
),
pq as (
  insert into public.prelims_questions (
    microtheme_id, year, paper_label, question_text,
    option_a, option_b, option_c, option_d, correct_option,
    explanation, keywords, status
  )
  select
    m.id, 2019, 'Prelims Paper 1',
    'Which Constitutional Amendment Act gave constitutional status to Panchayati Raj Institutions?',
    '71st Amendment', '72nd Amendment', '73rd Amendment', '74th Amendment', 'C',
    'The 73rd Constitutional Amendment Act, 1992 gave constitutional status to Panchayati Raj Institutions. The 74th did the same for Urban Local Bodies.',
    array['panchayati raj', '73rd amendment'], 'published'
  from m
  returning id
)
insert into public.mains_questions (
  microtheme_id, year, paper_label, question_text,
  directive_word, marks, model_answer, model_answer_text, keywords, status
)
select
  m.id, 2020, 'Mains Paper 3',
  'Critically examine the working of the 73rd Constitutional Amendment with special reference to devolution of funds, functions and functionaries in Andhra Pradesh.',
  'critically examine', 15,
  '{
    "type": "doc",
    "content": [
      {"type": "paragraph", "content": [{"type": "text", "text": "The 73rd Amendment constitutionalised rural local self-government, but its success depends on the three Fs — funds, functions and functionaries — actually being devolved by states."}]},
      {"type": "bulletList", "content": [
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Functions: AP has devolved several of the 29 Eleventh Schedule subjects, but many remain with line departments."}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Funds: dependence on state transfers; own-source revenue of panchayats remains weak."}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Functionaries: staff often report to departments rather than panchayats, limiting real autonomy."}]}]}
      ]},
      {"type": "paragraph", "content": [{"type": "text", "text": "Conclude with reforms: activity mapping, strengthening State Finance Commissions, and capacity building of elected representatives."}]}
    ]
  }'::jsonb,
  'The 73rd Amendment constitutionalised rural local self-government, but its success depends on the three Fs — funds, functions and functionaries. Functions: AP has devolved several of the 29 Eleventh Schedule subjects. Funds: dependence on state transfers. Functionaries: staff often report to departments rather than panchayats. Reforms: activity mapping, strengthening State Finance Commissions, capacity building.',
  array['panchayati raj', 'devolution', '73rd amendment'], 'published'
from m;
