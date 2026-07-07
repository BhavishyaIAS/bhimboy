"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";
import { extractText } from "@/lib/tiptap-text";

const uuidSchema = z.string().uuid();

export async function saveNote(input: {
  microthemeId: string;
  content: unknown;
}): Promise<ActionResult<{ savedAt: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const microthemeId = uuidSchema.parse(input.microthemeId);
    if (!input.content || typeof input.content !== "object") {
      throw new Error("Invalid note content");
    }
    const content_text = extractText(input.content);

    const { error } = await supabase.from("notes").upsert(
      {
        microtheme_id: microthemeId,
        content: input.content,
        content_text,
      },
      { onConflict: "microtheme_id" }
    );
    if (error) throw new Error(error.message);
    return { ok: true, data: { savedAt: new Date().toISOString() } };
  } catch (e) {
    return toError(e);
  }
}

export async function setNoteStatus(input: {
  microthemeId: string;
  status: "draft" | "published";
}): Promise<ActionResult<{ publishedAt: string | null }>> {
  try {
    const { supabase } = await getAdminClient();
    const microthemeId = uuidSchema.parse(input.microthemeId);
    const status = z.enum(["draft", "published"]).parse(input.status);
    const publishedAt = status === "published" ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("notes")
      .update(
        status === "published"
          ? { status, published_at: publishedAt }
          : { status }
      )
      .eq("microtheme_id", microthemeId);
    if (error) throw new Error(error.message);

    revalidatePath("/app", "layout");
    revalidatePath("/admin", "layout");
    return { ok: true, data: { publishedAt } };
  } catch (e) {
    return toError(e);
  }
}
