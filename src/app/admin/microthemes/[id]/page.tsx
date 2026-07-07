import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotesTab } from "@/components/admin/microtheme/notes-tab";
import { VideosTab } from "@/components/admin/microtheme/videos-tab";
import { GlossaryTab } from "@/components/admin/microtheme/glossary-tab";
import type {
  GlossaryTerm,
  MainsQuestion,
  Note,
  PrelimsQuestion,
  Subject,
  Topic,
  Video,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("microthemes")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: data ? `Edit: ${data.name}` : "Micro-theme" };
}

export default async function MicrothemeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: mt } = await supabase
    .from("microthemes")
    .select("*, topic:topics (*, subject:subjects (*))")
    .eq("id", id)
    .maybeSingle();
  if (!mt) notFound();

  const topic = mt.topic as unknown as (Topic & { subject: Subject }) | null;

  const [noteRes, videosRes, glossaryRes, prelimsRes, mainsRes] =
    await Promise.all([
      supabase.from("notes").select("*").eq("microtheme_id", id).maybeSingle(),
      supabase
        .from("videos")
        .select("*")
        .eq("microtheme_id", id)
        .order("sort_order"),
      supabase
        .from("glossary_terms")
        .select("*")
        .eq("microtheme_id", id)
        .order("sort_order"),
      supabase
        .from("prelims_questions")
        .select("id, year, paper_label, question_text, status")
        .eq("microtheme_id", id)
        .order("year", { ascending: false }),
      supabase
        .from("mains_questions")
        .select("id, year, paper_label, question_text, status, model_answer")
        .eq("microtheme_id", id)
        .order("year", { ascending: false }),
    ]);

  const note = noteRes.data as Note | null;
  const videos = (videosRes.data ?? []) as Video[];
  const glossary = (glossaryRes.data ?? []) as GlossaryTerm[];
  const prelims = (prelimsRes.data ?? []) as Pick<
    PrelimsQuestion,
    "id" | "year" | "paper_label" | "question_text" | "status"
  >[];
  const mains = (mainsRes.data ?? []) as Pick<
    MainsQuestion,
    "id" | "year" | "paper_label" | "question_text" | "status" | "model_answer"
  >[];

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/admin/syllabus" className="hover:text-foreground hover:underline">
          Syllabus
        </Link>
        {topic && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span>{topic.subject?.name}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{topic.name}</span>
          </>
        )}
      </nav>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{mt.name}</h1>
        <Badge variant="outline" className="font-mono text-xs">
          {mt.code}
        </Badge>
        <Badge variant={mt.status === "published" ? "success" : "warning"}>
          {mt.status}
        </Badge>
        {mt.status === "published" && (
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href={`/app/m/${mt.slug}`} target="_blank">
              <ExternalLink className="h-3 w-3" /> View as student
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="notes" className="mt-5">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="glossary">Glossary ({glossary.length})</TabsTrigger>
          <TabsTrigger value="pyqs">
            PYQs ({prelims.length + mains.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4">
          <NotesTab
            microthemeId={mt.id}
            initialContent={note?.content ?? null}
            initialStatus={note?.status ?? null}
            initialPublishedAt={note?.published_at ?? null}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <VideosTab microthemeId={mt.id} videos={videos} />
        </TabsContent>

        <TabsContent value="glossary" className="mt-4">
          <GlossaryTab microthemeId={mt.id} terms={glossary} />
        </TabsContent>

        <TabsContent value="pyqs" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Questions tagged to this micro-theme.
            </p>
            <Button asChild size="sm">
              <Link href={`/admin/pyqs?microtheme=${mt.id}`}>
                Manage / add questions
              </Link>
            </Button>
          </div>
          {prelims.length + mains.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No questions yet. Add them one by one in the PYQ Manager or via
              Bulk Upload using code{" "}
              <span className="font-mono font-medium text-foreground">
                {mt.code}
              </span>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {prelims.map((q) => (
                <li
                  key={`p-${q.id}`}
                  className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="outline">Prelims</Badge>
                  <Badge variant="secondary">{q.year}</Badge>
                  <span className="min-w-0 flex-1 truncate">{q.question_text}</span>
                  <Badge variant={q.status === "published" ? "success" : "warning"}>
                    {q.status}
                  </Badge>
                </li>
              ))}
              {mains.map((q) => (
                <li
                  key={`m-${q.id}`}
                  className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                >
                  <Badge variant="outline">Mains</Badge>
                  <Badge variant="secondary">{q.year}</Badge>
                  <span className="min-w-0 flex-1 truncate">{q.question_text}</span>
                  {q.model_answer == null && (
                    <Badge variant="warning">no model answer</Badge>
                  )}
                  <Badge variant={q.status === "published" ? "success" : "warning"}>
                    {q.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
