"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DragHandle, SortableList } from "@/components/admin/sortable-list";
import {
  addGlossaryTerm,
  deleteGlossaryTerm,
  reorderGlossaryTerms,
  updateGlossaryTerm,
} from "@/lib/actions/glossary";
import type { GlossaryTerm } from "@/lib/database.types";

export function GlossaryTab({
  microthemeId,
  terms,
}: {
  microthemeId: string;
  terms: GlossaryTerm[];
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = editingId
        ? await updateGlossaryTerm({ id: editingId, term, definition })
        : await addGlossaryTerm({ microthemeId, term, definition });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Term updated" : "Term added");
      setTerm("");
      setDefinition("");
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">
          {editingId ? "Edit term" : "Add a key term"}
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="glossary-term">Term / keyword</Label>
            <Input
              id="glossary-term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g. Gram Sabha"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="glossary-definition">Short definition</Label>
            <Textarea
              id="glossary-definition"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={3}
              placeholder="One or two sentences a student can revise from."
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={submit}
            disabled={pending || !term.trim() || !definition.trim()}
          >
            <Plus className="h-4 w-4" />
            {pending ? "Saving…" : editingId ? "Save changes" : "Add term"}
          </Button>
          {editingId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setTerm("");
                setDefinition("");
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {terms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No glossary terms yet — add the key concepts students must remember.
        </p>
      ) : (
        <SortableList
          items={terms}
          className="space-y-2"
          onReorder={(ids) => {
            void reorderGlossaryTerms({ orderedIds: ids }).then(() =>
              router.refresh()
            );
          }}
          renderItem={(g, drag) => (
            <div className="flex gap-2 rounded-lg border p-3">
              <DragHandle
                attributes={drag.handleAttributes}
                listeners={drag.handleListeners}
                className="mt-0.5 self-start"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.term}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {g.definition}
                </p>
              </div>
              <div className="flex gap-1 self-start">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Edit"
                  onClick={() => {
                    setEditingId(g.id);
                    setTerm(g.term);
                    setDefinition(g.definition);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Delete"
                  onClick={() => {
                    if (!window.confirm(`Delete "${g.term}"?`)) return;
                    void deleteGlossaryTerm({ id: g.id }).then((r) => {
                      if (!r.ok) toast.error(r.error);
                      router.refresh();
                    });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
