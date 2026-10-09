import Link from "next/link";
import Image from "next/image";
import { Settings } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { AppNav, AppMobileNav } from "@/components/app/app-nav";

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
            src="/bhavishya-psc-logo.png"
            alt="Bhavishya"
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

        <AppNav />

        <div className="flex shrink-0 items-center gap-2">
          {profile?.role === "admin" && (
            <Link href="/admin" className="bhv-admin">
              <Settings className="h-4 w-4" /> Manage
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

      <AppMobileNav />
    </div>
  );
}
