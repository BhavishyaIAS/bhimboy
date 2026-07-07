import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, FileQuestion, Lightbulb, Search } from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

const GROUPS: {
  type: SearchResult["result_type"];
  label: string;
  icon: typeof BookOpen;
}[] = [
  { type: "note", label: "Notes", icon: BookOpen },
  { type: "glossary", label: "Glossary", icon: Lightbulb },
  { type: "prelims", label: "Prelims PYQs", icon: FileQuestion },
  { type: "mains", label: "Mains PYQs", icon: FileQuestion },
];

// ts_headline doesn't escape source text; escape everything, then restore
// only the <b> highlight tags it added.
function safeSnippet(snippet: string): string {
  return snippet
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>");
}

function resultHref(r: SearchResult): string {
  if (r.result_type === "prelims" || r.result_type === "mains") {
    return `/app/pyqs?microtheme=${r.microtheme_id}&stage=${r.result_type}`;
  }
  return `/app/m/${r.microtheme_slug}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = q.trim() ? await globalSearch(q) : [];

  return (
    <div className="mx-auto max-w-3xl animate-rise-in">
      <h1 className="font-display text-3xl font-medium tracking-tight">Seek</h1>
      <form className="relative mt-4" action="/app/search" method="get">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search notes, glossary terms and questions…"
          className="h-11 pl-9 pr-24"
          autoFocus
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
        >
          Search
        </Button>
      </form>

      {q.trim() === "" ? (
        <p className="mt-12 text-center text-sm italic text-muted-foreground">
          Ask, and the right micro‑theme appears — try a topic, a keyword, or
          part of a question.
        </p>
      ) : results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed bg-card/60 p-12 text-center text-muted-foreground">
          <p className="font-display text-lg text-foreground">
            Nothing stirred for “{q}”
          </p>
          <p className="mt-1 text-sm">
            Try a shorter keyword or a different spelling.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {GROUPS.map((group) => {
            const items = results.filter((r) => r.result_type === group.type);
            if (items.length === 0) return null;
            return (
              <section key={group.type}>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <group.icon className="h-4 w-4" /> {group.label}
                  <span className="font-normal">({items.length})</span>
                </h2>
                <ul className="mt-2 space-y-2">
                  {items.map((r) => (
                    <li key={`${r.result_type}-${r.id}`}>
                      <Link
                        href={resultHref(r)}
                        className="block rounded-xl border p-4 transition-colors hover:bg-accent"
                      >
                        <p className="text-sm font-medium">{r.title}</p>
                        <p
                          className="mt-1 line-clamp-3 text-sm text-muted-foreground [&_b]:font-semibold [&_b]:text-foreground"
                          dangerouslySetInnerHTML={{ __html: safeSnippet(r.snippet) }}
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          in {r.microtheme_name}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
