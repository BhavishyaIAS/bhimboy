"use client";

// Filter bar for the PYQ Vault. State lives in the URL so results are
// shareable and the server component re-fetches on change.
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export interface FilterOptions {
  paperLabels: string[];
  years: number[];
  tags: string[];
  subjects: {
    id: string;
    name: string;
    topics: {
      id: string;
      name: string;
      microthemes: { id: string; name: string; code: string }[];
    }[];
  }[];
}

export function PyqFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const get = (key: string) => searchParams.get(key) ?? "";

  function setParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // any filter change resets pagination
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const subject = options.subjects.find((s) => s.id === get("subject"));
  const topic = subject?.topics.find((t) => t.id === get("topic"));

  const hasFilters =
    ["stage", "paper", "year", "subject", "topic", "microtheme", "tag", "q"].some(
      (k) => get(k)
    );

  const selectClass = "h-8 w-auto min-w-28 text-xs";

  return (
    <div className="space-y-2.5">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          setParams({ q: typeof q === "string" ? q.trim() : "" });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={get("q")}
          key={get("q")}
          placeholder="Search question text…"
          className="pl-9"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={get("stage") || ALL}
          onValueChange={(v) => setParams({ stage: v })}
        >
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            <SelectItem value="prelims">Prelims</SelectItem>
            <SelectItem value="mains">Mains</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={get("paper") || ALL}
          onValueChange={(v) => setParams({ paper: v })}
        >
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Paper" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All papers</SelectItem>
            {options.paperLabels.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={get("year") || ALL}
          onValueChange={(v) => setParams({ year: v })}
        >
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All years</SelectItem>
            {options.years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={get("subject") || ALL}
          onValueChange={(v) => setParams({ subject: v, topic: "", microtheme: "" })}
        >
          <SelectTrigger className={selectClass}>
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {options.subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subject && (
          <Select
            value={get("topic") || ALL}
            onValueChange={(v) => setParams({ topic: v, microtheme: "" })}
          >
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All topics</SelectItem>
              {subject.topics.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {topic && (
          <Select
            value={get("microtheme") || ALL}
            onValueChange={(v) => setParams({ microtheme: v })}
          >
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Micro-theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All micro-themes</SelectItem>
              {topic.microthemes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {options.tags.length > 0 && (
          <Select
            value={get("tag") || ALL}
            onValueChange={(v) => setParams({ tag: v })}
          >
            <SelectTrigger className={selectClass}>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All tags</SelectItem>
              {options.tags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() =>
              startTransition(() => router.replace(pathname, { scroll: false }))
            }
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}

        {isPending && (
          <span className="text-xs text-muted-foreground">Updating…</span>
        )}
      </div>
    </div>
  );
}
