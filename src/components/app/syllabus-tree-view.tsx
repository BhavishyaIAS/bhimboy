import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CoverageChips, paperTotals } from "@/components/app/coverage-chips";
import type { SyllabusTree } from "@/lib/database.types";

/**
 * Renders the syllabus hierarchy (paper → subject → topic → micro-theme),
 * grouped by Prelims / Mains. Used by the admin-only Syllabus Detailer.
 */
export function SyllabusTreeView({ tree }: { tree: SyllabusTree }) {
  const prelims = tree.papers.filter((p) => p.stage === "prelims");
  const mains = tree.papers.filter((p) => p.stage === "mains");

  return (
    <>
      {[
        { label: "Prelims", papers: prelims },
        { label: "Mains", papers: mains },
      ].map(
        (group) =>
          group.papers.length > 0 && (
            <section key={group.label} className="mt-6 first:mt-0">
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">
                {group.label}
              </h2>
              <div className="mt-3 space-y-4">
                {group.papers.map((paper) => {
                  const subjects = (paper.subjects ?? []).filter((s) =>
                    (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0)
                  );
                  const allMicros = (paper.subjects ?? []).flatMap((s) =>
                    (s.topics ?? []).flatMap((t) => t.microthemes ?? [])
                  );
                  const totals = paperTotals(allMicros);
                  return (
                    <div
                      key={paper.id}
                      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b bg-accent/50 px-5 py-3.5">
                        <h3 className="font-semibold">{paper.name}</h3>
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
                          No mapped topics in this paper yet.
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
    </>
  );
}
