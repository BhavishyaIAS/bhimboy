"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Layers } from "lucide-react";

// In-app navigation, per the prototype: Home · Group 1 · Group 2 · Progress
// Tracker. Group links follow the commission currently in context (from the
// URL); on Home they default to APPSC.
function useContext(pathname: string) {
  const m = pathname.match(/^\/app\/g\/(appsc|tgpsc)\/([12])/);
  return { commission: m?.[1] ?? "appsc", group: m?.[2] ?? null };
}

export function AppNav() {
  const pathname = usePathname();
  const { commission, group } = useContext(pathname);

  const items = [
    { href: "/app", label: "Home", active: pathname === "/app" },
    {
      href: `/app/g/${commission}/1`,
      label: "Group 1",
      active: group === "1",
    },
    {
      href: `/app/g/${commission}/2`,
      label: "Group 2",
      active: group === "2",
    },
    {
      href: "/app/progress",
      label: "Progress Tracker",
      active: pathname.startsWith("/app/progress"),
    },
  ];

  return (
    <nav className="bhv-nav">
      {items.map((it) => (
        <Link
          key={it.label}
          href={it.href}
          className={`bhv-nav-link${it.active ? " active" : ""}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppMobileNav() {
  const pathname = usePathname();
  const { commission, group } = useContext(pathname);

  const items = [
    { href: "/app", label: "Home", icon: Home, active: pathname === "/app" },
    {
      href: `/app/g/${commission}/1`,
      label: "Group 1",
      icon: BookOpen,
      active: group === "1",
    },
    {
      href: `/app/g/${commission}/2`,
      label: "Group 2",
      icon: Layers,
      active: group === "2",
    },
    {
      href: "/app/progress",
      label: "Progress",
      icon: BarChart3,
      active: pathname.startsWith("/app/progress"),
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md sm:hidden">
      <div className="grid grid-cols-4">
        {items.map((it) => (
          <Link
            key={it.label}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
              it.active ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            <it.icon className="h-5 w-5" />
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
