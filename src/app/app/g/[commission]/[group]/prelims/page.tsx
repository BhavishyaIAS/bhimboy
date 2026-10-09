import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  PyqVault,
  buildPyqFilters,
  type PyqSearchParams,
} from "@/components/app/pyq-vault";
import { EmptyTrack, UploadCTA } from "@/components/app/track";
import { commissionShort, isCommission, isGroup, trackHasContent } from "@/lib/exam";

export const metadata: Metadata = { title: "Prelims PYQs" };
export const dynamic = "force-dynamic";

export default async function PrelimsTab({
  params,
  searchParams,
}: {
  params: Promise<{ commission: string; group: string }>;
  searchParams: Promise<PyqSearchParams>;
}) {
  const { commission, group } = await params;
  if (!isCommission(commission) || !isGroup(group)) notFound();
  const sp = await searchParams;

  if (!trackHasContent(commission, group)) {
    return (
      <EmptyTrack
        title="No Prelims PYQs yet"
        note={`Prelims previous-year questions for ${commissionShort(commission)} Group ${group} haven’t been uploaded yet.`}
        uploadHref="/admin/bulk-upload"
        uploadLabel="Upload Prelims PYQs"
      />
    );
  }

  return (
    <>
      <div className="bhv-section-head" style={{ marginTop: 0 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Prelims PYQs</h2>
        <UploadCTA href="/admin/bulk-upload" label="Upload Prelims PYQs" />
      </div>
      <PyqVault filters={buildPyqFilters(sp, "prelims")} lockStage />
    </>
  );
}
