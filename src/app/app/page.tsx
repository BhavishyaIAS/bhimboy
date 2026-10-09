import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BarChart3, ChevronRight, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Home" };

// Prototype "Home": choose a commission, then a group. Real content currently
// lives under APPSC Group 1; other tracks open to empty states with uploads.
export default function AppHomePage() {
  const commissions = [
    {
      key: "appsc",
      cls: "appsc",
      title: "APPSC",
      full: "Andhra Pradesh Public Service Commission",
      emblem: "/appsc-emblem.jpg",
    },
    {
      key: "tgpsc",
      cls: "tgpsc",
      title: "TGPSC",
      full: "Telangana Public Service Commission",
      emblem: "/tgpsc-emblem.jpg",
    },
  ];

  return (
    <div className="animate-rise-in">
      <section className="pb-2 pt-1">
        <p className="bhv-eyebrow">APPSC • Structured Preparation Ecosystem</p>
        <h1 className="bhv-h1">One Platform. Every Stage of Preparation.</h1>
        <p className="bhv-lead">
          Choose your commission and group to open its preparation workspace —
          syllabus, progress, Prelims &amp; Mains PYQs and study material.
        </p>
      </section>

      <section className="psc-grid" style={{ marginTop: 18 }}>
        {commissions.map((c) => (
          <div key={c.key} className={`psc-exam ${c.cls}`}>
            <div className="psc-seal">
              <Image src={c.emblem} alt={`${c.title} emblem`} width={96} height={96} />
            </div>
            <h2 className="psc-exam-title">{c.title}</h2>
            <p className="psc-exam-sub">{c.full}</p>
            <div className="psc-group-row">
              <Link href={`/app/g/${c.key}/1`} className="psc-group-btn">
                <FileText className="h-5 w-5" />
                Group - 1
                <ChevronRight className="chev h-5 w-5" />
              </Link>
              <Link href={`/app/g/${c.key}/2`} className="psc-group-btn">
                <BarChart3 className="h-5 w-5" />
                Group - 2
                <ChevronRight className="chev h-5 w-5" />
              </Link>
            </div>
          </div>
        ))}
      </section>

      <p className="bhv-footer">
        Content is currently available for APPSC Group 1. Other tracks are ready
        for upload.
      </p>
    </div>
  );
}
