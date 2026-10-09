import Link from "next/link";
import { Upload } from "lucide-react";
import { getUserAndProfile } from "@/lib/auth";

/** Admin-only upload / manage button for a workspace tab. */
export async function UploadCTA({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { profile } = await getUserAndProfile();
  if (profile?.role !== "admin") return null;
  return (
    <Link href={href} className="bhv-btn-primary">
      <Upload className="h-4 w-4" /> {label}
    </Link>
  );
}

/** Empty-state panel for tracks/tabs with no content yet. */
export async function EmptyTrack({
  title,
  note,
  uploadHref,
  uploadLabel,
}: {
  title: string;
  note: string;
  uploadHref?: string;
  uploadLabel?: string;
}) {
  const { profile } = await getUserAndProfile();
  const isAdmin = profile?.role === "admin";
  return (
    <div className="bhv-panel">
      <div className="bhv-empty">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1">{note}</p>
        {isAdmin && uploadHref && uploadLabel && (
          <div className="mt-4 flex justify-center">
            <Link href={uploadHref} className="bhv-btn-primary">
              <Upload className="h-4 w-4" /> {uploadLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
