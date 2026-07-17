// Small chips that turn syllabus metadata into a study plan the student
// can read at a glance: core-first priority, one-sitting time estimate,
// and "P+M" for themes that count for both Prelims and Mains.
import { Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Microtheme } from "@/lib/database.types";

export function CoverageChips({
  microtheme,
  size = "sm",
}: {
  microtheme: Pick<Microtheme, "priority" | "est_minutes" | "exam_overlap">;
  size?: "sm" | "md";
}) {
  const { priority, est_minutes, exam_overlap } = microtheme;
  if (priority === undefined && !est_minutes && exam_overlap === undefined) {
    return null;
  }
  const cls =
    size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]";

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {priority === 1 && (
        <Badge className={`${cls} border-transparent bg-primary/15 text-ember`}>
          <Sparkles className="mr-0.5 h-2.5 w-2.5" /> core
        </Badge>
      )}
      {priority === 3 && (
        <Badge variant="outline" className={`${cls} text-muted-foreground`}>
          supporting
        </Badge>
      )}
      {exam_overlap && (
        <Badge
          variant="outline"
          className={`${cls} border-foreground/30 text-foreground`}
          title="Counts for both Prelims and Mains — study once, use twice"
        >
          P+M
        </Badge>
      )}
      {!!est_minutes && (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {est_minutes}m
        </span>
      )}
    </span>
  );
}

// Paper-level rollup: "n micro-themes · ~h hours (core ~x h)"
export function paperTotals(
  microthemes: Pick<Microtheme, "priority" | "est_minutes">[]
): string | null {
  const withMeta = microthemes.filter((m) => m.est_minutes);
  if (withMeta.length === 0) return null;
  const total = withMeta.reduce((s, m) => s + (m.est_minutes ?? 0), 0);
  const core = withMeta
    .filter((m) => m.priority === 1)
    .reduce((s, m) => s + (m.est_minutes ?? 0), 0);
  const h = (x: number) => Math.round(x / 60);
  return core > 0
    ? `~${h(total)} h · core path ~${h(core)} h`
    : `~${h(total)} h`;
}
