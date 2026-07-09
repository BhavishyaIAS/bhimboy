import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileQuestion,
  Lightbulb,
  Video as VideoIcon,
} from "lucide-react";
import { getMicrothemeBySlug } from "@/lib/queries";
import { NoteRenderer } from "@/components/content/note-renderer";
import { YouTubeEmbed } from "@/components/content/youtube-embed";
import { PrelimsQuestionCard } from "@/components/pyq/prelims-question-card";
import { MainsQuestionCard } from "@/components/pyq/mains-question-card";
import { LeafDivider } from "@/components/decor/ornaments";
import { AutumnScene } from "@/components/living/autumn-scene";
import type { CorrectOption } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMicrothemeBySlug(slug);
  return { title: data?.microtheme.name ?? "Not found" };
}

export default async function MicrothemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getMicrothemeBySlug(slug);
  if (!data) notFound();

  const { microtheme, topic, subject, paper, note, videos, glossary, prelims, mains, prev, next } =
    data;
  const publishedNote = note && note.status === "published" ? note : null;

  const sectionHeading =
    "flex items-center gap-2 font-display text-xl font-semibold tracking-tight";

  return (
    <>
      {/* The sparrow builds her nest while you build yours. Kept outside the
          animated wrapper: a transformed ancestor would re-anchor the fixed
          canvas away from the viewport. */}
      <AutumnScene />
      <div className="mx-auto max-w-3xl animate-rise-in">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/app/syllabus" className="hover:text-primary hover:underline">
          Syllabus
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{paper.name}</span>
        <ChevronRight className="h-3 w-3" />
        <span>{subject.name}</span>
        <ChevronRight className="h-3 w-3" />
        <span>{topic.name}</span>
      </nav>

      <h1 className="mt-4 font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl">
        {microtheme.name}
      </h1>
      <p className="mt-2 font-mono text-xs tracking-wider text-primary/80">
        {microtheme.code}
      </p>

      {/* 1. Notes */}
      <section className="mt-8">
        {publishedNote ? (
          <NoteRenderer doc={publishedNote.content} />
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="mx-auto h-6 w-6" />
            <p className="mt-2">Notes for this micro-theme are on their way.</p>
          </div>
        )}
      </section>

      {/* 2. Videos */}
      {videos.length > 0 && (
        <section className="mt-10">
          <LeafDivider className="mb-8" />
          <h2 className={sectionHeading}>
            <VideoIcon className="h-5 w-5 text-primary" /> Video lectures
          </h2>
          <div className="mt-4 space-y-6">
            {videos.map((v) => (
              <div key={v.id}>
                <YouTubeEmbed url={v.youtube_url} title={v.title} />
                {v.title && (
                  <p className="mt-2 text-sm font-medium">{v.title}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. PYQs */}
      {(prelims.length > 0 || mains.length > 0) && (
        <section className="mt-10">
          <LeafDivider className="mb-8" />
          <h2 className={sectionHeading}>
            <FileQuestion className="h-5 w-5 text-primary" /> PYQs from this
            micro-theme
          </h2>
          <div className="mt-4 space-y-4">
            {prelims.map((q) => (
              <PrelimsQuestionCard
                key={q.id}
                question={{
                  ...q,
                  correct_option: q.correct_option as CorrectOption,
                }}
                showMicrothemeLink={false}
              />
            ))}
            {mains.map((q) => (
              <MainsQuestionCard key={q.id} question={q} showMicrothemeLink={false} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Glossary */}
      {glossary.length > 0 && (
        <section className="mt-10">
          <LeafDivider className="mb-8" />
          <h2 className={sectionHeading}>
            <Lightbulb className="h-5 w-5 text-primary" /> Key terms
          </h2>
          <dl className="mt-4 space-y-3">
            {glossary.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-l-4 border-l-primary/50 bg-card/80 p-4"
              >
                <dt className="font-display font-semibold">{g.term}</dt>
                <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                  {g.definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Prev / next: the path continues */}
      <LeafDivider className="mt-14" />
      <nav className="mt-4 grid grid-cols-2 gap-3">
        {prev ? (
          <Link
            href={`/app/m/${prev.slug}`}
            className="group rounded-2xl border bg-card/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_oklch(0.46_0.12_36/0.4)]"
          >
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />{" "}
              The step before
            </span>
            <span className="mt-1.5 line-clamp-2 block font-display text-sm font-medium">
              {prev.name}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/app/m/${next.slug}`}
            className="group rounded-2xl border bg-card/80 p-4 text-right transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_oklch(0.46_0.12_36/0.4)]"
          >
            <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              The path continues{" "}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-1.5 line-clamp-2 block font-display text-sm font-medium">
              {next.name}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
      </div>
    </>
  );
}
