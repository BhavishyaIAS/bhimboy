import type { Metadata } from "next";
import { getSyllabusTree } from "@/lib/queries";
import { SyllabusManager } from "@/components/admin/syllabus/syllabus-manager";

export const metadata: Metadata = { title: "Syllabus Manager" };
export const dynamic = "force-dynamic";

export default async function AdminSyllabusPage() {
  const tree = await getSyllabusTree();

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
      </div>
      <SyllabusManager tree={tree} />
    </div>
  );
}
