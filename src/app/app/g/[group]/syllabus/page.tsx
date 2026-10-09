import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getSyllabusTree } from "@/lib/queries";
import { SyllabusTreeView } from "@/components/app/syllabus-tree-view";

export const metadata: Metadata = { title: "Syllabus Detailer" };
export const dynamic = "force-dynamic";

export default async function SyllabusTab({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const { profile } = await getUserAndProfile();
  // The Syllabus Detailer (the "Forest") is admin-only.
  if (profile?.role !== "admin") redirect(`/app/g/${group}/prelims`);

  const tree = await getSyllabusTree();

  return (
    <div className="bhv-panel">
      <div className="bhv-section-head" style={{ marginTop: 0 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Syllabus Detailer</h2>
        <span className="bhv-badge">Admin only</span>
      </div>
      <SyllabusTreeView tree={tree} />
    </div>
  );
}
