import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Material, MaterialCategory } from "@/lib/database.types";

export const metadata: Metadata = { title: "Material / Notes" };
export const dynamic = "force-dynamic";

const CATS: { key: MaterialCategory; label: string; blurb: string }[] = [
  { key: "comprehensive", label: "Full Notes", blurb: "Comprehensive, syllabus-wide study material." },
  { key: "prelims", label: "Prelims Notes", blurb: "Focused notes for the screening stage." },
  { key: "mains", label: "Mains Notes", blurb: "Answer-oriented notes for the mains papers." },
];

export default async function MaterialsTab({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { group } = await params;
  const { type } = await searchParams;
  const active: MaterialCategory =
    type === "prelims" || type === "mains" ? type : "comprehensive";

  const supabase = await createClient();

  let materials: Material[] = [];
  let unavailable = false;
  try {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) unavailable = true;
    else materials = (data ?? []) as Material[];
  } catch {
    unavailable = true;
  }

  const counts: Record<string, number> = {};
  for (const m of materials) counts[m.category] = (counts[m.category] ?? 0) + 1;

  const rows = materials.filter((m) => m.category === active);

  // Private bucket → short-lived signed URLs for download.
  const signedUrls: Record<string, string> = {};
  const paths = [...new Set(rows.map((m) => m.file_path).filter(Boolean))];
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("materials")
      .createSignedUrls(paths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrls[s.path] = s.signedUrl;
    }
  }

  return (
    <>
      <div className="bhv-note-types">
        {CATS.map((c) => (
          <Link
            key={c.key}
            href={`/app/g/${group}/materials?type=${c.key}`}
            className={`bhv-note-type${c.key === active ? " active" : ""}`}
          >
            <b>{c.label}</b>
            <span>
              {c.blurb} · {counts[c.key] ?? 0} file
              {(counts[c.key] ?? 0) === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>

      <div className="bhv-panel">
        {unavailable ? (
          <div className="bhv-empty">
            Study material isn’t available yet. Please check back soon.
          </div>
        ) : rows.length === 0 ? (
          <div className="bhv-empty">
            No {CATS.find((c) => c.key === active)?.label} published yet.
          </div>
        ) : (
          <table className="bhv-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>File</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const url = signedUrls[m.file_path];
                return (
                  <tr key={m.id}>
                    <td>
                      <b>{m.title}</b>
                    </td>
                    <td className="text-muted-foreground">{m.description || "—"}</td>
                    <td>{m.file_name || "—"}</td>
                    <td>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bhv-btn-primary"
                        >
                          <Download className="h-4 w-4" /> Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
