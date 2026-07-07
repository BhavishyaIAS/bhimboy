"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { saveModelAnswer } from "@/lib/actions/pyqs";
import { EMPTY_DOC } from "@/lib/tiptap-text";

export function ModelAnswerDialog({
  questionId,
  questionText,
  initialAnswer,
  open,
  onOpenChange,
}: {
  questionId: string;
  questionText: string;
  initialAnswer: unknown | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<unknown>(initialAnswer ?? EMPTY_DOC);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveModelAnswer({ id: questionId, modelAnswer: doc });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Model answer saved");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Model answer</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {questionText}
          </DialogDescription>
        </DialogHeader>
        <TipTapEditor
          initialContent={initialAnswer ?? EMPTY_DOC}
          onUpdate={setDoc}
          imagePathPrefix={`model-answers/${questionId}`}
          placeholder="Write the model answer — structure it the way you'd want a topper to."
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save model answer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
