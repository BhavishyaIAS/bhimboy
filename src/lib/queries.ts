import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  GlossaryTerm,
  MainsQuestion,
  Microtheme,
  Note,
  Paper,
  PrelimsQuestion,
  Subject,
  SyllabusTree,
  Topic,
  Video,
} from "@/lib/database.types";

// RLS already restricts students to published rows; `publishedOnly` applies
// the same filter explicitly so admins previewing the student area see
// exactly what students see.
export async function getSyllabusTree(
  options: { publishedOnly?: boolean } = {}
): Promise<SyllabusTree> {
  const supabase = await createClient();
  let query = supabase
    .from("papers")
    .select(
      `id, name, stage, sort_order, created_at, updated_at,
       subjects (
         id, paper_id, name, sort_order, status, created_at, updated_at,
         topics (
           id, subject_id, name, sort_order, status, created_at, updated_at,
           microthemes (
             id, topic_id, name, code, slug, sort_order, status, created_at, updated_at
           )
         )
       )`
    )
    .order("sort_order")
    .order("sort_order", { referencedTable: "subjects" })
    .order("sort_order", { referencedTable: "subjects.topics" })
    .order("sort_order", { referencedTable: "subjects.topics.microthemes" });

  if (options.publishedOnly) {
    query = query
      .eq("subjects.status", "published")
      .eq("subjects.topics.status", "published")
      .eq("subjects.topics.microthemes.status", "published");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { papers: (data ?? []) as unknown as SyllabusTree["papers"] };
}

export interface MicrothemePageData {
  microtheme: Microtheme;
  topic: Topic;
  subject: Subject;
  paper: Paper;
  note: Note | null;
  videos: Video[];
  glossary: GlossaryTerm[];
  prelims: PrelimsQuestion[];
  mains: MainsQuestion[];
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
}

export async function getMicrothemeBySlug(
  slug: string
): Promise<MicrothemePageData | null> {
  const supabase = await createClient();

  const { data: mt, error } = await supabase
    .from("microthemes")
    .select(
      `*,
       topic:topics (*, subject:subjects (*, paper:papers (*)))`
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!mt) return null;

  const topic = mt.topic as unknown as Topic & {
    subject: Subject & { paper: Paper };
  };

  const [noteRes, videosRes, glossaryRes, prelimsRes, mainsRes, orderedRes] =
    await Promise.all([
      supabase.from("notes").select("*").eq("microtheme_id", mt.id).maybeSingle(),
      supabase
        .from("videos")
        .select("*")
        .eq("microtheme_id", mt.id)
        .order("sort_order"),
      supabase
        .from("glossary_terms")
        .select("*")
        .eq("microtheme_id", mt.id)
        .order("sort_order"),
      supabase
        .from("prelims_questions")
        .select("*")
        .eq("microtheme_id", mt.id)
        .order("year", { ascending: false }),
      supabase
        .from("mains_questions")
        .select("*")
        .eq("microtheme_id", mt.id)
        .order("year", { ascending: false }),
      getOrderedMicrothemes(),
    ]);

  const ordered = orderedRes;
  const idx = ordered.findIndex((m) => m.id === mt.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const next = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;

  return {
    microtheme: mt as unknown as Microtheme,
    topic,
    subject: topic.subject,
    paper: topic.subject.paper,
    note: (noteRes.data as Note | null) ?? null,
    videos: (videosRes.data ?? []) as Video[],
    glossary: (glossaryRes.data ?? []) as GlossaryTerm[],
    prelims: (prelimsRes.data ?? []) as PrelimsQuestion[],
    mains: (mainsRes.data ?? []) as MainsQuestion[],
    prev: prev ? { slug: prev.slug, name: prev.name } : null,
    next: next ? { slug: next.slug, name: next.name } : null,
  };
}

// Flat, syllabus-ordered list of published micro-themes (drives prev/next
// on the student reading page).
async function getOrderedMicrothemes(): Promise<
  { id: string; slug: string; name: string }[]
> {
  const tree = await getSyllabusTree({ publishedOnly: true });
  const flat: { id: string; slug: string; name: string }[] = [];
  for (const paper of tree.papers) {
    for (const subject of paper.subjects ?? []) {
      for (const topic of subject.topics ?? []) {
        for (const m of topic.microthemes ?? []) {
          flat.push({ id: m.id, slug: m.slug, name: m.name });
        }
      }
    }
  }
  return flat;
}

// ---------------- PYQ vault ----------------

export interface PyqFilters {
  stage?: "prelims" | "mains";
  paperLabel?: string;
  year?: number;
  subjectId?: string;
  topicId?: string;
  microthemeId?: string;
  tag?: string;
  q?: string;
  status?: "draft" | "published"; // admin-only filter; RLS hides drafts from students anyway
  page?: number;
  pageSize?: number;
}

export interface PyqWithMeta {
  question: (PrelimsQuestion | MainsQuestion) & { type: "prelims" | "mains" };
  microtheme: { id: string; name: string; slug: string; code: string };
  tags: string[];
}

async function getMicrothemeIdsForScope(filters: PyqFilters): Promise<string[] | null> {
  const supabase = await createClient();
  if (filters.microthemeId) return [filters.microthemeId];
  if (filters.topicId) {
    const { data } = await supabase
      .from("microthemes")
      .select("id")
      .eq("topic_id", filters.topicId);
    return (data ?? []).map((r) => r.id);
  }
  if (filters.subjectId) {
    const { data } = await supabase
      .from("topics")
      .select("id, microthemes (id)")
      .eq("subject_id", filters.subjectId);
    return (data ?? []).flatMap((t) =>
      ((t.microthemes as { id: string }[] | null) ?? []).map((m) => m.id)
    );
  }
  return null;
}

async function getQuestionIdsForTag(
  tag: string,
  type: "prelims" | "mains"
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tags")
    .select("id, question_tags (question_id, question_type)")
    .eq("name", tag)
    .maybeSingle();
  if (!data) return [];
  return ((data.question_tags as { question_id: string; question_type: string }[]) ?? [])
    .filter((qt) => qt.question_type === type)
    .map((qt) => qt.question_id);
}

async function queryQuestions(
  type: "prelims" | "mains",
  filters: PyqFilters,
  limit: number
): Promise<{ rows: Record<string, unknown>[]; count: number }> {
  const supabase = await createClient();
  const table = type === "prelims" ? "prelims_questions" : "mains_questions";

  let query = supabase
    .from(table)
    .select(
      "*, microtheme:microthemes (id, name, slug, code)",
      { count: "exact" }
    );

  if (filters.paperLabel) query = query.eq("paper_label", filters.paperLabel);
  if (filters.year) query = query.eq("year", filters.year);
  if (filters.status) query = query.eq("status", filters.status);

  const scopeIds = await getMicrothemeIdsForScope(filters);
  if (scopeIds) {
    if (scopeIds.length === 0) return { rows: [], count: 0 };
    query = query.in("microtheme_id", scopeIds);
  }

  if (filters.tag) {
    const qids = await getQuestionIdsForTag(filters.tag, type);
    if (qids.length === 0) return { rows: [], count: 0 };
    query = query.in("id", qids);
  }

  if (filters.q?.trim()) {
    query = query.textSearch("search_text", filters.q.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  query = query
    .order("year", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as Record<string, unknown>[], count: count ?? 0 };
}

export async function getPyqs(filters: PyqFilters): Promise<{
  items: PyqWithMeta[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20));

  // Fetch enough rows from each side to slice the merged page.
  const fetchLimit = page * pageSize;

  const types: ("prelims" | "mains")[] =
    filters.stage === "prelims"
      ? ["prelims"]
      : filters.stage === "mains"
        ? ["mains"]
        : ["prelims", "mains"];

  const results = await Promise.all(
    types.map((t) => queryQuestions(t, filters, fetchLimit))
  );

  const merged: PyqWithMeta[] = [];
  results.forEach((res, i) => {
    const type = types[i];
    for (const row of res.rows) {
      const mt = row.microtheme as PyqWithMeta["microtheme"] | null;
      if (!mt) continue;
      merged.push({
        question: { ...(row as object), type } as PyqWithMeta["question"],
        microtheme: mt,
        tags: [],
      });
    }
  });

  merged.sort((a, b) => {
    const ya = (a.question as { year: number }).year;
    const yb = (b.question as { year: number }).year;
    if (yb !== ya) return yb - ya;
    return (b.question.created_at ?? "").localeCompare(a.question.created_at ?? "");
  });

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  // Attach tags for the visible page only.
  await attachTags(items);

  return { items, total, page, pageSize };
}

async function attachTags(items: PyqWithMeta[]) {
  if (items.length === 0) return;
  const supabase = await createClient();
  const ids = items.map((i) => i.question.id);
  const { data } = await supabase
    .from("question_tags")
    .select("question_id, question_type, tag:tags (name)")
    .in("question_id", ids);
  const byKey = new Map<string, string[]>();
  for (const row of data ?? []) {
    const key = `${row.question_type}:${row.question_id}`;
    const name = (row.tag as unknown as { name: string } | null)?.name;
    if (!name) continue;
    byKey.set(key, [...(byKey.get(key) ?? []), name]);
  }
  for (const item of items) {
    item.tags = byKey.get(`${item.question.type}:${item.question.id}`) ?? [];
  }
}

// Filter dropdown option sources for the vault.
export async function getPyqFilterOptions() {
  const supabase = await createClient();
  const [papersRes, yearsPrelims, yearsMains, tagsRes, subjectsRes] =
    await Promise.all([
      supabase.from("prelims_questions").select("paper_label").limit(1000),
      supabase.from("prelims_questions").select("year").limit(1000),
      supabase.from("mains_questions").select("year").limit(1000),
      supabase.from("tags").select("name").order("name").limit(500),
      supabase
        .from("subjects")
        .select("id, name, topics (id, name, microthemes (id, name, code))")
        .order("sort_order")
        .order("sort_order", { referencedTable: "topics" })
        .order("sort_order", { referencedTable: "topics.microthemes" }),
    ]);

  const mainsLabels = await supabase
    .from("mains_questions")
    .select("paper_label")
    .limit(1000);

  const paperLabels = [
    ...new Set(
      [...(papersRes.data ?? []), ...(mainsLabels.data ?? [])].map(
        (r) => r.paper_label
      )
    ),
  ].sort();

  const years = [
    ...new Set(
      [...(yearsPrelims.data ?? []), ...(yearsMains.data ?? [])].map((r) => r.year)
    ),
  ].sort((a, b) => b - a);

  return {
    paperLabels,
    years,
    tags: (tagsRes.data ?? []).map((t) => t.name),
    subjects: (subjectsRes.data ?? []) as unknown as {
      id: string;
      name: string;
      topics: {
        id: string;
        name: string;
        microthemes: { id: string; name: string; code: string }[];
      }[];
    }[],
  };
}

// ---------------- Global search ----------------

export interface SearchResult {
  result_type: "note" | "glossary" | "prelims" | "mains";
  id: string;
  microtheme_id: string;
  microtheme_slug: string;
  microtheme_name: string;
  title: string;
  snippet: string;
  rank: number;
}

export async function globalSearch(q: string): Promise<SearchResult[]> {
  if (!q.trim()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("global_search", { q: q.trim() });
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchResult[];
}
