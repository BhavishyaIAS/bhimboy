"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";
import { buildMicrothemeCode, slugify } from "@/lib/slug";

const LEVELS = ["paper", "subject", "topic", "microtheme"] as const;
type Level = (typeof LEVELS)[number];

const TABLE: Record<Level, string> = {
  paper: "papers",
  subject: "subjects",
  topic: "topics",
  microtheme: "microthemes",
};

const PARENT_COLUMN: Record<Exclude<Level, "paper">, string> = {
  subject: "paper_id",
  topic: "subject_id",
  microtheme: "topic_id",
};

const nameSchema = z.string().trim().min(1, "Name is required").max(200);
const uuidSchema = z.string().uuid();
const levelSchema = z.enum(LEVELS);

function revalidateSyllabus() {
  revalidatePath("/admin/syllabus");
  revalidatePath("/app/syllabus");
  revalidatePath("/app/syllabus/appsc");
  revalidatePath("/app/syllabus/upsc");
  revalidatePath("/app", "layout");
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof getAdminClient>>["supabase"],
  table: string,
  parentColumn: string | null,
  parentId: string | null
) {
  let query = supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (parentColumn && parentId) query = query.eq(parentColumn, parentId);
  const { data } = await query;
  return (data?.[0]?.sort_order ?? 0) + 1;
}

export async function createPaper(input: {
  name: string;
  stage: "prelims" | "mains";
  exam?: "appsc" | "upsc";
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const name = nameSchema.parse(input.name);
    const stage = z.enum(["prelims", "mains"]).parse(input.stage);
    const exam = z.enum(["appsc", "upsc"]).parse(input.exam ?? "appsc");
    const sort_order = await nextSortOrder(supabase, "papers", null, null);
    const { data, error } = await supabase
      .from("papers")
      .insert({ name, stage, exam, sort_order })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateSyllabus();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return toError(e);
  }
}

export async function createNode(input: {
  level: "subject" | "topic";
  parentId: string;
  name: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const level = z.enum(["subject", "topic"]).parse(input.level);
    const parentId = uuidSchema.parse(input.parentId);
    const name = nameSchema.parse(input.name);
    const table = TABLE[level];
    const parentColumn = PARENT_COLUMN[level];
    const sort_order = await nextSortOrder(supabase, table, parentColumn, parentId);
    const { data, error } = await supabase
      .from(table)
      .insert({ name, [parentColumn]: parentId, sort_order })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidateSyllabus();
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return toError(e);
  }
}

export async function createMicrotheme(input: {
  topicId: string;
  name: string;
}): Promise<ActionResult<{ id: string; code: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const topicId = uuidSchema.parse(input.topicId);
    const name = nameSchema.parse(input.name);

    // Derive code prefix from subject + topic names.
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .select("name, subject:subjects(name)")
      .eq("id", topicId)
      .single();
    if (topicError || !topic) throw new Error("Topic not found");
    const subjectName =
      (topic.subject as unknown as { name: string } | null)?.name ?? "GEN";

    const sort_order = await nextSortOrder(
      supabase,
      "microthemes",
      "topic_id",
      topicId
    );

    // Find a free code and slug (retry on the rare collision).
    const baseSlug = slugify(name);
    let inserted: { id: string; code: string } | null = null;
    let lastError = "";
    for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
      const code = buildMicrothemeCode(
        subjectName,
        topic.name,
        sort_order + attempt
      );
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const { data, error } = await supabase
        .from("microthemes")
        .insert({ topic_id: topicId, name, code, slug, sort_order })
        .select("id, code")
        .single();
      if (!error && data) {
        inserted = data;
      } else if (error && error.code === "23505") {
        lastError = error.message; // unique violation — try next candidate
      } else if (error) {
        throw new Error(error.message);
      }
    }
    if (!inserted) {
      throw new Error(
        `Could not generate a unique code/slug (${lastError}). Edit the code manually.`
      );
    }
    revalidateSyllabus();
    return { ok: true, data: inserted };
  } catch (e) {
    return toError(e);
  }
}

export async function renameNode(input: {
  level: Level;
  id: string;
  name: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const level = levelSchema.parse(input.level);
    const id = uuidSchema.parse(input.id);
    const name = nameSchema.parse(input.name);
    const { error } = await supabase
      .from(TABLE[level])
      .update({ name })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidateSyllabus();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function updateMicrothemeCode(input: {
  id: string;
  code: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    const code = z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9-]+$/, "Code may contain only letters, numbers and dashes")
      .parse(input.code)
      .toUpperCase();
    const { error } = await supabase
      .from("microthemes")
      .update({ code })
      .eq("id", id);
    if (error) {
      throw new Error(
        error.code === "23505" ? `Code "${code}" is already in use` : error.message
      );
    }
    revalidateSyllabus();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function setNodeStatus(input: {
  level: "subject" | "topic" | "microtheme";
  id: string;
  status: "draft" | "published";
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const level = z.enum(["subject", "topic", "microtheme"]).parse(input.level);
    const id = uuidSchema.parse(input.id);
    const status = z.enum(["draft", "published"]).parse(input.status);
    const { error } = await supabase
      .from(TABLE[level])
      .update({ status })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidateSyllabus();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteNode(input: {
  level: Level;
  id: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const level = levelSchema.parse(input.level);
    const id = uuidSchema.parse(input.id);
    const { error } = await supabase.from(TABLE[level]).delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidateSyllabus();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

// Persist a new ordering of sibling ids after drag-and-drop.
export async function reorderNodes(input: {
  level: Level;
  orderedIds: string[];
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const level = levelSchema.parse(input.level);
    const orderedIds = z.array(uuidSchema).min(1).max(500).parse(input.orderedIds);
    // Sequential updates; sibling lists are small (tens of rows).
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from(TABLE[level])
        .update({ sort_order: i + 1 })
        .eq("id", orderedIds[i]);
      if (error) throw new Error(error.message);
    }
    revalidateSyllabus();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
