"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";

const uuidSchema = z.string().uuid();
const termSchema = z.string().trim().min(1, "Term is required").max(200);
const definitionSchema = z.string().trim().min(1, "Definition is required").max(2000);

export async function addGlossaryTerm(input: {
  microthemeId: string;
  term: string;
  definition: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase } = await getAdminClient();
    const microthemeId = uuidSchema.parse(input.microthemeId);
    const term = termSchema.parse(input.term);
    const definition = definitionSchema.parse(input.definition);

    const { data: last } = await supabase
      .from("glossary_terms")
      .select("sort_order")
      .eq("microtheme_id", microthemeId)
      .order("sort_order", { ascending: false })
      .limit(1);
    const sort_order = (last?.[0]?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
      .from("glossary_terms")
      .insert({ microtheme_id: microthemeId, term, definition, sort_order })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return toError(e);
  }
}

export async function updateGlossaryTerm(input: {
  id: string;
  term: string;
  definition: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    const term = termSchema.parse(input.term);
    const definition = definitionSchema.parse(input.definition);
    const { error } = await supabase
      .from("glossary_terms")
      .update({ term, definition })
      .eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function deleteGlossaryTerm(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const id = uuidSchema.parse(input.id);
    const { error } = await supabase.from("glossary_terms").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return toError(e);
  }
}

export async function reorderGlossaryTerms(input: {
  orderedIds: string[];
}): Promise<ActionResult> {
  try {
    const { supabase } = await getAdminClient();
    const orderedIds = z.array(uuidSchema).min(1).max(200).parse(input.orderedIds);
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("glossary_terms")
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
