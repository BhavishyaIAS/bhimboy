import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BulkUploadClient } from "@/components/admin/bulk/bulk-upload-client";
import type { BulkUploadLog } from "@/lib/database.types";

export const metadata: Metadata = { title: "Bulk Upload" };
export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("bulk_upload_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Bulk Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Import prelims or mains PYQs from an Excel file. You&apos;ll see a
          full validation preview before anything is saved.
        </p>
      </div>

      <BulkUploadClient />

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Upload history
        </h2>
        {(logs ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No uploads yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(logs as BulkUploadLog[]).map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
              >
                <span className="font-medium">{log.filename}</span>
                <Badge variant="outline" className="capitalize">
                  {log.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
                <span className="ml-auto flex gap-1.5">
                  <Badge variant="success">{log.rows_inserted} imported</Badge>
                  {log.rows_failed > 0 && (
                    <Badge variant="destructive">{log.rows_failed} failed</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
