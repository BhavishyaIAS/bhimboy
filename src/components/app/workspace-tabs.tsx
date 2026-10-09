"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { slug: string; label: string; adminOnly?: boolean };

const TABS: Tab[] = [
  { slug: "syllabus", label: "Syllabus Detailer", adminOnly: true },
  { slug: "progress", label: "Progress Tracker" },
  { slug: "prelims", label: "Prelims PYQs" },
  { slug: "mains", label: "Mains PYQs" },
  { slug: "materials", label: "Material / Notes" },
];

export function WorkspaceTabs({
  commission,
  group,
  isAdmin,
}: {
  commission: string;
  group: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const base = `/app/g/${commission}/${group}`;
  const visible = TABS.filter((t) => isAdmin || !t.adminOnly);

  return (
    <div className="bhv-tabs">
      {visible.map((t, i) => {
        const href = `${base}/${t.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={t.slug}
            href={href}
            className={`bhv-tab${active ? " active" : ""}`}
          >
            {i + 1}. {t.label}
          </Link>
        );
      })}
    </div>
  );
}
