import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FallingLeaves } from "@/components/decor/falling-leaves";
import { Lotus } from "@/components/decor/ornaments";

export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden px-4 py-24 text-center">
      <div className="dawn-sky pointer-events-none absolute inset-0" />
      <FallingLeaves density="whisper" className="fixed inset-0 h-screen" />
      <div className="relative z-10 animate-rise-in">
        <Lotus className="mx-auto h-10 w-16 opacity-80" />
        <p className="mt-4 font-display text-6xl font-medium">404</p>
        <p className="mt-3 max-w-sm text-muted-foreground">
          This leaf has already fallen — the page doesn&apos;t exist, or it
          hasn&apos;t been published yet.
        </p>
        <Button asChild className="mt-6 rounded-full px-6">
          <Link href="/app/syllabus">Return to the syllabus</Link>
        </Button>
      </div>
    </main>
  );
}
