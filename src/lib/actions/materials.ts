"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";

const uuid = z.string().uuid();
const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => (v ? v : null));

const createSchema = z.object({
  category: z.enum(["comprehensive", "prelims", "mains"]),
  title: z.string().trim().min(1, "Title is required").max(300),
  description: z.string().trim().max(2000).optional().default(""),
  filePath: z.string().trim().min(1, "Missing file"),
  fileName: z.string().trim().max(300).optional().default(""),
  fileSize: z.number().int().nonnegative().optional().default(0),
  mimeType: z.string().trim().max(200).optional().default(""),
  paperId: nullableUuid,
  subjectId: nullableUuid,
  topicId: nullableUuid,
  microthemeId: nullableUuid,
});

export async function createMaterial(
  input: z.input<typeof createSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, userId } = await getAdminClient();
    const v = createSchema.parse(input);

    const { data, error } = await supabase
      .from("materials")
      .insert({
        category: v.category,
        title: v.title,
        description: v.description,
        file_path: v.filePath,
        file_name: v.fileName,
        file_size: v.fileSize,
        mime_type: v.mimeType,
        paper_id: v.paperId,
        subject_id: v.subjectId,
        topic_id: v.topicId,
        microtheme_id: v.microthemeId,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    revalidatePath("/admin/material");
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return toError(e);
  }
}

export async function setMaterialStatus(input: {
  id: string;
  status: "draft" | "published";
}): Promise<ActionResult<{ publishedAt: string | null }>> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuid.parse(input.id);
    const status = z.enum(["draft", "published"]).parse(input.status);
    const publishedAt = status === "published" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("materials")
      .update({ status, published_at: publishedAt })
      .eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/material");
    revalidatePath("/app", "layout");
    return { ok: true, data: { publishedAt } };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteMaterial(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuid.parse(input.id);

    const { data: row } = await supabase
      .from("materials")
      .select("file_path")
      .eq("id", id)
      .maybeSingle();

    // Remove the stored object first (best-effort), then the metadata row.
    if (row?.file_path) {
      await supabase.storage.from("materials").remove([row.file_path]);
    }
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/material");
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
