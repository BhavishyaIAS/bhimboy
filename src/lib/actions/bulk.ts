"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminClient, toError, type ActionResult } from "./helpers";
import {
  MAINS_COLUMNS,
  PRELIMS_COLUMNS,
  mainsRowSchema,
  normalizeRow,
  prelimsRowSchema,
  type RowValidation,
} from "@/lib/bulk/schemas";
import { plainTextToTipTap } from "@/lib/tiptap-text";

const typeSchema = z.enum(["prelims", "mains"]);

export interface BulkPreview {
  rows: RowValidation[];
  validCount: number;
  invalidCount: number;
}

// Validate raw parsed rows (client parses the xlsx with SheetJS and sends
// plain JSON here). Checks schema + micro-theme code existence.
export async function validateBulkRows(input: {
  type: "prelims" | "mains";
  rows: Record<string, unknown>[];
}): Promise<ActionResult<BulkPreview>> {
  try {
    const { supabase } = await getAdminClient();
    const type = typeSchema.parse(input.type);
    const rawRows = z.array(z.record(z.string(), z.unknown())).max(2000).parse(input.rows);
    const columns = type === "prelims" ? PRELIMS_COLUMNS : MAINS_COLUMNS;
    const schema = type === "prelims" ? prelimsRowSchema : mainsRowSchema;

    const normalized = rawRows.map((r) => normalizeRow(r, columns));

    // Resolve all referenced codes in one query.
    const codes = [...new Set(normalized.map((r) => r.microtheme_code).filter(Boolean))];
    const knownCodes = new Set<string>();
    if (codes.length > 0) {
      const { data, error } = await supabase
        .from("microthemes")
        .select("code")
        .in("code", codes);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) knownCodes.add(row.code);
    }

    const rows: RowValidation[] = normalized.map((raw, i) => {
      const errors: string[] = [];
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errors.push(issue.message);
      }
      if (raw.microtheme_code && !knownCodes.has(raw.microtheme_code)) {
        errors.push(
          `Unknown micro-theme code "${raw.microtheme_code}" — check the Syllabus Manager for the exact code`
        );
      }
      return { rowNumber: i + 2, raw, errors };
    });

    const validCount = rows.filter((r) => r.errors.length === 0).length;
    return {
      ok: true,
      data: { rows, validCount, invalidCount: rows.length - validCount },
    };
  } catch (e) {
    return toError(e);
  }
}

// Commit previously validated rows. Re-validates server-side, inserts all
// valid rows atomically via the bulk_insert_* RPC, and logs the upload.
export async function commitBulkUpload(input: {
  type: "prelims" | "mains";
  filename: string;
  rows: Record<string, unknown>[];
}): Promise<ActionResult<{ inserted: number; failed: number }>> {
  try {
    const { supabase, userId } = await getAdminClient();
    const type = typeSchema.parse(input.type);
    const filename = z.string().trim().min(1).max(300).parse(input.filename);

    const validation = await validateBulkRows({ type, rows: input.rows });
    if (!validation.ok) return validation;
    const { rows, invalidCount } = validation.data!;

    const validRows = rows.filter((r) => r.errors.length === 0);
    const failedRows = rows.filter((r) => r.errors.length > 0);

    let inserted = 0;
    if (validRows.length > 0) {
      const schema = type === "prelims" ? prelimsRowSchema : mainsRowSchema;
      const payload = validRows.map((r) => {
        const v = schema.parse(r.raw) as Record<string, unknown>;
        if (type === "mains") {
          const text = (v.model_answer as string) ?? "";
          v.model_answer = text ? plainTextToTipTap(text) : null;
          v.model_answer_text = text;
        }
        return v;
      });

      const fn = type === "prelims" ? "bulk_insert_prelims" : "bulk_insert_mains";
      const { data, error } = await supabase.rpc(fn, { p_rows: payload });
      if (error) throw new Error(`Nothing was inserted — ${error.message}`);
      inserted = (data as number) ?? validRows.length;
    }

    const { error: logError } = await supabase.from("bulk_upload_logs").insert({
      filename,
      type,
      rows_total: rows.length,
      rows_inserted: inserted,
      rows_failed: failedRows.length,
      error_report:
        failedRows.length > 0
          ? failedRows.map((r) => ({
              row: r.rowNumber,
              errors: r.errors,
              data: r.raw,
            }))
          : null,
      uploaded_by: userId,
    });
    if (logError) {
      // The insert succeeded; a failed log entry shouldn't fail the upload.
      console.error("bulk_upload_logs insert failed:", logError.message);
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/app/pyqs");
    return {
      ok: true,
      data: { inserted, failed: invalidCount },
    };
  } catch (e) {
    return toError(e);
  }
}
