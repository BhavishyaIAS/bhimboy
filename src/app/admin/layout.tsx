import Link from "next/link";
import {
  FileQuestion,
  LayoutDashboard,
  ListTree,
  Upload,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/syllabus", label: "Syllabus", icon: ListTree },
  { href: "/admin/pyqs", label: "PYQs", icon: FileQuestion },
  { href: "/admin/bulk-upload", label: "Bulk Upload", icon: Upload },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4">
          <Link href="/admin" className="mr-2 shrink-0 font-bold tracking-tight">
            Bhimboy <span className="text-muted-foreground">Admin</span>
          </Link>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {NAV.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm">
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="outline" size="sm">
              <Link href="/app">View app</Link>
            </Button>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
