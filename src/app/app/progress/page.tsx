import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPyqs, getSyllabusTree } from "@/lib/queries";
import type { Commission, ExamGroup } from "@/lib/database.types";

export const metadata: Metadata = { title: "Progress Tracker" };
export const dynamic = "force-dynamic";

const TRACKS: { c: Commission; g: ExamGroup; label: string }[] = [
  { c: "appsc", g: "1", label: "APPSC · Group 1" },
  { c: "appsc", g: "2", label: "APPSC · Group 2" },
  { c: "tgpsc", g: "1", label: "TGPSC · Group 1" },
  { c: "tgpsc", g: "2", label: "TGPSC · Group 2" },
];

export default async function GlobalProgressPage() {
  const [counts, appscTree] = await Promise.all([
    Promise.all(
      TRACKS.map((t) => getPyqs({ commission: t.c, group: t.g, page: 1 }))
    ),
    getSyllabusTree({ commission: "appsc", group: "1" }),
  ]);

  let total = 0;
  let published = 0;
  for (const p of appscTree.papers) {
    for (const s of p.subjects ?? []) {
      for (const t of s.topics ?? []) {
        for (const m of t.microthemes ?? []) {
          total += 1;
          if (m.status === "published") published += 1;
        }
      }
    }
  }
  const coverage = total ? Math.round((published / total) * 100) : 0;
  const totalPyqs = counts.reduce((a, r) => a + r.total, 0);
  const populated = counts.filter((r) => r.total > 0).length;

  const stats = [
    { label: "APPSC G1 Syllabus Coverage", value: `${coverage}%`, bar: coverage },
    { label: "Total PYQs", value: String(totalPyqs) },
    { label: "Populated Tracks", value: `${populated}/4` },
    { label: "Micro-themes Published", value: `${published}/${total}` },
  ];

  return (
    <div className="animate-rise-in">
      <div className="bhv-section-head">
        <div>
          <p className="bhv-eyebrow">Performance</p>
          <h1 className="bhv-h1" style={{ fontSize: 28, margin: "4px 0 0" }}>
            Progress Tracker
          </h1>
        </div>
        <Link href="/app" className="bhv-back">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>

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
        <h2 style={{ fontSize: 18, margin: "0 0 14px" }}>
          Unified Preparation Overview
        </h2>
        <table className="bhv-table">
          <thead>
            <tr>
              <th>Examination</th>
              <th>Syllabus Coverage</th>
              <th>PYQs</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {TRACKS.map((t, i) => {
              const pyqTotal = counts[i].total;
              const isAppscG1 = t.c === "appsc" && t.g === "1";
              return (
                <tr key={t.label}>
                  <td>
                    <b>{t.label}</b>
                  </td>
                  <td style={{ minWidth: 160 }}>
                    {isAppscG1 ? (
                      <>
                        <div className="bhv-progress-wrap">
                          <div
                            className="bhv-progress-bar"
                            style={{ width: `${coverage}%` }}
                          />
                        </div>
                        <span className="mt-1 inline-block text-xs text-muted-foreground">
                          {coverage}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td>
                    {pyqTotal > 0 ? (
                      pyqTotal
                    ) : (
                      <span className="bhv-badge">No content yet</span>
                    )}
                  </td>
                  <td>
                    <Link
                      href={`/app/g/${t.c}/${t.g}/progress`}
                      className="bhv-btn-secondary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
