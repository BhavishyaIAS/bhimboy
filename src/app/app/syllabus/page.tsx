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
import { ForestScene } from "@/components/living/forest-scene";
import { Lotus } from "@/components/decor/ornaments";

export const metadata: Metadata = { title: "Syllabus" };
export const dynamic = "force-dynamic";

export default async function SyllabusExplorerPage() {
  const tree = await getSyllabusTree({ publishedOnly: true });

  const prelims = tree.papers.filter((p) => p.stage === "prelims");
  const mains = tree.papers.filter((p) => p.stage === "mains");

  const hasContent = tree.papers.some((p) =>
    (p.subjects ?? []).some((s) => (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0))
  );

  return (
    <>
      <ForestScene />
      <div className="relative animate-rise-in">
      <h1 className="relative font-display text-3xl font-medium tracking-tight">
        The Forest
      </h1>
      <p className="relative mt-1.5 text-sm text-muted-foreground">
        The living syllabus. Walk it paper by paper — every branch a topic,
        every leaf a micro‑theme. Nothing here competes; everything belongs.
      </p>

      {!hasContent && (
        <div className="mt-12 rounded-2xl border border-dashed bg-card/60 p-12 text-center text-muted-foreground backdrop-blur">
          <Lotus className="mx-auto h-8 w-14 opacity-70" />
          <p className="mt-4 font-display text-lg text-foreground">
            The grove is still being planted
          </p>
          <p className="mt-1 text-sm">
            Published notes will appear here soon — return shortly.
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
                  return (
                    <div
                      key={paper.id}
                      className="overflow-hidden rounded-2xl border bg-card/85 shadow-sm backdrop-blur"
                    >
                      <div className="border-b bg-gradient-to-r from-accent/70 to-transparent px-5 py-3.5">
                        <h3 className="font-display font-semibold">{paper.name}</h3>
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
    </>
  );
}
