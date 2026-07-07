"use client";

// Quick add/edit forms for prelims and mains questions. The inner form
// mounts fresh each time the dialog opens (Radix unmounts closed content),
// so field state initializes straight from the `editing` prop.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { savePrelimsQuestion, saveMainsQuestion } from "@/lib/actions/pyqs";
import type { CorrectOption } from "@/lib/database.types";

export interface MicrothemeOption {
  id: string;
  name: string;
  code: string;
}

export interface EditableQuestion {
  id: string;
  type: "prelims" | "mains";
  microtheme_id: string;
  year: number;
  paper_label: string;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_option?: string;
  explanation?: string | null;
  directive_word?: string | null;
  marks?: number | null;
  keywords: string[];
  status: "draft" | "published";
  tags: string[];
}

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function QuestionFormDialog({
  type,
  microthemes,
  editing,
  open,
  onOpenChange,
}: {
  type: "prelims" | "mains";
  microthemes: MicrothemeOption[];
  editing: EditableQuestion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit" : "Add"} {type === "prelims" ? "prelims" : "mains"}{" "}
            question
          </DialogTitle>
        </DialogHeader>
        <QuestionForm
          key={editing?.id ?? "new"}
          type={type}
          microthemes={microthemes}
          editing={editing}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuestionForm({
  type,
  microthemes,
  editing,
  onDone,
}: {
  type: "prelims" | "mains";
  microthemes: MicrothemeOption[];
  editing: EditableQuestion | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [microthemeId, setMicrothemeId] = useState(editing?.microtheme_id ?? "");
  const [year, setYear] = useState(editing ? String(editing.year) : "");
  const [paperLabel, setPaperLabel] = useState(editing?.paper_label ?? "");
  const [questionText, setQuestionText] = useState(editing?.question_text ?? "");
  const [optionA, setOptionA] = useState(editing?.option_a ?? "");
  const [optionB, setOptionB] = useState(editing?.option_b ?? "");
  const [optionC, setOptionC] = useState(editing?.option_c ?? "");
  const [optionD, setOptionD] = useState(editing?.option_d ?? "");
  const [correctOption, setCorrectOption] = useState<CorrectOption>(
    (editing?.correct_option as CorrectOption) ?? "A"
  );
  const [explanation, setExplanation] = useState(editing?.explanation ?? "");
  const [directiveWord, setDirectiveWord] = useState(editing?.directive_word ?? "");
  const [marks, setMarks] = useState(
    editing?.marks != null ? String(editing.marks) : ""
  );
  const [tags, setTags] = useState(editing?.tags.join(", ") ?? "");
  const [keywords, setKeywords] = useState(editing?.keywords.join(", ") ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    editing?.status ?? "draft"
  );

  function submit() {
    startTransition(async () => {
      const base = {
        microthemeId,
        year,
        paperLabel,
        questionText,
        tags: splitList(tags),
        keywords: splitList(keywords),
        status,
      };
      const result =
        type === "prelims"
          ? await savePrelimsQuestion({
              id: editing?.id,
              values: {
                ...base,
                optionA,
                optionB,
                optionC,
                optionD,
                correctOption,
                explanation,
              },
            })
          : await saveMainsQuestion({
              id: editing?.id,
              values: {
                ...base,
                directiveWord,
                marks: marks === "" ? null : Number(marks),
              },
            });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Question updated" : "Question added");
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3.5">
      <div className="space-y-1.5">
        <Label>Micro-theme</Label>
        <Select value={microthemeId} onValueChange={setMicrothemeId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a micro-theme…" />
          </SelectTrigger>
          <SelectContent>
            {microthemes.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.code} — {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="q-year">Year</Label>
          <Input
            id="q-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2019"
            inputMode="numeric"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-paper">Paper label</Label>
          <Input
            id="q-paper"
            value={paperLabel}
            onChange={(e) => setPaperLabel(e.target.value)}
            placeholder={type === "prelims" ? "Prelims Paper 1" : "Mains Paper 3"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="q-text">Question text</Label>
        <Textarea
          id="q-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={3}
        />
      </div>

      {type === "prelims" ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ["A", optionA, setOptionA],
                ["B", optionB, setOptionB],
                ["C", optionC, setOptionC],
                ["D", optionD, setOptionD],
              ] as const
            ).map(([key, value, setter]) => (
              <div key={key} className="space-y-1.5">
                <Label>Option {key}</Label>
                <Input value={value} onChange={(e) => setter(e.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Correct option</Label>
              <Select
                value={correctOption}
                onValueChange={(v) => setCorrectOption(v as CorrectOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["A", "B", "C", "D"] as const).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as "draft" | "published")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-explanation">
              Explanation (shown after answering)
            </Label>
            <Textarea
              id="q-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="q-directive">Directive word</Label>
            <Input
              id="q-directive"
              value={directiveWord}
              onChange={(e) => setDirectiveWord(e.target.value)}
              placeholder="critically examine"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-marks">Marks</Label>
            <Input
              id="q-marks"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="15"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "draft" | "published")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="q-tags">Tags (comma-separated)</Label>
          <Input
            id="q-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="panchayati raj, amendments"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="q-keywords">Keywords (comma-separated)</Label>
          <Input
            id="q-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="73rd amendment, gram sabha"
          />
        </div>
      </div>

      {type === "mains" && (
        <p className="text-xs text-muted-foreground">
          Save the question first — then use “Model answer” in the table to
          write the rich-text model answer.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add question"}
        </Button>
      </div>
    </div>
  );
}
