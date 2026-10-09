import Link from "next/link";
import Image from "next/image";
import { FileQuestion, Library, ListTree, Search, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { HeaderSearch } from "@/components/app/header-search";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bhv-topbar">
        <Link href="/app" className="bhv-brand">
          <Image
            src="/bhavishya-logo.png"
            alt="Bhavishya IAS"
            width={68}
            height={68}
            className="bhv-brand-logo"
            priority
          />
          <span>
            <b>Bhavishya IAS</b>
            <span>APPSC GROUP 1 &amp; GROUP 2 PREPARATION</span>
          </span>
        </Link>

        <nav className="bhv-nav">
          <Link href="/app" className="bhv-nav-link">
            Home
          </Link>
          <Link href="/app/syllabus" className="bhv-nav-link">
            <ListTree className="h-4 w-4" /> Syllabus
          </Link>
          <Link href="/app/pyqs" className="bhv-nav-link">
            <FileQuestion className="h-4 w-4" /> PYQ Vault
          </Link>
          <Link href="/app/search" className="bhv-nav-link">
            <Search className="h-4 w-4" /> Search
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <HeaderSearch />
          {profile?.role === "admin" && (
            <Link href="/admin" className="bhv-admin">
              <ShieldCheck className="h-4 w-4" /> Manage
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="bhv-nav-link">
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-7 sm:pb-10">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md sm:hidden">
        <div className="grid grid-cols-4">
          {[
            { href: "/app/syllabus", label: "Syllabus", icon: ListTree },
            { href: "/app/pyqs", label: "PYQs", icon: FileQuestion },
            { href: "/app/search", label: "Search", icon: Search },
            { href: "/app", label: "Home", icon: Library },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
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
