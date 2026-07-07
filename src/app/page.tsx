import Link from "next/link";
import { BookOpen, FileQuestion, ListTree, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const features = [
    {
      icon: ListTree,
      title: "Micro-theme first",
      text: "The full APPSC Group 1 syllabus broken into small, learnable units — notes, video, PYQs and glossary in one place for each.",
    },
    {
      icon: BookOpen,
      title: "Exam-focused notes",
      text: "Rich notes with tables, diagrams and images, written for revision on your phone.",
    },
    {
      icon: FileQuestion,
      title: "PYQ Vault",
      text: "Every previous-year question, filterable by paper, year, topic and tags — with answers and model answers.",
    },
    {
      icon: Search,
      title: "Instant search",
      text: "Search across notes, questions and glossary terms in one go.",
    },
  ];

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">Bhimboy</span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/app">Open the app</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Sign up free</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          APPSC Group 1 preparation, one micro-theme at a time
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Notes, video lectures, previous-year questions and key terms —
          organised exactly the way the syllabus is, so you always know what to
          study next.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href={user ? "/app" : "/signup"}>
              {user ? "Continue studying" : "Start studying free"}
            </Link>
          </Button>
          {!user && (
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 px-4 pb-20 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border p-6 text-left">
            <f.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {f.text}
            </p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
        Bhimboy — built for APPSC Group 1 aspirants
      </footer>
    </main>
  );
}
