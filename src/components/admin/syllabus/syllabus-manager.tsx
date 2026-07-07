"use client";

// Admin Syllabus Manager: 4-level tree with inline add/rename/delete,
// drag-and-drop reordering within a parent, draft/publish toggles and
// editable micro-theme codes.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createMicrotheme,
  createNode,
  createPaper,
  deleteNode,
  renameNode,
  reorderNodes,
  setNodeStatus,
  updateMicrothemeCode,
} from "@/lib/actions/syllabus";
import type { SyllabusTree } from "@/lib/database.types";
import { DragHandle, SortableList } from "@/components/admin/sortable-list";
import { cn } from "@/lib/utils";

type Level = "paper" | "subject" | "topic" | "microtheme";

// ---------- small shared pieces ----------

function StatusToggle({
  status,
  onToggle,
  disabled,
}: {
  status: "draft" | "published";
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title="Toggle draft / published"
      className="disabled:opacity-50"
    >
      <Badge
        variant={status === "published" ? "success" : "warning"}
        className="cursor-pointer"
      >
        {status}
      </Badge>
    </button>
  );
}

function InlineAdd({
  placeholder,
  onAdd,
  className,
}: {
  placeholder: string;
  onAdd: (name: string) => Promise<void>;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const name = value.trim();
    if (!name) return;
    startTransition(async () => {
      await onAdd(name);
      setValue("");
    });
  }

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-7 border-dashed text-sm shadow-none"
        disabled={pending}
      />
      {value.trim() && (
        <Button size="sm" className="h-7 px-2 text-xs" onClick={submit} disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      )}
    </div>
  );
}

function EditableName({
  name,
  onRename,
  className,
}: {
  name: string;
  onRename: (name: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [prevName, setPrevName] = useState(name);
  const [pending, startTransition] = useTransition();

  // Adjust state during render when the server-provided name changes.
  if (prevName !== name) {
    setPrevName(name);
    setValue(name);
  }

  if (!editing) {
    return (
      <span className={cn("group/name inline-flex min-w-0 items-center gap-1", className)}>
        <span className="truncate">{name}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="opacity-0 transition-opacity group-hover/name:opacity-100"
          title="Rename"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      </span>
    );
  }

  function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    startTransition(async () => {
      await onRename(trimmed);
      setEditing(false);
    });
  }

  return (
    <Input
      autoFocus
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditing(false);
          setValue(name);
        }
      }}
      className="h-7 max-w-xs text-sm"
    />
  );
}

function DeleteButton({
  label,
  name,
  warning,
  onDelete,
}: {
  label: string;
  name: string;
  warning?: string;
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title={`Delete ${label}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {label}?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  You are about to permanently delete{" "}
                  <span className="font-semibold text-foreground">{name}</span>
                  {warning ? ` — ${warning}` : "."}{" "}
                  This cannot be undone.
                </p>
                <p>
                  Type the exact name to confirm:
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={name}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={typed !== name || pending}
              onClick={() =>
                startTransition(async () => {
                  await onDelete();
                  setOpen(false);
                })
              }
            >
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Expander({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded p-0.5 text-muted-foreground hover:bg-accent"
    >
      {expanded ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  );
}

// ---------- code editing for micro-themes ----------

function EditableCode({
  code,
  onSave,
}: {
  code: string;
  onSave: (code: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(code);
  const [prevCode, setPrevCode] = useState(code);
  const [pending, startTransition] = useTransition();

  if (prevCode !== code) {
    setPrevCode(code);
    setValue(code);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Click to edit code (used in bulk uploads)"
      >
        <Badge variant="outline" className="cursor-pointer font-mono text-[10px]">
          {code}
        </Badge>
      </button>
    );
  }

  function commit() {
    const trimmed = value.trim().toUpperCase();
    if (!trimmed || trimmed === code) {
      setEditing(false);
      setValue(code);
      return;
    }
    startTransition(async () => {
      await onSave(trimmed);
      setEditing(false);
    });
  }

  return (
    <Input
      autoFocus
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditing(false);
          setValue(code);
        }
      }}
      className="h-6 w-32 font-mono text-xs"
    />
  );
}

// ---------- the manager ----------

export function SyllabusManager({ tree }: { tree: SyllabusTree }) {
  const router = useRouter();
  const [papers, setPapers] = useState(tree.papers);
  const [prevPapers, setPrevPapers] = useState(tree.papers);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Sync local (optimistically reordered) state whenever fresh server data
  // arrives via router.refresh().
  if (prevPapers !== tree.papers) {
    setPrevPapers(tree.papers);
    setPapers(tree.papers);
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    const result = await action();
    if (!result.ok) toast.error(result.error ?? "Something went wrong");
    router.refresh();
  }

  function handleReorder(level: Level, orderedIds: string[]) {
    // Optimistic local reorder, then persist.
    setPapers((prev) => {
      const order = new Map(orderedIds.map((id, i) => [id, i]));
      const sortByOrder = <T extends { id: string }>(arr: T[]): T[] =>
        [...arr].sort((a, b) => {
          const ai = order.get(a.id);
          const bi = order.get(b.id);
          if (ai === undefined || bi === undefined) return 0;
          return ai - bi;
        });

      if (level === "paper") return sortByOrder(prev);
      return prev.map((p) => ({
        ...p,
        subjects:
          level === "subject"
            ? sortByOrder(p.subjects ?? [])
            : (p.subjects ?? []).map((s) => ({
                ...s,
                topics:
                  level === "topic"
                    ? sortByOrder(s.topics ?? [])
                    : (s.topics ?? []).map((t) => ({
                        ...t,
                        microthemes:
                          level === "microtheme"
                            ? sortByOrder(t.microthemes ?? [])
                            : t.microthemes,
                      })),
              })),
      }));
    });
    void run(() => reorderNodes({ level, orderedIds }));
  }

  return (
    <div className="space-y-3">
      <SortableList
        items={papers}
        onReorder={(ids) => handleReorder("paper", ids)}
        className="space-y-3"
        renderItem={(paper, drag) => (
          <div className="rounded-xl border bg-card">
            <div className="flex items-center gap-1.5 px-3 py-2.5">
              <DragHandle
                attributes={drag.handleAttributes}
                listeners={drag.handleListeners}
              />
              <Expander
                expanded={expanded.has(paper.id)}
                onClick={() => toggle(paper.id)}
              />
              <EditableName
                name={paper.name}
                className="font-semibold"
                onRename={(name) =>
                  run(() => renameNode({ level: "paper", id: paper.id, name }))
                }
              />
              <Badge variant="outline" className="ml-1 capitalize">
                {paper.stage}
              </Badge>
              <span className="ml-auto flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {(paper.subjects ?? []).length} subjects
                </span>
                <DeleteButton
                  label="paper"
                  name={paper.name}
                  warning="including every subject, topic, micro-theme, note and question inside it"
                  onDelete={() =>
                    run(() => deleteNode({ level: "paper", id: paper.id }))
                  }
                />
              </span>
            </div>

            {expanded.has(paper.id) && (
              <div className="border-t px-3 py-2.5 pl-8">
                <SortableList
                  items={paper.subjects ?? []}
                  onReorder={(ids) => handleReorder("subject", ids)}
                  className="space-y-2"
                  renderItem={(subject, sdrag) => (
                    <div className="rounded-lg border">
                      <div className="flex items-center gap-1.5 px-2.5 py-2">
                        <DragHandle
                          attributes={sdrag.handleAttributes}
                          listeners={sdrag.handleListeners}
                        />
                        <Expander
                          expanded={expanded.has(subject.id)}
                          onClick={() => toggle(subject.id)}
                        />
                        <EditableName
                          name={subject.name}
                          className="text-sm font-medium"
                          onRename={(name) =>
                            run(() =>
                              renameNode({ level: "subject", id: subject.id, name })
                            )
                          }
                        />
                        <span className="ml-auto flex items-center gap-1.5">
                          <StatusToggle
                            status={subject.status}
                            onToggle={() =>
                              run(() =>
                                setNodeStatus({
                                  level: "subject",
                                  id: subject.id,
                                  status:
                                    subject.status === "published"
                                      ? "draft"
                                      : "published",
                                })
                              )
                            }
                          />
                          <DeleteButton
                            label="subject"
                            name={subject.name}
                            warning="including all its topics and micro-themes"
                            onDelete={() =>
                              run(() =>
                                deleteNode({ level: "subject", id: subject.id })
                              )
                            }
                          />
                        </span>
                      </div>

                      {expanded.has(subject.id) && (
                        <div className="border-t px-2.5 py-2 pl-7">
                          <SortableList
                            items={subject.topics ?? []}
                            onReorder={(ids) => handleReorder("topic", ids)}
                            className="space-y-1.5"
                            renderItem={(topic, tdrag) => (
                              <div className="rounded-lg border border-dashed">
                                <div className="flex items-center gap-1.5 px-2 py-1.5">
                                  <DragHandle
                                    attributes={tdrag.handleAttributes}
                                    listeners={tdrag.handleListeners}
                                  />
                                  <Expander
                                    expanded={expanded.has(topic.id)}
                                    onClick={() => toggle(topic.id)}
                                  />
                                  <EditableName
                                    name={topic.name}
                                    className="text-sm"
                                    onRename={(name) =>
                                      run(() =>
                                        renameNode({
                                          level: "topic",
                                          id: topic.id,
                                          name,
                                        })
                                      )
                                    }
                                  />
                                  <span className="ml-auto flex items-center gap-1.5">
                                    <StatusToggle
                                      status={topic.status}
                                      onToggle={() =>
                                        run(() =>
                                          setNodeStatus({
                                            level: "topic",
                                            id: topic.id,
                                            status:
                                              topic.status === "published"
                                                ? "draft"
                                                : "published",
                                          })
                                        )
                                      }
                                    />
                                    <DeleteButton
                                      label="topic"
                                      name={topic.name}
                                      warning="including all its micro-themes and their content"
                                      onDelete={() =>
                                        run(() =>
                                          deleteNode({
                                            level: "topic",
                                            id: topic.id,
                                          })
                                        )
                                      }
                                    />
                                  </span>
                                </div>

                                {expanded.has(topic.id) && (
                                  <div className="border-t px-2 py-1.5 pl-6">
                                    <SortableList
                                      items={topic.microthemes ?? []}
                                      onReorder={(ids) =>
                                        handleReorder("microtheme", ids)
                                      }
                                      className="space-y-1"
                                      renderItem={(m, mdrag) => (
                                        <div className="flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-accent/50">
                                          <DragHandle
                                            attributes={mdrag.handleAttributes}
                                            listeners={mdrag.handleListeners}
                                          />
                                          <EditableName
                                            name={m.name}
                                            className="text-sm"
                                            onRename={(name) =>
                                              run(() =>
                                                renameNode({
                                                  level: "microtheme",
                                                  id: m.id,
                                                  name,
                                                })
                                              )
                                            }
                                          />
                                          <EditableCode
                                            code={m.code}
                                            onSave={(code) =>
                                              run(() =>
                                                updateMicrothemeCode({
                                                  id: m.id,
                                                  code,
                                                })
                                              )
                                            }
                                          />
                                          <span className="ml-auto flex items-center gap-1.5">
                                            <Button
                                              asChild
                                              variant="outline"
                                              size="sm"
                                              className="h-6 px-2 text-xs"
                                            >
                                              <Link
                                                href={`/admin/microthemes/${m.id}`}
                                              >
                                                <PenLine className="h-3 w-3" />
                                                Content
                                              </Link>
                                            </Button>
                                            <StatusToggle
                                              status={m.status}
                                              onToggle={() =>
                                                run(() =>
                                                  setNodeStatus({
                                                    level: "microtheme",
                                                    id: m.id,
                                                    status:
                                                      m.status === "published"
                                                        ? "draft"
                                                        : "published",
                                                  })
                                                )
                                              }
                                            />
                                            <DeleteButton
                                              label="micro-theme"
                                              name={m.name}
                                              warning="including its notes, videos, glossary and PYQ links"
                                              onDelete={() =>
                                                run(() =>
                                                  deleteNode({
                                                    level: "microtheme",
                                                    id: m.id,
                                                  })
                                                )
                                              }
                                            />
                                          </span>
                                        </div>
                                      )}
                                    />
                                    <InlineAdd
                                      className="mt-1.5"
                                      placeholder="Add micro-theme…"
                                      onAdd={async (name) => {
                                        const result = await createMicrotheme({
                                          topicId: topic.id,
                                          name,
                                        });
                                        if (!result.ok) {
                                          toast.error(result.error);
                                        } else {
                                          toast.success(
                                            `Created with code ${result.data?.code}`
                                          );
                                        }
                                        router.refresh();
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          />
                          <InlineAdd
                            className="mt-2"
                            placeholder="Add topic…"
                            onAdd={async (name) => {
                              await run(() =>
                                createNode({
                                  level: "topic",
                                  parentId: subject.id,
                                  name,
                                })
                              );
                              setExpanded((prev) => new Set(prev).add(subject.id));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                />
                <InlineAdd
                  className="mt-2.5"
                  placeholder="Add subject / major topic…"
                  onAdd={async (name) => {
                    await run(() =>
                      createNode({ level: "subject", parentId: paper.id, name })
                    );
                    setExpanded((prev) => new Set(prev).add(paper.id));
                  }}
                />
              </div>
            )}
          </div>
        )}
      />

      <AddPaperForm
        onAdd={async (name, stage) => {
          await run(() => createPaper({ name, stage }));
        }}
      />
    </div>
  );
}

function AddPaperForm({
  onAdd,
}: {
  onAdd: (name: string, stage: "prelims" | "mains") => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"prelims" | "mains">("prelims");
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed p-3">
      <Plus className="h-4 w-4 text-muted-foreground" />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add paper (e.g. Mains Paper 6)…"
        className="h-8 max-w-xs"
        disabled={pending}
      />
      <div className="flex overflow-hidden rounded-md border">
        {(["prelims", "mains"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium capitalize",
              stage === s
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent"
            )}
          >
            {s}
          </button>
        ))}
      </div>
      <Button
        size="sm"
        disabled={!name.trim() || pending}
        onClick={() =>
          startTransition(async () => {
            await onAdd(name.trim(), stage);
            setName("");
          })
        }
      >
        {pending ? "Adding…" : "Add paper"}
      </Button>
    </div>
  );
}
