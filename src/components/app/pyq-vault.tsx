import { FileQuestion } from "lucide-react";
import {
  getPyqFilterOptions,
  getPyqs,
  type PyqFilters as Filters,
} from "@/lib/queries";
import { PyqFilters } from "@/components/pyq/pyq-filters";
import { PyqPagination } from "@/components/pyq/pyq-pagination";
import { PrelimsQuestionCard } from "@/components/pyq/prelims-question-card";
import { MainsQuestionCard } from "@/components/pyq/mains-question-card";
import type {
  CorrectOption,
  MainsQuestion,
  PrelimsQuestion,
} from "@/lib/database.types";

export type PyqSearchParams = {
  [key: string]: string | string[] | undefined;
};

/** Build PYQ query filters from URL search params with a fixed stage. */
export function buildPyqFilters(
  sp: PyqSearchParams,
  stage: "prelims" | "mains"
): Filters {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  return {
    stage,
    paperLabel: first(sp.paper) || undefined,
    year: first(sp.year) ? Number(first(sp.year)) : undefined,
    subjectId: first(sp.subject) || undefined,
    topicId: first(sp.topic) || undefined,
    microthemeId: first(sp.microtheme) || undefined,
    tag: first(sp.tag) || undefined,
    q: first(sp.q) || undefined,
    page: first(sp.page) ? Number(first(sp.page)) : 1,
  };
}

/**
 * Shared PYQ Vault listing (filters + question cards + pagination).
 * Used by the standalone vault page and by the Prelims/Mains workspace tabs.
 * When `lockStage` is set the stage selector is hidden and the stage passed
 * in `filters` is authoritative (the tab decides prelims vs mains).
 */
export async function PyqVault({
  filters,
  lockStage = false,
}: {
  filters: Filters;
  lockStage?: boolean;
}) {
  const [options, result] = await Promise.all([
    getPyqFilterOptions(),
    getPyqs(filters),
  ]);

  return (
    <div className="bhv-panel">
      <PyqFilters options={options} lockStage={lockStage} />

      <p className="mt-4 text-sm text-muted-foreground">
        {result.total} question{result.total === 1 ? "" : "s"} found
      </p>

      <div className="mt-3 space-y-4">
        {result.items.length === 0 && (
          <div className="bhv-empty">
            <FileQuestion className="mx-auto h-6 w-6" />
            <p className="mt-3 text-base font-semibold text-foreground">
              Nothing matches these filters
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
