"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Layers } from "lucide-react";

// In-app navigation, exactly per the prototype:
// Home · Group 1 · Group 2 · Progress Tracker  (Manage lives in the shell).
const ITEMS = [
  { href: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" },
  {
    href: "/app/g/1",
    label: "Group 1",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/app/g/1"),
  },
  {
    href: "/app/g/2",
    label: "Group 2",
    icon: Layers,
    match: (p: string) => p.startsWith("/app/g/2"),
  },
  {
    href: "/app/progress",
    label: "Progress Tracker",
    icon: BarChart3,
    match: (p: string) => p.startsWith("/app/progress"),
  },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="bhv-nav">
      {ITEMS.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`bhv-nav-link${it.match(pathname) ? " active" : ""}`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function AppMobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur-md sm:hidden">
      <div className="grid grid-cols-4">
        {ITEMS.map((it) => {
          const active = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <it.icon className="h-5 w-5" />
              {it.label === "Progress Tracker" ? "Progress" : it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
