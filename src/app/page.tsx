import Link from "next/link";
import { BookOpen, FileQuestion, ListTree, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { FallingLeaves } from "@/components/decor/falling-leaves";
import { LeafDivider, Lotus } from "@/components/decor/ornaments";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const features = [
    {
      icon: ListTree,
      title: "One micro-theme at a time",
      text: "The whole syllabus, broken into 458 small, learnable units — notes, video, PYQs and key terms gathered in one quiet place for each.",
    },
    {
      icon: BookOpen,
      title: "Notes made for stillness",
      text: "A distraction-free reading room with diagrams, tables and images — designed for long evenings with your phone and a cup of chai.",
    },
    {
      icon: FileQuestion,
      title: "The PYQ Vault",
      text: "Every previous-year question, filterable by paper, year, topic and tags — answers revealed only when you're ready.",
    },
    {
      icon: Search,
      title: "Search that listens",
      text: "One search across notes, questions and glossary — ask, and the right micro-theme appears.",
    },
  ];

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* dawn light + falling leaves over the whole first view */}
      <div className="dawn-sky pointer-events-none absolute inset-x-0 top-0 h-[110vh]" />
      <FallingLeaves density="full" className="fixed inset-0 z-0 h-screen" />

      <header className="relative z-10">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <span className="font-display text-xl font-semibold italic tracking-tight">
            Bhimboy
          </span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm" className="rounded-full px-4">
                <Link href="/app">Enter the study</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full px-4">
                  <Link href="/signup">Begin free</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-24 pt-16 text-center sm:pt-24">
        <div className="animate-rise-in">
          <Lotus breathing className="mx-auto h-12 w-20" />
          <p className="mt-6 font-display text-sm tracking-[0.25em] text-ember/80">
            విద్యా దదాతి వినయం
          </p>
          <p className="mt-1 text-xs italic text-muted-foreground">
            “Knowledge bestows humility”
          </p>
          <h1 className="mx-auto mt-8 max-w-2xl font-display text-[2.6rem] font-medium leading-[1.12] tracking-tight text-foreground sm:text-6xl">
            A quiet path to
            <span className="mt-1 block italic text-primary">Group‑1.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Like leaves settling on still water — one micro‑theme a day, read
            slowly, understood deeply. Notes, lectures, previous‑year questions
            and key terms, arranged exactly as the APPSC syllabus breathes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 text-base shadow-[0_14px_40px_-12px_oklch(0.55_0.14_48/0.55)] transition-shadow hover:shadow-[0_16px_48px_-10px_oklch(0.55_0.14_48/0.7)]"
            >
              <Link href={user ? "/app" : "/signup"}>
                {user ? "Continue the journey" : "Begin the journey"}
              </Link>
            </Button>
            {!user && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full bg-card/60 px-8 text-base backdrop-blur"
              >
                <Link href="/login">I already study here</Link>
              </Button>
            )}
          </div>
          <p className="mt-8 text-xs tracking-wide text-muted-foreground">
            458 micro‑themes · 9 papers · free for every aspirant
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8">
        <LeafDivider className="mx-auto max-w-md" />
        <h2 className="mt-8 text-center font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Everything the season of preparation asks for
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card/80 p-7 text-left shadow-sm backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_50px_-20px_oklch(0.46_0.12_36/0.35)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-ember transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing verse */}
      <section className="relative z-10 mx-auto w-full max-w-2xl px-4 py-20 text-center">
        <Lotus className="mx-auto h-8 w-14 opacity-70" />
        <blockquote className="mt-6 font-display text-xl italic leading-9 text-ember/90 sm:text-2xl">
          “As the tree lets go of its leaves without sorrow, let go of every
          doubt — and simply sit down to study.”
        </blockquote>
        <div className="mt-10">
          <Button asChild size="lg" className="rounded-full px-10">
            <Link href={user ? "/app" : "/signup"}>
              {user ? "Return to your desk" : "Take the first step"}
            </Link>
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t bg-card/50 py-8 text-center backdrop-blur">
        <p className="font-display italic text-muted-foreground">
          Bhimboy — a sanctuary for APPSC Group‑1 aspirants
        </p>
      </footer>
    </main>
  );
}
