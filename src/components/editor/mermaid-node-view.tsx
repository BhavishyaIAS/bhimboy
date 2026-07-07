"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Code2, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MermaidDiagram } from "@/components/content/mermaid-diagram";
import { cn } from "@/lib/utils";

// Edit source ↔ rendered preview toggle for the Mermaid block.
export function MermaidNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const code = (node.attrs.code as string) ?? "";
  const [mode, setMode] = useState<"preview" | "source">("preview");
  const [draft, setDraft] = useState(code);
  const editable = editor.isEditable;

  function applyDraft() {
    if (draft !== code) updateAttributes({ code: draft });
  }

  return (
    <NodeViewWrapper
      className={cn(
        "my-4 rounded-lg border",
        selected && "ring-2 ring-blue-500/60"
      )}
      data-mermaid-node
    >
      {editable && (
        <div className="flex items-center gap-1 border-b bg-muted/50 px-2 py-1">
          <span className="mr-auto pl-1 text-xs font-medium text-muted-foreground">
            Diagram
          </span>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              applyDraft();
              setMode("preview");
            }}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
          <Button
            type="button"
            variant={mode === "source" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setDraft(code);
              setMode("source");
            }}
          >
            <Code2 className="h-3.5 w-3.5" /> Edit source
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            onClick={() => deleteNode()}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {mode === "source" && editable ? (
        <div className="space-y-2 p-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyDraft}
            rows={Math.max(6, draft.split("\n").length + 1)}
            spellCheck={false}
            className="font-mono text-xs"
            placeholder={"flowchart TD\n  A[Start] --> B[End]"}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mermaid syntax — flowcharts, timelines, mind maps and more.
            </p>
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => {
                applyDraft();
                setMode("preview");
              }}
            >
              Apply & preview
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-2">
          <MermaidDiagram code={code} />
        </div>
      )}
    </NodeViewWrapper>
  );
}
