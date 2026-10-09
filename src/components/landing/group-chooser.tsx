import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";

type Commission = {
  short: string; // APPSC / TGPSC
  full: string; // full commission name
};

const FEATURES = [
  "Syllabus Detailer",
  "Progress Tracker",
  "Prelims PYQs",
  "Mains PYQs",
  "Materials",
];

/**
 * Second step of the landing flow: after picking a commission, the aspirant
 * chooses Group 1 or Group 2. Both groups lead into the preparation platform
 * (or to login when signed out).
 */
export function GroupChooser({
  commission,
  loggedIn,
}: {
  commission: Commission;
  loggedIn: boolean;
}) {
  const enterHref = loggedIn ? "/app/syllabus" : "/login";

  const groups = [
    {
      cls: "bhv-exam1",
      name: "GROUP 1",
      text: `The complete ${commission.short} Group 1 journey — from the prelims screening through the descriptive mains papers and the interview.`,
    },
    {
      cls: "bhv-exam2",
      name: "GROUP 2",
      text: `Structured ${commission.short} Group 2 preparation across the screening test and the main examination, mapped subject by subject.`,
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader loggedIn={loggedIn} />

      <div className="bhv-page animate-rise-in">
        <section className="bhv-section-head">
          <div>
            <p className="bhv-eyebrow">{commission.full}</p>
            <h1 className="bhv-h1">Choose Your Group</h1>
          </div>
          <Link href="/" className="bhv-back">
            <ArrowLeft className="h-4 w-4" /> All exams
          </Link>
        </section>

        <section className="bhv-landing">
          {groups.map((g) => (
            <Link key={g.name} href={enterHref} className={`bhv-exam-card ${g.cls}`}>
              <span className="bhv-arrow">↗</span>
              <h2>
                {commission.short} · {g.name}
              </h2>
              <p>{g.text}</p>
              <div className="bhv-features">
                {FEATURES.map((f) => (
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
          Bhavishya·PSCs — Learn · Practice · Perform.
        </p>
      </div>
    </main>
  );
}
