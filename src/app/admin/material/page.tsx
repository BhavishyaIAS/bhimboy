import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSyllabusTree } from "@/lib/queries";
import { MaterialManager } from "@/components/admin/material/material-manager";
import type { Material } from "@/lib/database.types";

export const metadata: Metadata = { title: "Material" };
export const dynamic = "force-dynamic";

export default async function MaterialPage() {
  const supabase = await createClient();

  // Admins see the full syllabus (RLS admin_all), including draft nodes.
  const tree = await getSyllabusTree();

  const { data } = await supabase
    .from("materials")
    .select("*")
    .order("created_at", { ascending: false });
  const materials = (data ?? []) as Material[];

  // Private bucket → short-lived signed URLs for preview/download.
  const paths = [...new Set(materials.map((m) => m.file_path).filter(Boolean))];
  const signedUrls: Record<string, string> = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("materials")
      .createSignedUrls(paths, 60 * 60);
    for (const s of signed ?? []) {
      if (s.signedUrl && s.path) signedUrls[s.path] = s.signedUrl;
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">Material</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload study material and notes, organised syllabus-wise, across three
          modules. Pick a syllabus location (paper → subject → topic →
          micro-theme), attach a file, and publish when ready.
        </p>
      </div>

      <MaterialManager tree={tree} materials={materials} signedUrls={signedUrls} />
    </div>
  );
}
