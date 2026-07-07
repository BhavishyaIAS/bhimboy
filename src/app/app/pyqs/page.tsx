import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { getPyqFilterOptions, getPyqs, type PyqFilters as Filters } from "@/lib/queries";
import { PyqFilters } from "@/components/pyq/pyq-filters";
import { PyqPagination } from "@/components/pyq/pyq-pagination";
import { PrelimsQuestionCard } from "@/components/pyq/prelims-question-card";
import { MainsQuestionCard } from "@/components/pyq/mains-question-card";
import type { CorrectOption, MainsQuestion, PrelimsQuestion } from "@/lib/database.types";

export const metadata: Metadata = { title: "PYQ Vault" };
export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function PyqVaultPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const stageParam = first(sp.stage);
  const filters: Filters = {
    stage:
      stageParam === "prelims" || stageParam === "mains" ? stageParam : undefined,
    paperLabel: first(sp.paper) || undefined,
    year: first(sp.year) ? Number(first(sp.year)) : undefined,
    subjectId: first(sp.subject) || undefined,
    topicId: first(sp.topic) || undefined,
    microthemeId: first(sp.microtheme) || undefined,
    tag: first(sp.tag) || undefined,
    q: first(sp.q) || undefined,
    page: first(sp.page) ? Number(first(sp.page)) : 1,
  };

  const [options, result] = await Promise.all([
    getPyqFilterOptions(),
    getPyqs(filters),
  ]);

  return (
    <div className="mx-auto max-w-3xl animate-rise-in">
      <h1 className="font-display text-3xl font-medium tracking-tight">
        The PYQ Vault
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Every previous‑year question, waiting patiently. Filter, search,
        attempt — the answer appears only when you ask.
      </p>

      <div className="mt-5">
        <PyqFilters options={options} />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {result.total} question{result.total === 1 ? "" : "s"} found
      </p>

      <div className="mt-3 space-y-4">
        {result.items.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card/60 p-12 text-center text-muted-foreground">
            <FileQuestion className="mx-auto h-6 w-6" />
            <p className="mt-3 font-display text-lg text-foreground">
              Stillness — nothing matches these filters
            </p>
            <p className="mt-1 text-sm">Loosen a filter or two and look again.</p>
          </div>
        )}
        {result.items.map((item) =>
          item.question.type === "prelims" ? (
            <PrelimsQuestionCard
              key={`p-${item.question.id}`}
              question={{
                ...(item.question as PrelimsQuestion & { type: "prelims" }),
                correct_option: (item.question as PrelimsQuestion)
                  .correct_option as CorrectOption,
              }}
              microtheme={item.microtheme}
              tags={item.tags}
            />
          ) : (
            <MainsQuestionCard
              key={`m-${item.question.id}`}
              question={item.question as MainsQuestion & { type: "mains" }}
              microtheme={item.microtheme}
              tags={item.tags}
            />
          )
        )}
      </div>

      <div className="mt-6">
        <PyqPagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      </div>
    </div>
  );
}
