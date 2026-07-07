import Link from "next/link";
import { FileQuestion, ListTree, Search, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { HeaderSearch } from "@/components/app/header-search";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4">
          <Link href="/app" className="shrink-0 text-lg font-bold tracking-tight">
            Bhimboy
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/syllabus">Syllabus</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/pyqs">PYQ Vault</Link>
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <HeaderSearch />
            {profile?.role === "admin" && (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/admin">
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              </Button>
            )}
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 sm:pb-10">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background sm:hidden">
        <div className="grid grid-cols-3">
          {[
            { href: "/app/syllabus", label: "Syllabus", icon: ListTree },
            { href: "/app/pyqs", label: "PYQs", icon: FileQuestion },
            { href: "/app/search", label: "Search", icon: Search },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
