import Link from "next/link";
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

export const metadata: Metadata = { title: "Syllabus" };
export const dynamic = "force-dynamic";

export default async function SyllabusExplorerPage() {
  const tree = await getSyllabusTree();

  const prelims = tree.papers.filter((p) => p.stage === "prelims");
  const mains = tree.papers.filter((p) => p.stage === "mains");

  const hasContent = tree.papers.some((p) =>
    (p.subjects ?? []).some((s) => (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Syllabus</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse paper by paper. Tap a micro-theme to open its notes, videos,
        PYQs and glossary.
      </p>

      {!hasContent && (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium">Content is being prepared</p>
          <p className="mt-1 text-sm">
            Published notes will appear here soon. Check back shortly!
          </p>
        </div>
      )}

      {[
        { label: "Prelims", papers: prelims },
        { label: "Mains", papers: mains },
      ].map(
        (group) =>
          group.papers.length > 0 && (
            <section key={group.label} className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <div className="mt-2 space-y-3">
                {group.papers.map((paper) => {
                  const subjects = (paper.subjects ?? []).filter(
                    (s) => (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0)
                  );
                  return (
                    <div key={paper.id} className="rounded-xl border">
                      <div className="border-b bg-muted/40 px-4 py-3">
                        <h3 className="font-semibold">{paper.name}</h3>
                      </div>
                      {subjects.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted-foreground">
                          No published content in this paper yet.
                        </p>
                      ) : (
                        <Accordion type="multiple" className="px-4">
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
                                                <Badge
                                                  variant="outline"
                                                  className="hidden font-mono text-[10px] text-muted-foreground sm:inline-flex"
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
  );
}
