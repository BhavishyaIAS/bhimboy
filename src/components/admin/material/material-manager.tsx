"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  Trash2,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createMaterial,
  deleteMaterial,
  setMaterialStatus,
} from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ExamStage,
  MaterialCategory,
  Material,
  SyllabusTree,
} from "@/lib/database.types";

const MAX_MB = 50;
const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp";
const NONE = "__none__";

const CATEGORIES: {
  key: MaterialCategory;
  label: string;
  stage: ExamStage | null;
  blurb: string;
}[] = [
  {
    key: "comprehensive",
    label: "Comprehensive Material",
    stage: null,
    blurb: "Full study material spanning any paper, subject or topic.",
  },
  {
    key: "prelims",
    label: "Prelims Notes",
    stage: "prelims",
    blurb: "Notes mapped to the Prelims syllabus.",
  },
  {
    key: "mains",
    label: "Mains Notes",
    stage: "mains",
    blurb: "Notes mapped to the Mains syllabus.",
  },
];

function prettySize(bytes: number) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function MaterialManager({
  tree,
  materials,
  signedUrls,
}: {
  tree: SyllabusTree;
  materials: Material[];
  signedUrls: Record<string, string>;
}) {
  return (
    <Tabs defaultValue="comprehensive">
      <TabsList>
        {CATEGORIES.map((c) => (
          <TabsTrigger key={c.key} value={c.key}>
            {c.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {CATEGORIES.map((c) => (
        <TabsContent key={c.key} value={c.key} className="mt-4">
          <CategoryPanel
            category={c.key}
            stage={c.stage}
            blurb={c.blurb}
            tree={tree}
            materials={materials.filter((m) => m.category === c.key)}
            signedUrls={signedUrls}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CategoryPanel({
  category,
  stage,
  blurb,
  tree,
  materials,
  signedUrls,
}: {
  category: MaterialCategory;
  stage: ExamStage | null;
  blurb: string;
  tree: SyllabusTree;
  materials: Material[];
  signedUrls: Record<string, string>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [paperId, setPaperId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [microthemeId, setMicrothemeId] = useState("");
  const [fileName, setFileName] = useState("");
  const [pending, startTransition] = useTransition();

  const papers = useMemo(
    () => tree.papers.filter((p) => !stage || p.stage === stage),
    [tree, stage]
  );
  const subjects = useMemo(
    () => papers.find((p) => p.id === paperId)?.subjects ?? [],
    [papers, paperId]
  );
  const topics = useMemo(
    () => subjects.find((s) => s.id === subjectId)?.topics ?? [],
    [subjects, subjectId]
  );
  const microthemes = useMemo(
    () => topics.find((t) => t.id === topicId)?.microthemes ?? [],
    [topics, topicId]
  );

  // id -> "Paper › Subject › Topic › Micro-theme" for the list rows.
  const pathOf = useMemo(() => {
    const names = new Map<string, string>();
    const parent = new Map<string, string | null>();
    for (const p of tree.papers) {
      names.set(p.id, p.name);
      parent.set(p.id, null);
      for (const s of p.subjects) {
        names.set(s.id, s.name);
        parent.set(s.id, p.id);
        for (const t of s.topics) {
          names.set(t.id, t.name);
          parent.set(t.id, s.id);
          for (const m of t.microthemes) {
            names.set(m.id, m.name);
            parent.set(m.id, t.id);
          }
        }
      }
    }
    return (m: Material) => {
      const leaf =
        m.microtheme_id ?? m.topic_id ?? m.subject_id ?? m.paper_id ?? null;
      if (!leaf) return "Unfiled";
      const parts: string[] = [];
      let cur: string | null = leaf;
      while (cur) {
        parts.unshift(names.get(cur) ?? "?");
        cur = parent.get(cur) ?? null;
      }
      return parts.join(" › ");
    };
  }, [tree]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPaperId("");
    setSubjectId("");
    setTopicId("");
    setMicrothemeId("");
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const file = fileRef.current?.files?.[0];
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!file) {
      toast.error("Please choose a file to upload");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File must be smaller than ${MAX_MB} MB`);
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${category}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("materials")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) {
          toast.error(`Upload failed: ${upErr.message}`);
          return;
        }

        const result = await createMaterial({
          category,
          title,
          description,
          filePath: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          paperId: paperId || null,
          subjectId: subjectId || null,
          topicId: topicId || null,
          microthemeId: microthemeId || null,
        });
        if (!result.ok) {
          // Roll back the orphaned upload so storage stays clean.
          await supabase.storage.from("materials").remove([path]);
          toast.error(result.error);
          return;
        }
        toast.success("Material uploaded");
        resetForm();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  const noSyllabus = papers.length === 0;

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="rounded-xl border p-4">
        <p className="text-sm font-medium">Upload to this module</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>

        {noSyllabus && (
          <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            No {stage ? `${stage} ` : ""}syllabus papers exist yet. You can
            still upload material now (it will be left unfiled); once you import
            the syllabus you&apos;ll be able to pin uploads to a paper, subject,
            topic or micro-theme.
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`title-${category}`}>Title</Label>
            <Input
              id={`title-${category}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Modern History — complete notes"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`file-${category}`}>File</Label>
            <Input
              id={`file-${category}`}
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <Label htmlFor={`desc-${category}`}>Description (optional)</Label>
          <Textarea
            id={`desc-${category}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short note shown with the material."
            rows={2}
          />
        </div>

        {/* Syllabus-wise placement (cascading, each level optional) */}
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SyllabusSelect
            label="Paper"
            value={paperId}
            placeholder={noSyllabus ? "No papers yet" : "Any"}
            disabled={noSyllabus}
            options={papers.map((p) => ({ id: p.id, name: p.name }))}
            onChange={(v) => {
              setPaperId(v);
              setSubjectId("");
              setTopicId("");
              setMicrothemeId("");
            }}
          />
          <SyllabusSelect
            label="Subject"
            value={subjectId}
            placeholder="Any"
            disabled={!paperId || subjects.length === 0}
            options={subjects.map((s) => ({ id: s.id, name: s.name }))}
            onChange={(v) => {
              setSubjectId(v);
              setTopicId("");
              setMicrothemeId("");
            }}
          />
          <SyllabusSelect
            label="Topic"
            value={topicId}
            placeholder="Any"
            disabled={!subjectId || topics.length === 0}
            options={topics.map((t) => ({ id: t.id, name: t.name }))}
            onChange={(v) => {
              setTopicId(v);
              setMicrothemeId("");
            }}
          />
          <SyllabusSelect
            label="Micro-theme"
            value={microthemeId}
            placeholder="Any"
            disabled={!topicId || microthemes.length === 0}
            options={microthemes.map((m) => ({ id: m.id, name: m.name }))}
            onChange={setMicrothemeId}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={submit} disabled={pending}>
            <Upload className="h-4 w-4" />
            {pending ? "Uploading…" : "Upload material"}
          </Button>
          {fileName && (
            <span className="truncate text-xs text-muted-foreground">
              {fileName}
            </span>
          )}
        </div>
      </div>

      {/* Uploaded list */}
      {materials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No material uploaded in this module yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <MaterialRow
              key={m.id}
              material={m}
              path={pathOf(m)}
              url={signedUrls[m.file_path]}
              onChanged={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SyllabusSelect({
  label,
  value,
  placeholder,
  disabled,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value || NONE}
        disabled={disabled}
        onValueChange={(v) => onChange(v === NONE ? "" : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Any</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MaterialRow({
  material: m,
  path,
  url,
  onChanged,
}: {
  material: Material;
  path: string;
  url?: string;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const published = m.status === "published";

  return (
    <li className="flex items-start gap-3 rounded-xl border p-3">
      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{m.title}</span>
          <Badge variant={published ? "success" : "outline"}>
            {published ? "Published" : "Draft"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {path}
          {m.file_name ? ` · ${m.file_name}` : ""}
          {m.file_size ? ` · ${prettySize(m.file_size)}` : ""}
        </p>
        {m.description && (
          <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {url && (
          <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Download">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={published ? "Unpublish" : "Publish"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await setMaterialStatus({
                id: m.id,
                status: published ? "draft" : "published",
              });
              if (!r.ok) toast.error(r.error);
              else toast.success(published ? "Unpublished" : "Published");
              onChanged();
            })
          }
        >
          {published ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Delete"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete "${m.title}"?`)) return;
            startTransition(async () => {
              const r = await deleteMaterial({ id: m.id });
              if (!r.ok) toast.error(r.error);
              else toast.success("Deleted");
              onChanged();
            });
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
