import Link from "next/link";
import { BarChart3, ChevronRight, FileText, Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";

// Bhavishya·PSCs — "Choose Your Exam": pick a state commission (APPSC / TGPSC),
// then navigate to that commission's Group 1 / Group 2 chooser.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const commissions = [
    {
      key: "appsc",
      cls: "appsc",
      title: "APPSC",
      full: "Andhra Pradesh Public Service Commission",
      href: "/appsc",
    },
    {
      key: "tgpsc",
      cls: "tgpsc",
      title: "TGPSC",
      full: "Telangana Public Service Commission",
      href: "/tgpsc",
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <SiteHeader loggedIn={!!user} />

      <div className="psc-page animate-rise-in">
        <section className="psc-hero">
          <p className="psc-eyebrow">Your Partner for State PSC Exams</p>
          <h1 className="psc-h1">
            Choose Your <span className="psc-accent">Exam</span>
          </h1>
          <p className="psc-taglines">
            Structured Learning <span className="sep">|</span> Quality Content{" "}
            <span className="sep">|</span> Exam-Focused Practice
          </p>
        </section>

        <section className="psc-grid">
          {commissions.map((c) => (
            <div key={c.key} className={`psc-exam ${c.cls}`}>
              <div className="psc-seal">
                <Landmark className="h-10 w-10 text-white/90" />
              </div>
              <h2 className="psc-exam-title">{c.title}</h2>
              <p className="psc-exam-sub">{c.full}</p>

              <div className="psc-group-row">
                <Link href={c.href} className="psc-group-btn">
                  <FileText className="h-5 w-5" />
                  Group - 1
                  <ChevronRight className="chev h-5 w-5" />
                </Link>
                <Link href={c.href} className="psc-group-btn">
                  <BarChart3 className="h-5 w-5" />
                  Group - 2
                  <ChevronRight className="chev h-5 w-5" />
                </Link>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
