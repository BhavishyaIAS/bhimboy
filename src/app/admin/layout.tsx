import Link from "next/link";
import Image from "next/image";
import {
  FileQuestion,
  LayoutDashboard,
  Library,
  ListTree,
  Upload,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/syllabus", label: "Syllabus", icon: ListTree },
  { href: "/admin/material", label: "Material", icon: Library },
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
      <header className="bhv-topbar">
        <Link href="/admin" className="bhv-brand">
          <Image
            src="/bhavishya-psc-logo.png"
            alt="Bhavishya IAS"
            width={68}
            height={68}
            className="bhv-brand-logo"
            priority
          />
          <span>
            <b>Bhavishya IAS</b>
            <span>MANAGE · CONTENT STUDIO</span>
          </span>
        </Link>

        <nav className="bhv-nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="bhv-nav-link">
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/app" className="bhv-admin">
            View app
          </Link>
          <form action={logout}>
            <button type="submit" className="bhv-nav-link">
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-7">
        {children}
      </main>
    </div>
  );
}
