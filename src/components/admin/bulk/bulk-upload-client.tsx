"use client";

// Bulk upload flow: choose type → download template / pick .xlsx →
// parse client-side (SheetJS) → server-side validation preview →
// commit valid rows atomically → download error report for failed rows.
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { validateBulkRows, commitBulkUpload } from "@/lib/actions/bulk";
import {
  MAINS_COLUMNS,
  PRELIMS_COLUMNS,
  SAMPLE_MAINS_ROW,
  SAMPLE_PRELIMS_ROW,
  type RowValidation,
} from "@/lib/bulk/schemas";
import { cn } from "@/lib/utils";

type UploadType = "prelims" | "mains";

interface CommitResult {
  inserted: number;
  failed: number;
}

function downloadTemplate(type: UploadType) {
  const columns = type === "prelims" ? PRELIMS_COLUMNS : MAINS_COLUMNS;
  const sample = type === "prelims" ? SAMPLE_PRELIMS_ROW : SAMPLE_MAINS_ROW;
  const ws = XLSX.utils.json_to_sheet([sample], { header: [...columns] });
  ws["!cols"] = columns.map((c) => ({
    wch: Math.max(14, Math.min(50, String(sample[c as keyof typeof sample] ?? "").length + 4)),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "questions");
  XLSX.writeFile(wb, `${type}_pyq_template.xlsx`);
}

function downloadErrorReport(type: UploadType, failed: RowValidation[]) {
  const columns = type === "prelims" ? PRELIMS_COLUMNS : MAINS_COLUMNS;
  const rows = failed.map((r) => ({
    ...Object.fromEntries(columns.map((c) => [c, r.raw[c] ?? ""])),
    errors: r.errors.join("; "),
  }));
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [...columns, "errors"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "failed rows");
  XLSX.writeFile(wb, `${type}_failed_rows.xlsx`);
}

export function BulkUploadClient() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<UploadType>("prelims");
  const [filename, setFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<RowValidation[] | null>(null);
  const [committed, setCommitted] = useState<CommitResult | null>(null);
  const [pending, startTransition] = useTransition();

  const validRows = preview?.filter((r) => r.errors.length === 0) ?? [];
  const failedRows = preview?.filter((r) => r.errors.length > 0) ?? [];

  function reset() {
    setFilename(null);
    setPreview(null);
    setCommitted(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    setCommitted(null);
    setPreview(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The file has no sheets");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });
      if (rows.length === 0) {
        throw new Error("No data rows found (row 1 must be the column headers)");
      }
      if (rows.length > 2000) {
        throw new Error("Please upload at most 2000 rows at a time");
      }
      setFilename(file.name);
      startTransition(async () => {
        const result = await validateBulkRows({ type, rows });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setPreview(result.data!.rows);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
      reset();
    }
  }

  function commit() {
    if (!filename) return;
    startTransition(async () => {
      // Only send the valid rows; failed rows stay in the browser for the
      // error report so you can fix and re-upload just those.
      const validRaw = validRows.map(
        (r) => r.raw as Record<string, unknown>
      );
      const result = await commitBulkUpload({
        type,
        filename,
        rows: validRaw,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCommitted({
        inserted: result.data!.inserted,
        failed: failedRows.length,
      });
      toast.success(`${result.data!.inserted} questions imported`);
      router.refresh();
    });
  }

  const columns = type === "prelims" ? PRELIMS_COLUMNS : MAINS_COLUMNS;
  const previewColumns = columns.slice(0, 4); // keep the table readable

  return (
    <div className="space-y-5">
      {/* Step 1: type + template */}
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">1. Choose question type</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-md border">
            {(["prelims", "mains"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  reset();
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium capitalize",
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadTemplate(type)}>
            <Download className="h-4 w-4" /> Download {type} template
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Row 1 must keep the column headers exactly as in the template. Every
          row needs a valid micro-theme code (see the Syllabus Manager).
        </p>
      </div>

      {/* Step 2: file */}
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">2. Upload your filled-in .xlsx</p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={pending}>
            <FileSpreadsheet className="h-4 w-4" />
            {filename ? "Choose a different file" : "Choose file"}
          </Button>
          {filename && (
            <span className="text-sm text-muted-foreground">{filename}</span>
          )}
        </div>
      </div>

      {/* Step 3: preview + commit */}
      {pending && !preview && (
        <p className="text-sm text-muted-foreground">Checking rows…</p>
      )}

      {preview && !committed && (
        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">3. Review before importing</p>
            <Badge variant="success">{validRows.length} valid</Badge>
            {failedRows.length > 0 && (
              <Badge variant="destructive">{failedRows.length} with errors</Badge>
            )}
          </div>

          <div className="mt-3 max-h-96 overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead className="w-14">OK?</TableHead>
                  {previewColumns.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                  <TableHead>Problems</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((r) => (
                  <TableRow
                    key={r.rowNumber}
                    className={cn(r.errors.length > 0 && "bg-destructive/5")}
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {r.rowNumber}
                    </TableCell>
                    <TableCell>
                      {r.errors.length === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </TableCell>
                    {previewColumns.map((c) => (
                      <TableCell key={c} className="max-w-52">
                        <span className="line-clamp-2 text-xs">{r.raw[c]}</span>
                      </TableCell>
                    ))}
                    <TableCell className="max-w-64">
                      {r.errors.length > 0 && (
                        <span className="text-xs text-destructive">
                          {r.errors.join("; ")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              onClick={commit}
              disabled={pending || validRows.length === 0}
            >
              <Upload className="h-4 w-4" />
              {pending
                ? "Importing…"
                : `Import ${validRows.length} valid row${validRows.length === 1 ? "" : "s"}`}
            </Button>
            {failedRows.length > 0 && (
              <Button
                variant="outline"
                onClick={() => downloadErrorReport(type, failedRows)}
              >
                <Download className="h-4 w-4" /> Download error report (
                {failedRows.length})
              </Button>
            )}
            <Button variant="ghost" onClick={reset}>
              Start over
            </Button>
          </div>
          {failedRows.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Rows with errors are skipped. Fix them in the error report file
              and upload just that file again.
            </p>
          )}
        </div>
      )}

      {committed && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
          <p className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5" /> Import finished
          </p>
          <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
            {committed.inserted} question{committed.inserted === 1 ? "" : "s"}{" "}
            imported{committed.failed > 0 && `, ${committed.failed} skipped`}.
          </p>
          <div className="mt-3 flex gap-2">
            {failedRows.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadErrorReport(type, failedRows)}
              >
                <Download className="h-4 w-4" /> Error report
              </Button>
            )}
            <Button size="sm" onClick={reset}>
              Upload another file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
