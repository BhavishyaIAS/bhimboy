import Link from "next/link";
import type { Metadata } from "next";
import { getSyllabusTree } from "@/lib/queries";
import { EXAMS, EXAM_IDS, isExamId, DEFAULT_EXAM, type ExamId } from "@/lib/exams";
import { SyllabusManager } from "@/components/admin/syllabus/syllabus-manager";

export const metadata: Metadata = { title: "Syllabus Manager" };
export const dynamic = "force-dynamic";

export default async function AdminSyllabusPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const sp = await searchParams;
  const exam: ExamId =
    sp.exam && isExamId(sp.exam) ? sp.exam : DEFAULT_EXAM;

  const tree = await getSyllabusTree({ exam });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Syllabus Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Papers → Subjects → Topics → Micro-themes. Drag to reorder, click a
          name or code to edit, toggle draft/published, and open{" "}
          <span className="font-medium text-foreground">Content</span> to write
          notes.
        </p>
        <div className="mt-4 inline-flex items-center gap-1 rounded-full border bg-card p-1">
          {EXAM_IDS.map((id) => (
            <Link
              key={id}
              href={`/admin/syllabus?exam=${id}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                id === exam
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {EXAMS[id].name}
            </Link>
          ))}
        </div>
      </div>
      <SyllabusManager key={exam} tree={tree} exam={exam} />
    </div>
  );
}
