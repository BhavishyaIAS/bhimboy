import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { getSyllabusTree } from "@/lib/queries";
import { EXAMS, EXAM_IDS, isExamId } from "@/lib/exams";
import { ForestScene } from "@/components/living/forest-scene";
import { Lotus } from "@/components/decor/ornaments";
import { CoverageChips, paperTotals } from "@/components/app/coverage-chips";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ exam: string }>;
}): Promise<Metadata> {
  const { exam } = await params;
  return { title: isExamId(exam) ? EXAMS[exam].name : "Syllabus" };
}

export default async function ExamSyllabusPage({
  params,
}: {
  params: Promise<{ exam: string }>;
}) {
  const { exam } = await params;
  if (!isExamId(exam)) notFound();
  const meta = EXAMS[exam];

  const tree = await getSyllabusTree({ publishedOnly: true, exam });

  const prelims = tree.papers.filter((p) => p.stage === "prelims");
  const mains = tree.papers.filter((p) => p.stage === "mains");

  const hasContent = tree.papers.some((p) =>
    (p.subjects ?? []).some((s) => (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0))
  );

  return (
    <>
      <ForestScene />
      <div className="relative animate-rise-in">
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          {meta.name}
        </h1>
        <div className="flex items-center gap-1 rounded-full border bg-card/70 p-1 backdrop-blur">
          {EXAM_IDS.map((id) => (
            <Link
              key={id}
              href={`/app/syllabus/${id}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                id === exam
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {EXAMS[id].label}
            </Link>
          ))}
        </div>
      </div>
      <p className="relative mt-1.5 text-sm text-muted-foreground">
        {meta.tagline} Nothing here competes; everything belongs.
      </p>
      {exam === "appsc" && (
        <p className="relative mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-ember">core</span> = start here
          (highest yield) · <span className="font-medium text-emerald-700">P+M</span>{" "}
          = counts for Prelims and Mains — study once, use twice · the clock is
          one honest sitting.
        </p>
      )}

      {!hasContent && (
        <div className="mt-12 rounded-2xl border border-dashed bg-card/60 p-12 text-center text-muted-foreground backdrop-blur">
          <Lotus className="mx-auto h-8 w-14 opacity-70" />
          <p className="mt-4 font-display text-lg text-foreground">
            The grove is still being planted
          </p>
          <p className="mt-1 text-sm">
            The {meta.name} syllabus will appear here soon — return shortly.
          </p>
        </div>
      )}

      {[
        { label: "Prelims", papers: prelims },
        { label: "Mains", papers: mains },
      ].map(
        (group) =>
          group.papers.length > 0 && (
            <section key={group.label} className="mt-9">
              <h2 className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-ember/70">
                {group.label}
              </h2>
              <div className="mt-3 space-y-4">
                {group.papers.map((paper) => {
                  const subjects = (paper.subjects ?? []).filter(
                    (s) => (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0)
                  );
                  const allMicros = (paper.subjects ?? []).flatMap((s) =>
                    (s.topics ?? []).flatMap((t) => t.microthemes ?? [])
                  );
                  const totals = paperTotals(allMicros);
                  return (
                    <div
                      key={paper.id}
                      className="overflow-hidden rounded-2xl border bg-card/85 shadow-sm backdrop-blur"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b bg-gradient-to-r from-accent/70 to-transparent px-5 py-3.5">
                        <h3 className="font-display font-semibold">{paper.name}</h3>
                        {allMicros.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {allMicros.length} micro-theme
                            {allMicros.length === 1 ? "" : "s"}
                            {totals ? ` · ${totals}` : ""}
                          </span>
                        )}
                      </div>
                      {subjects.length === 0 ? (
                        <p className="px-5 py-4 text-sm italic text-muted-foreground">
                          This paper is still gathering its leaves.
                        </p>
                      ) : (
                        <Accordion type="multiple" className="px-5">
                          {subjects.map((subject) => (
                            <AccordionItem
                              key={subject.id}
                              value={subject.id}
                              className="last:border-b-0"
                            >
                              <AccordionTrigger className="text-[15px]">
                                {subject.name}
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  {(subject.topics ?? [])
                                    .filter((t) => (t.microthemes ?? []).length > 0)
                                    .map((topic) => (
                                      <div key={topic.id}>
                                        <p className="mb-1.5 text-sm font-semibold text-muted-foreground">
                                          {topic.name}
                                        </p>
                                        <ul className="space-y-1">
                                          {(topic.microthemes ?? []).map((m) => (
                                            <li key={m.id}>
                                              <Link
                                                href={`/app/m/${m.slug}`}
                                                className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent"
                                              >
                                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="flex-1 text-sm">
                                                  {m.name}
                                                </span>
                                                <CoverageChips microtheme={m} />
                                                <Badge
                                                  variant="outline"
                                                  className="hidden font-mono text-[10px] text-muted-foreground lg:inline-flex"
                                                >
                                                  {m.code}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                              </Link>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )
      )}
      </div>
    </>
  );
}
