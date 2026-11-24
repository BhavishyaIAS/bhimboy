"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HeaderSearch() {
  const router = useRouter();

  return (
    <form
      className="relative hidden w-44 md:block lg:w-64"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        if (typeof q === "string" && q.trim()) {
          router.push(`/app/search?q=${encodeURIComponent(q.trim())}`);
        }
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        placeholder="Search notes, PYQs…"
        className="h-8 pl-8"
      />
    </form>
  );
}
