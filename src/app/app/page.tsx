import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

// Prototype "Home" view: hero + the two preparation workspaces (Group 1 / 2).
export default function AppHomePage() {
  const groups = [
    {
      cls: "bhv-exam1",
      name: "GROUP 1",
      href: "/app/g/1",
      text: "Complete preparation workspace for APPSC Group 1 Prelims and Mains.",
    },
    {
      cls: "bhv-exam2",
      name: "GROUP 2",
      href: "/app/g/2",
      text: "Complete preparation workspace for APPSC Group 2 Prelims and Mains.",
    },
  ];

  const features = [
    "Syllabus Detailer",
    "Progress Tracker",
    "Prelims PYQs",
    "Mains PYQs",
    "Materials",
  ];

  return (
    <div className="animate-rise-in">
      <section className="pb-2 pt-1">
        <p className="bhv-eyebrow">APPSC • Structured Preparation Ecosystem</p>
        <h1 className="bhv-h1">One Platform. Every Stage of Preparation.</h1>
        <p className="bhv-lead">
          Select your examination and access syllabus mapping, progress tracking,
          Prelims &amp; Mains PYQs, and syllabus-wise study materials.
        </p>
      </section>

      <section className="bhv-landing">
        {groups.map((g) => (
          <Link key={g.name} href={g.href} className={`bhv-exam-card ${g.cls}`}>
            <span className="bhv-arrow">↗</span>
            <h2>{g.name}</h2>
            <p>{g.text}</p>
            <div className="bhv-features">
              {features.map((f) => (
                <span key={f} className="bhv-pill">
                  {f}
                </span>
              ))}
            </div>
            <span className="font-extrabold tracking-wide">ENTER {g.name} →</span>
          </Link>
        ))}
      </section>

      <p className="bhv-footer">
        Bhavishya·PSCs • Structured Preparation Ecosystem • Syllabus-mapped
        content, PYQs and materials.
      </p>
    </div>
  );
}
