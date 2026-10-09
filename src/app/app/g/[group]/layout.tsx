import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { WorkspaceTabs } from "@/components/app/workspace-tabs";

export default async function GroupWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  if (group !== "1" && group !== "2") notFound();

  const { profile } = await requireUser();
  const isAdmin = profile?.role === "admin";
  const title = `Group ${group}`;

  return (
    <div className="animate-rise-in">
      <div className="bhv-section-head">
        <div>
          <p className="bhv-eyebrow">{title.toUpperCase()} • Preparation Workspace</p>
          <h1 className="bhv-h1" style={{ fontSize: 28, margin: "4px 0 0" }}>
            {title}
          </h1>
        </div>
        <Link href="/app" className="bhv-back">
          <ArrowLeft className="h-4 w-4" /> All Exams
        </Link>
      </div>

      <WorkspaceTabs group={group} isAdmin={isAdmin} />

      <div className="content">{children}</div>
    </div>
  );
}
