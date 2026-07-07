import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getPyqFilterOptions,
  getPyqs,
  type PyqFilters as Filters,
} from "@/lib/queries";
import { PyqFilters } from "@/components/pyq/pyq-filters";
import { PyqPagination } from "@/components/pyq/pyq-pagination";
import {
  AdminPyqTable,
  type AdminPyqRow,
} from "@/components/admin/pyq/admin-pyq-table";
import type { MainsQuestion, PrelimsQuestion } from "@/lib/database.types";

export const metadata: Metadata = { title: "PYQ Manager" };
export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminPyqsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const stageParam = first(sp.stage);
  const statusParam = first(sp.status);
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
    status:
      statusParam === "draft" || statusParam === "published"
        ? statusParam
        : undefined,
    page: first(sp.page) ? Number(first(sp.page)) : 1,
    pageSize: 30,
  };

  const supabase = await createClient();
  const [options, result, microthemesRes] = await Promise.all([
    getPyqFilterOptions(),
    getPyqs(filters),
    supabase
      .from("microthemes")
      .select("id, name, code")
      .order("code"),
  ]);

  const rows: AdminPyqRow[] = result.items.map((item) => {
    const q = item.question;
    const prelims = q.type === "prelims" ? (q as PrelimsQuestion) : null;
    const mains = q.type === "mains" ? (q as MainsQuestion) : null;
    return {
      id: q.id,
      type: q.type,
      microtheme_id: item.microtheme.id,
      microtheme_name: item.microtheme.name,
      microtheme_code: item.microtheme.code,
      year: q.year,
      paper_label: q.paper_label,
      question_text: q.question_text,
      option_a: prelims?.option_a,
      option_b: prelims?.option_b,
      option_c: prelims?.option_c,
      option_d: prelims?.option_d,
      correct_option: prelims?.correct_option,
      explanation: prelims?.explanation ?? null,
      directive_word: mains?.directive_word ?? null,
      marks: mains?.marks ?? null,
      model_answer: mains?.model_answer ?? null,
      keywords: q.keywords ?? [],
      status: q.status,
      tags: item.tags,
    };
  });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">PYQ Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit and publish previous-year questions. Use Bulk Upload for
          large batches.
        </p>
      </div>

      <PyqFilters options={options} />

      <p className="mt-4 text-sm text-muted-foreground">
        {result.total} question{result.total === 1 ? "" : "s"}
      </p>

      <div className="mt-2">
        <AdminPyqTable
          rows={rows}
          microthemes={microthemesRes.data ?? []}
        />
      </div>

      <div className="mt-4">
        <PyqPagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      </div>
    </div>
  );
}
