"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { saveNote, setNoteStatus } from "@/lib/actions/notes";
import { EMPTY_DOC } from "@/lib/tiptap-text";

const AUTOSAVE_MS = 10_000;

type SaveState = "saved" | "dirty" | "saving" | "error";

export function NotesTab({
  microthemeId,
  initialContent,
  initialStatus,
  initialPublishedAt,
}: {
  microthemeId: string;
  initialContent: unknown | null;
  initialStatus: "draft" | "published" | null;
  initialPublishedAt: string | null;
}) {
  const docRef = useRef<unknown>(initialContent ?? EMPTY_DOC);
  const dirtyRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [status, setStatus] = useState<"draft" | "published">(
    initialStatus ?? "draft"
  );
  const [publishedAt, setPublishedAt] = useState<string | null>(
    initialPublishedAt
  );
  const [publishPending, startPublish] = useTransition();

  async function flush(): Promise<boolean> {
    if (!dirtyRef.current) return true;
    dirtyRef.current = false;
    setSaveState("saving");
    const result = await saveNote({
      microthemeId,
      content: docRef.current,
    });
    if (result.ok) {
      setSaveState(dirtyRef.current ? "dirty" : "saved");
      return true;
    }
    dirtyRef.current = true;
    setSaveState("error");
    return false;
  }

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      void flushRef.current();
    }, AUTOSAVE_MS);

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        void flushRef.current();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      void flushRef.current();
    };
  }, []);

  function handlePublishToggle() {
    startPublish(async () => {
      const saved = await flush();
      if (!saved) {
        toast.error("Couldn't save the latest changes — publish cancelled");
        return;
      }
      const nextStatus = status === "published" ? "draft" : "published";
      const result = await setNoteStatus({ microthemeId, status: nextStatus });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStatus(nextStatus);
      setPublishedAt(result.data?.publishedAt ?? null);
      toast.success(
        nextStatus === "published"
          ? "Notes published — students can now see them"
          : "Notes moved back to draft"
      );
    });
  }

  const indicator: Record<SaveState, React.ReactNode> = {
    saved: (
      <span className="flex items-center gap-1 text-foreground">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    ),
    dirty: (
      <span className="flex items-center gap-1 text-muted-foreground">
        <CloudUpload className="h-3.5 w-3.5" /> Unsaved changes…
      </span>
    ),
    saving: (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    ),
    error: (
      <span className="flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> Save failed — retrying
      </span>
    ),
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-xs">{indicator[saveState]}</div>
        <div className="ml-auto flex items-center gap-2">
          {status === "published" && publishedAt && (
            <span className="text-xs text-muted-foreground">
              Published {new Date(publishedAt).toLocaleString()}
            </span>
          )}
          <Badge variant={status === "published" ? "success" : "warning"}>
            {status}
          </Badge>
          <Button
            size="sm"
            variant={status === "published" ? "outline" : "default"}
            onClick={handlePublishToggle}
            disabled={publishPending}
          >
            {publishPending
              ? "Working…"
              : status === "published"
                ? "Unpublish"
                : "Publish notes"}
          </Button>
        </div>
      </div>

      <TipTapEditor
        initialContent={initialContent ?? EMPTY_DOC}
        imagePathPrefix={`notes/${microthemeId}`}
        placeholder="Write the detailed notes for this micro-theme — headings, tables, images and diagrams all work here."
        onUpdate={(json) => {
          docRef.current = json;
          dirtyRef.current = true;
          setSaveState("dirty");
        }}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Autosaves every 10 seconds while you type. Publishing makes the notes
        visible to students (the micro-theme itself must also be published).
      </p>
    </div>
  );
}
