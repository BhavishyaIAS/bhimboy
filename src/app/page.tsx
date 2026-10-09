import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

// Bhavishya IAS — APPSC Group 1 & Group 2 structured preparation ecosystem.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enterHref = user ? "/app/syllabus" : "/login";

  const exams = [
    {
      cls: "bhv-exam1",
      name: "GROUP 1",
      text: "The complete APPSC Group 1 journey — from the prelims general studies screening to the six descriptive mains papers and the interview.",
      features: [
        "Syllabus Detailer",
        "Progress Tracker",
        "Prelims PYQs",
        "Mains PYQs",
        "Materials",
      ],
    },
    {
      cls: "bhv-exam2",
      name: "GROUP 2",
      text: "Structured Group 2 preparation across the screening test and the main examination, mapped subject-by-subject with model answers and notes.",
      features: [
        "Syllabus Detailer",
        "Progress Tracker",
        "Prelims PYQs",
        "Mains PYQs",
        "Materials",
      ],
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      {/* Brand topbar */}
      <header className="bhv-topbar">
        <Link href="/" className="bhv-brand">
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
        <nav className="bhv-nav" />
        <div className="flex shrink-0 items-center gap-2">
          {user ? (
            <Link href="/app/syllabus" className="bhv-admin">
              Enter platform →
            </Link>
          ) : (
            <>
              <Link href="/login" className="bhv-nav-link">
                Log in
              </Link>
              <Link href="/signup" className="bhv-admin">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="bhv-page animate-rise-in">
        {/* Hero */}
        <section className="pb-2 pt-1">
          <p className="bhv-eyebrow">APPSC • Structured Preparation Ecosystem</p>
          <h1 className="bhv-h1">One Platform. Every Stage of Preparation.</h1>
          <p className="bhv-lead">
            Syllabus detailer, progress tracker, prelims &amp; mains previous-year
            questions, model answers and curated study material — organised
            micro-theme by micro-theme for APPSC Group 1 &amp; Group 2 aspirants.
          </p>
        </section>

        {/* Exam cards */}
        <section className="bhv-landing">
          {exams.map((ex) => (
            <Link key={ex.name} href={enterHref} className={`bhv-exam-card ${ex.cls}`}>
              <span className="bhv-arrow">↗</span>
              <h2>{ex.name}</h2>
              <p>{ex.text}</p>
              <div className="bhv-features">
                {ex.features.map((f) => (
                  <span key={f} className="bhv-pill">
                    {f}
                  </span>
                ))}
              </div>
              <span className="font-extrabold tracking-wide">
                ENTER {ex.name} →
              </span>
            </Link>
          ))}
        </section>

        <p className="bhv-footer">
          Bhavishya IAS — a structured preparation ecosystem for APPSC Group 1 &amp;
          Group 2 aspirants.
        </p>
      </div>
    </main>
  );
}
