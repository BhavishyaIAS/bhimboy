import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPyqs, getSyllabusTree } from "@/lib/queries";

export const metadata: Metadata = { title: "Progress Tracker" };
export const dynamic = "force-dynamic";

export default async function GlobalProgressPage() {
  const [tree, prelims, mains] = await Promise.all([
    getSyllabusTree(),
    getPyqs({ stage: "prelims", page: 1 }),
    getPyqs({ stage: "mains", page: 1 }),
  ]);

  let total = 0;
  let published = 0;
  for (const p of tree.papers) {
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

  const stats = [
    { label: "Syllabus Coverage", value: `${coverage}%`, bar: coverage },
    { label: "Micro-themes Published", value: `${published}/${total}` },
    { label: "Prelims PYQs", value: String(prelims.total) },
    { label: "Mains PYQs", value: String(mains.total) },
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
              <th>Prelims PYQs</th>
              <th>Mains PYQs</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: "Group 1", n: "1" },
              { name: "Group 2", n: "2" },
            ].map((g) => (
              <tr key={g.n}>
                <td>
                  <b>{g.name}</b>
                </td>
                <td style={{ minWidth: 160 }}>
                  <div className="bhv-progress-wrap">
                    <div
                      className="bhv-progress-bar"
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                  <span className="mt-1 inline-block text-xs text-muted-foreground">
                    {coverage}%
                  </span>
                </td>
                <td>{prelims.total}</td>
                <td>{mains.total}</td>
                <td>
                  <Link href={`/app/g/${g.n}/progress`} className="bhv-btn-secondary">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
