import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-5xl font-bold">404</p>
      <p className="text-muted-foreground">
        That page doesn&apos;t exist — or it hasn&apos;t been published yet.
      </p>
      <Button asChild>
        <Link href="/app/syllabus">Back to the syllabus</Link>
      </Button>
    </main>
  );
}
