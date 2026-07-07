"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";
import { extractText } from "@/lib/tiptap-text";

const uuidSchema = z.string().uuid();

const prelimsSchema = z.object({
  microthemeId: uuidSchema,
  year: z.coerce.number().int().min(1950).max(2100),
  paperLabel: z.string().trim().min(1, "Paper label is required").max(120),
  questionText: z.string().trim().min(1, "Question text is required"),
  optionA: z.string().trim().min(1, "Option A is required"),
  optionB: z.string().trim().min(1, "Option B is required"),
  optionC: z.string().trim().min(1, "Option C is required"),
  optionD: z.string().trim().min(1, "Option D is required"),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().max(8000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

const mainsSchema = z.object({
  microthemeId: uuidSchema,
  year: z.coerce.number().int().min(1950).max(2100),
  paperLabel: z.string().trim().min(1, "Paper label is required").max(120),
  questionText: z.string().trim().min(1, "Question text is required"),
  directiveWord: z.string().trim().max(80).optional().default(""),
  marks: z.coerce.number().int().min(1).max(250).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  keywords: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
});

type Supa = Awaited<ReturnType<typeof getAdminClient>>["supabase"];

async function replaceQuestionTags(
  supabase: Supa,
  questionType: "prelims" | "mains",
  questionId: string,
  tagNames: string[]
) {
  const unique = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];

  const { error: delError } = await supabase
    .from("question_tags")
    .delete()
    .eq("question_type", questionType)
    .eq("question_id", questionId);
  if (delError) throw new Error(delError.message);

  if (unique.length === 0) return;

  const { data: tags, error: tagError } = await supabase
    .from("tags")
    .upsert(
      unique.map((name) => ({ name })),
      { onConflict: "name" }
    )
    .select("id");
  if (tagError) throw new Error(tagError.message);

  const { error: linkError } = await supabase.from("question_tags").insert(
    (tags ?? []).map((t) => ({
      tag_id: t.id,
      question_type: questionType,
      question_id: questionId,
    }))
  );
  if (linkError) throw new Error(linkError.message);
}

function revalidatePyqs() {
  revalidatePath("/admin/pyqs");
  revalidatePath("/app/pyqs");
  revalidatePath("/app", "layout");
}

export async function savePrelimsQuestion(input: {
  id?: string;
  values: z.input<typeof prelimsSchema>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const v = prelimsSchema.parse(input.values);
    const row = {
      microtheme_id: v.microthemeId,
      year: v.year,
      paper_label: v.paperLabel,
      question_text: v.questionText,
      option_a: v.optionA,
      option_b: v.optionB,
      option_c: v.optionC,
      option_d: v.optionD,
      correct_option: v.correctOption,
      explanation: v.explanation || null,
      keywords: v.keywords,
      status: v.status,
    };

    let id = input.id;
    if (id) {
      uuidSchema.parse(id);
      const { error } = await supabase
        .from("prelims_questions")
        .update(row)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("prelims_questions")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = data.id;
    }

    await replaceQuestionTags(supabase, "prelims", id!, v.tags);
    revalidatePyqs();
    return { ok: true, data: { id: id! } };
  } catch (e) {
    return toError(e);
  }
}

export async function saveMainsQuestion(input: {
  id?: string;
  values: z.input<typeof mainsSchema>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const v = mainsSchema.parse(input.values);
    const row = {
      microtheme_id: v.microthemeId,
      year: v.year,
      paper_label: v.paperLabel,
      question_text: v.questionText,
      directive_word: v.directiveWord || null,
      marks: v.marks ?? null,
      keywords: v.keywords,
      status: v.status,
    };

    let id = input.id;
    if (id) {
      uuidSchema.parse(id);
      const { error } = await supabase
        .from("mains_questions")
        .update(row)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await supabase
        .from("mains_questions")
        .insert(row)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = data.id;
    }

    await replaceQuestionTags(supabase, "mains", id!, v.tags);
    revalidatePyqs();
    return { ok: true, data: { id: id! } };
  } catch (e) {
    return toError(e);
  }
}

export async function saveModelAnswer(input: {
  id: string;
  modelAnswer: unknown;
}): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    if (!input.modelAnswer || typeof input.modelAnswer !== "object") {
      throw new Error("Invalid model answer content");
    }
    const model_answer_text = extractText(input.modelAnswer);
    const { error } = await supabase
      .from("mains_questions")
      .update({ model_answer: input.modelAnswer, model_answer_text })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePyqs();
    return { ok: true, data: { savedAt: new Date().toISOString() } };
  } catch (e) {
    return toError(e);
  }
}

export async function setQuestionStatus(input: {
  type: "prelims" | "mains";
  id: string;
  status: "draft" | "published";
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const type = z.enum(["prelims", "mains"]).parse(input.type);
    const id = uuidSchema.parse(input.id);
    const status = z.enum(["draft", "published"]).parse(input.status);
    const table = type === "prelims" ? "prelims_questions" : "mains_questions";
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePyqs();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteQuestion(input: {
  type: "prelims" | "mains";
  id: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const type = z.enum(["prelims", "mains"]).parse(input.type);
    const id = uuidSchema.parse(input.id);
    const table = type === "prelims" ? "prelims_questions" : "mains_questions";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePyqs();
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
