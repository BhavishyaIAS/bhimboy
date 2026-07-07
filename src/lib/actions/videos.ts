"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";
import { isValidYouTubeUrl } from "@/lib/youtube";

const uuidSchema = z.string().uuid();

export async function addVideo(input: {
  microthemeId: string;
  youtubeUrl: string;
  title: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const microthemeId = uuidSchema.parse(input.microthemeId);
    const youtubeUrl = z.string().trim().url().parse(input.youtubeUrl);
    const title = z.string().trim().max(300).parse(input.title ?? "");
    if (!isValidYouTubeUrl(youtubeUrl)) {
      throw new Error("That doesn't look like a YouTube video URL");
    }

    const { data: last } = await supabase
      .from("videos")
      .select("sort_order")
      .eq("microtheme_id", microthemeId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sort_order = (last?.[0]?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("videos")
      .insert({ microtheme_id: microthemeId, youtube_url: youtubeUrl, title, sort_order })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return toError(e);
  }
}

export async function updateVideo(input: {
  id: string;
  youtubeUrl: string;
  title: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    const youtubeUrl = z.string().trim().url().parse(input.youtubeUrl);
    const title = z.string().trim().max(300).parse(input.title ?? "");
    if (!isValidYouTubeUrl(youtubeUrl)) {
      throw new Error("That doesn't look like a YouTube video URL");
    }
    const { error } = await supabase
      .from("videos")
      .update({ youtube_url: youtubeUrl, title })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteVideo(input: { id: string }): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function reorderVideos(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const orderedIds = z.array(uuidSchema).min(1).max(100).parse(input.orderedIds);
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("videos")
        .update({ sort_order: i + 1 })
        .eq("id", orderedIds[i]);
      if (error) throw new Error(error.message);
    }
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}
