import Link from "next/link";
import { Bird, TreePine, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { OceanScene } from "@/components/living/ocean-scene";
import { Lotus } from "@/components/decor/ornaments";

// The Ocean of Consciousness — arrival, stillness, the infinite source.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const worlds = [
    {
      icon: Waves,
      name: "The Ocean",
      stage: "Arrive",
      text: "Where you are now. Stillness before study. Every click you make sends ripples across the water — every action matters.",
    },
    {
      icon: TreePine,
      name: "The Forest",
      stage: "Explore",
      text: "The living syllabus. Nine papers, four hundred and fifty-eight micro-themes — a rainforest where deer walk, birds pass, and knowledge grows on every branch.",
    },
    {
      icon: Bird,
      name: "The Nest",
      stage: "Become",
      text: "The reading room. While you study, a sparrow builds her nest beside you — one twig per visit, the way you build your preparation: one micro-theme at a time.",
    },
  ];

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#081527] text-slate-100">
      <OceanScene />

      <header className="relative z-10">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <span className="font-display text-xl font-semibold italic tracking-tight text-slate-100">
            Bhimboy
          </span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-slate-100 px-4 text-[#0a1c33] hover:bg-white"
              >
                <Link href="/app">Enter the study</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-slate-200 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-slate-100 px-4 text-[#0a1c33] hover:bg-white"
                >
                  <Link href="/signup">Begin free</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero — above the water */}
      <section className="relative z-10 mx-auto flex min-h-[78vh] w-full max-w-3xl flex-col items-center justify-center px-4 pb-40 pt-10 text-center">
        <div className="animate-rise-in">
          <Lotus breathing className="mx-auto h-11 w-20 fill-slate-200/90" />
          <p className="mt-6 font-display text-sm tracking-[0.3em] text-cyan-100/70">
            శాంతిః శాంతిః శాంతిః
          </p>
          <p className="mt-1 text-xs italic text-slate-300/60">
            “Peace, peace, peace”
          </p>
          <h1 className="mx-auto mt-8 max-w-2xl font-display text-[2.5rem] font-medium leading-[1.14] tracking-tight text-slate-50 sm:text-6xl">
            Still water.
            <span className="mt-1 block italic text-cyan-200/90">
              Deep preparation.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300/85">
            An ocean of APPSC Group‑1 knowledge, made calm. Notes, lectures,
            previous‑year questions and key terms — arranged as the syllabus
            breathes, read at the pace of still water.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-slate-100 px-8 text-base text-[#0a1c33] shadow-[0_10px_44px_-8px_rgba(190,225,235,0.45)] hover:bg-white"
            >
              <Link href={user ? "/app" : "/signup"}>
                {user ? "Continue the journey" : "Step into the water"}
              </Link>
            </Button>
            {!user && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-slate-300/30 bg-white/5 px-8 text-base text-slate-100 backdrop-blur hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">I already study here</Link>
              </Button>
            )}
          </div>
          <p className="mt-8 text-xs tracking-wide text-slate-400/80">
            Touch anything — watch the ripples. Every action creates them.
          </p>
        </div>
      </section>

      {/* The three worlds */}
      <section className="relative z-10 border-t border-white/10 bg-gradient-to-b from-[#050e1d] to-[#071322] px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl">
            Three worlds. One journey.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-slate-400">
            This platform is a living ecosystem. Each part of your preparation
            is a different world, and each world is alive — slowly, quietly,
            the way nature is.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {worlds.map((wld, i) => (
              <div
                key={wld.name}
                className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur transition-all duration-700 hover:border-cyan-200/25 hover:bg-white/[0.07]"
              >
                <span className="font-display text-xs uppercase tracking-[0.3em] text-cyan-200/60">
                  {`${i + 1} · ${wld.stage}`}
                </span>
                <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-full bg-cyan-100/10 text-cyan-100/90">
                  <wld.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-slate-50">
                  {wld.name}
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-slate-400">
                  {wld.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="relative z-10 bg-[#071322] px-4 pb-40 pt-16 text-center">
        <blockquote className="mx-auto max-w-xl font-display text-xl italic leading-9 text-cyan-100/80 sm:text-2xl">
          “Life is not a race but a continuous unfolding. The water teaches
          surrender; the forest, interdependence; the sparrow, that meaning is
          built through small, steady acts.”
        </blockquote>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-slate-100 px-10 text-[#0a1c33] hover:bg-white"
          >
            <Link href={user ? "/app" : "/signup"}>
              {user ? "Return to your desk" : "Take the first step"}
            </Link>
          </Button>
        </div>
        <p className="mt-14 text-xs tracking-wide text-slate-500">
          Bhimboy — a living sanctuary for APPSC Group‑1 aspirants · 458
          micro‑themes · free for everyone
        </p>
      </section>
    </main>
  );
}
