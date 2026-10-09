import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPyqs, getSyllabusTree } from "@/lib/queries";
import { EmptyTrack } from "@/components/app/track";
import { commissionShort, isCommission, isGroup, trackHasContent } from "@/lib/exam";

export const metadata: Metadata = { title: "Progress Tracker" };
export const dynamic = "force-dynamic";

export default async function ProgressTab({
  params,
}: {
  params: Promise<{ commission: string; group: string }>;
}) {
  const { commission, group } = await params;
  if (!isCommission(commission) || !isGroup(group)) notFound();

  if (!trackHasContent(commission, group)) {
    return (
      <EmptyTrack
        title="No progress to track yet"
        note={`Once ${commissionShort(commission)} Group ${group} syllabus, PYQs and materials are uploaded, coverage will appear here.`}
        uploadHref="/admin/syllabus"
        uploadLabel="Start uploading"
      />
    );
  }

  const [tree, prelims, mains] = await Promise.all([
    getSyllabusTree(),
    getPyqs({ stage: "prelims", page: 1 }),
    getPyqs({ stage: "mains", page: 1 }),
  ]);

  const papers = tree.papers
    .map((p) => {
      const micros = (p.subjects ?? []).flatMap((s) =>
        (s.topics ?? []).flatMap((t) => t.microthemes ?? [])
      );
      const pub = micros.filter((m) => m.status === "published").length;
      return {
        name: p.name,
        stage: p.stage,
        total: micros.length,
        pub,
        pct: micros.length ? Math.round((pub / micros.length) * 100) : 0,
      };
    })
    .filter((p) => p.total > 0);

  const total = papers.reduce((a, p) => a + p.total, 0);
  const published = papers.reduce((a, p) => a + p.pub, 0);
  const coverage = total ? Math.round((published / total) * 100) : 0;

  const stats: { label: string; value: string; bar?: number }[] = [
    { label: "Syllabus Coverage", value: `${coverage}%`, bar: coverage },
    { label: "Micro-themes Published", value: `${published}/${total}` },
    { label: "Prelims PYQs", value: String(prelims.total) },
    { label: "Mains PYQs", value: String(mains.total) },
  ];

  return (
    <>
      <div className="bhv-statgrid">
        {stats.map((s) => (
          <div key={s.label} className="bhv-stat">
            <b>{s.value}</b>
            <span>{s.label}</span>
            {s.bar !== undefined && (
              <div className="bhv-progress-wrap" style={{ marginTop: 12 }}>
                <div className="bhv-progress-bar" style={{ width: `${s.bar}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bhv-panel">
        <div className="bhv-section-head" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>
            {commissionShort(commission)} Group {group} • Content Coverage
          </h2>
        </div>
        <table className="bhv-table">
          <thead>
            <tr>
              <th>Paper</th>
              <th>Stage</th>
              <th>Micro-themes</th>
              <th>Published</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((p) => (
              <tr key={p.name}>
                <td>
                  <b>{p.name}</b>
                </td>
                <td>
                  <span className="bhv-badge">
                    {p.stage === "prelims" ? "Prelims" : "Mains"}
                  </span>
                </td>
                <td>{p.total}</td>
                <td>{p.pub}</td>
                <td style={{ minWidth: 160 }}>
                  <div className="bhv-progress-wrap">
                    <div
                      className="bhv-progress-bar"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  <span className="mt-1 inline-block text-xs text-muted-foreground">
                    {p.pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
