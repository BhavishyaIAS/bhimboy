// Upserts a built note (and its glossary terms) into Supabase for a
// micro-theme identified by code. Optionally publishes the micro-theme's
// whole parent chain so students can see it immediately.
import { buildNoteDoc, extractText } from "./note-builder.mjs";

export async function uploadNote(supabase, spec, { publish = false } = {}) {
  const { data: mt, error: mtErr } = await supabase
    .from("microthemes")
    .select("id, name, topic_id, topic:topics (id, subject_id, subject:subjects (id))")
    .eq("code", spec.code)
    .maybeSingle();
  if (mtErr) throw new Error(`${spec.code}: ${mtErr.message}`);
  if (!mt) throw new Error(`${spec.code}: micro-theme not found`);

  const doc = buildNoteDoc(spec);
  const content_text = extractText(doc);

  const { error: noteErr } = await supabase.from("notes").upsert(
    {
      microtheme_id: mt.id,
      content: doc,
      content_text,
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    },
    { onConflict: "microtheme_id" }
  );
  if (noteErr) throw new Error(`${spec.code} note: ${noteErr.message}`);

  // Glossary: only add terms when the micro-theme has none yet (never
  // clobber admin-curated terms).
  if (spec.glossary?.length) {
    const { count } = await supabase
      .from("glossary_terms")
      .select("id", { count: "exact", head: true })
      .eq("microtheme_id", mt.id);
    if ((count ?? 0) === 0) {
      const { error: gErr } = await supabase.from("glossary_terms").insert(
        spec.glossary.map((g, i) => ({
          microtheme_id: mt.id,
          term: g.term,
          definition: g.definition,
          sort_order: i + 1,
          status: "published",
        }))
      );
      if (gErr) throw new Error(`${spec.code} glossary: ${gErr.message}`);
    }
  }

  if (publish) {
    const topic = mt.topic;
    await supabase.from("microthemes").update({ status: "published" }).eq("id", mt.id);
    if (topic?.id) {
      await supabase.from("topics").update({ status: "published" }).eq("id", topic.id);
    }
    if (topic?.subject?.id) {
      await supabase
        .from("subjects")
        .update({ status: "published" })
        .eq("id", topic.subject.id);
    }
  }

  return { code: spec.code, name: mt.name, published: publish };
}
