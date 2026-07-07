import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  FileQuestion,
  ListTree,
  PenLine,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BulkUploadLog } from "@/lib/database.types";

export const metadata: Metadata = { title: "Admin dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    microthemes,
    publishedNotes,
    prelimsCount,
    mainsCount,
    draftMicrothemes,
    draftNotes,
    draftPrelims,
    draftMains,
    uploads,
  ] = await Promise.all([
    supabase.from("microthemes").select("id", { count: "exact", head: true }),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("prelims_questions").select("id", { count: "exact", head: true }),
    supabase.from("mains_questions").select("id", { count: "exact", head: true }),
    supabase
      .from("microthemes")
      .select("id, name, code")
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("notes")
      .select("id, microtheme:microthemes (id, name, code)")
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("prelims_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("mains_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("bulk_upload_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    {
      label: "Micro-themes",
      value: microthemes.count ?? 0,
      icon: ListTree,
      href: "/admin/syllabus",
    },
    {
      label: "Published notes",
      value: publishedNotes.count ?? 0,
      icon: BookOpen,
      href: "/admin/syllabus",
    },
    {
      label: "Prelims questions",
      value: prelimsCount.count ?? 0,
      icon: FileQuestion,
      href: "/admin/pyqs?stage=prelims",
    },
    {
      label: "Mains questions",
      value: mainsCount.count ?? 0,
      icon: FileQuestion,
      href: "/admin/pyqs?stage=mains",
    },
  ];

  const draftNoteRows = (draftNotes.data ?? []) as unknown as {
    id: string;
    microtheme: { id: string; name: string; code: string } | null;
  }[];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="p-4">
                <s.icon className="h-5 w-5 text-muted-foreground" />
                <p className="mt-2 text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {draftMicrothemes.data?.length === 0 &&
              draftNoteRows.length === 0 &&
              (draftPrelims.count ?? 0) === 0 &&
              (draftMains.count ?? 0) === 0 && (
                <p className="text-muted-foreground">
                  Nothing in draft — everything is published. 🎉
                </p>
              )}

            {(draftMicrothemes.data?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 font-medium">Draft micro-themes</p>
                <ul className="space-y-1">
                  {draftMicrothemes.data!.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/admin/microthemes/${m.id}`}
                        className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-accent"
                      >
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.code}
                        </Badge>
                        <span className="truncate">{m.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {draftNoteRows.length > 0 && (
              <div>
                <p className="mb-1.5 font-medium">Draft notes</p>
                <ul className="space-y-1">
                  {draftNoteRows.map(
                    (n) =>
                      n.microtheme && (
                        <li key={n.id}>
                          <Link
                            href={`/admin/microthemes/${n.microtheme.id}`}
                            className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-accent"
                          >
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {n.microtheme.code}
                            </Badge>
                            <span className="truncate">{n.microtheme.name}</span>
                          </Link>
                        </li>
                      )
                  )}
                </ul>
              </div>
            )}

            {((draftPrelims.count ?? 0) > 0 || (draftMains.count ?? 0) > 0) && (
              <p className="text-muted-foreground">
                Draft questions:{" "}
                <Link href="/admin/pyqs?status=draft" className="underline">
                  {(draftPrelims.count ?? 0) + (draftMains.count ?? 0)} awaiting
                  review
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> Recent uploads
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {(uploads.data ?? []).length === 0 ? (
              <div className="text-muted-foreground">
                <p>No bulk uploads yet.</p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/admin/bulk-upload">Upload PYQs from Excel</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {(uploads.data as BulkUploadLog[]).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleString()} · {u.type}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Badge variant="success">{u.rows_inserted} in</Badge>
                      {u.rows_failed > 0 && (
                        <Badge variant="destructive">{u.rows_failed} failed</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
