import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getUserAndProfile } from "@/lib/auth";
import { getSyllabusTree } from "@/lib/queries";
import { SyllabusTreeView } from "@/components/app/syllabus-tree-view";
import { EmptyTrack, UploadCTA } from "@/components/app/track";
import { commissionShort, isCommission, isGroup } from "@/lib/exam";

export const metadata: Metadata = { title: "Syllabus Detailer" };
export const dynamic = "force-dynamic";

export default async function SyllabusTab({
  params,
}: {
  params: Promise<{ commission: string; group: string }>;
}) {
  const { commission, group } = await params;
  if (!isCommission(commission) || !isGroup(group)) notFound();

  const { profile } = await getUserAndProfile();
  // The Syllabus Detailer (the "Forest") is admin-only.
  if (profile?.role !== "admin") redirect(`/app/g/${commission}/${group}/prelims`);

  const tree = await getSyllabusTree({ commission, group });
  const hasPapers = tree.papers.some((p) =>
    (p.subjects ?? []).some((s) =>
      (s.topics ?? []).some((t) => (t.microthemes ?? []).length > 0)
    )
  );

  if (!hasPapers) {
    return (
      <EmptyTrack
        title="No syllabus mapped yet"
        note={`Build the ${commissionShort(commission)} Group ${group} syllabus tree and map resources to it.`}
        uploadHref="/admin/syllabus"
        uploadLabel="Manage Syllabus"
      />
    );
  }

  return (
    <div className="bhv-panel">
      <div className="bhv-section-head" style={{ marginTop: 0 }}>
        <div className="flex items-center gap-3">
          <h2 style={{ fontSize: 18, margin: 0 }}>Syllabus Detailer</h2>
          <span className="bhv-badge">Admin only</span>
        </div>
        <UploadCTA href="/admin/syllabus" label="Manage Syllabus" />
      </div>
      <SyllabusTreeView tree={tree} />
    </div>
  );
}
