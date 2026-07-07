"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  QuestionFormDialog,
  type EditableQuestion,
  type MicrothemeOption,
} from "./question-form-dialog";
import { ModelAnswerDialog } from "./model-answer-dialog";
import { deleteQuestion, setQuestionStatus } from "@/lib/actions/pyqs";

export interface AdminPyqRow extends EditableQuestion {
  microtheme_name: string;
  microtheme_code: string;
  model_answer?: unknown | null;
}

export function AdminPyqTable({
  rows,
  microthemes,
}: {
  rows: AdminPyqRow[];
  microthemes: MicrothemeOption[];
}) {
  const router = useRouter();
  const [formType, setFormType] = useState<"prelims" | "mains">("prelims");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EditableQuestion | null>(null);
  const [modelAnswerRow, setModelAnswerRow] = useState<AdminPyqRow | null>(null);

  function openAdd(type: "prelims" | "mains") {
    setFormType(type);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: AdminPyqRow) {
    setFormType(row.type);
    setEditing(row);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => openAdd("prelims")}>
          <Plus className="h-4 w-4" /> Add prelims question
        </Button>
        <Button size="sm" variant="secondary" onClick={() => openAdd("mains")}>
          <Plus className="h-4 w-4" /> Add mains question
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Type</TableHead>
              <TableHead className="w-16">Year</TableHead>
              <TableHead>Question</TableHead>
              <TableHead className="hidden md:table-cell">Micro-theme</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No questions match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={`${row.type}-${row.id}`}>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {row.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{row.year}</TableCell>
                <TableCell className="max-w-md">
                  <p className="line-clamp-2 text-sm">{row.question_text}</p>
                  {row.type === "mains" && row.model_answer == null && (
                    <Badge variant="warning" className="mt-1 text-[10px]">
                      no model answer
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="font-mono text-xs text-muted-foreground">
                    {row.microtheme_code}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    title="Toggle status"
                    onClick={() => {
                      void setQuestionStatus({
                        type: row.type,
                        id: row.id,
                        status:
                          row.status === "published" ? "draft" : "published",
                      }).then((r) => {
                        if (!r.ok) toast.error(r.error);
                        router.refresh();
                      });
                    }}
                  >
                    <Badge
                      variant={row.status === "published" ? "success" : "warning"}
                      className="cursor-pointer"
                    >
                      {row.status}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-0.5">
                    {row.type === "mains" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Model answer"
                        onClick={() => setModelAnswerRow(row)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => openEdit(row)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => {
                        if (!window.confirm("Delete this question permanently?"))
                          return;
                        void deleteQuestion({ type: row.type, id: row.id }).then(
                          (r) => {
                            if (!r.ok) toast.error(r.error);
                            router.refresh();
                          }
                        );
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <QuestionFormDialog
        type={formType}
        microthemes={microthemes}
        editing={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      {modelAnswerRow && (
        <ModelAnswerDialog
          key={modelAnswerRow.id}
          questionId={modelAnswerRow.id}
          questionText={modelAnswerRow.question_text}
          initialAnswer={modelAnswerRow.model_answer ?? null}
          open={!!modelAnswerRow}
          onOpenChange={(open) => {
            if (!open) setModelAnswerRow(null);
          }}
        />
      )}
    </div>
  );
}
