"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { NoteRenderer } from "@/components/content/note-renderer";
import { cn } from "@/lib/utils";

export interface MainsCardData {
  id: string;
  year: number;
  paper_label: string;
  question_text: string;
  directive_word: string | null;
  marks: number | null;
  model_answer: unknown | null;
}

export function MainsQuestionCard({
  question,
  microtheme,
  tags = [],
  showMicrothemeLink = true,
}: {
  question: MainsCardData;
  microtheme?: { name: string; slug: string } | null;
  tags?: string[];
  showMicrothemeLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasAnswer =
    question.model_answer !== null && question.model_answer !== undefined;

  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{question.year}</Badge>
        <Badge variant="outline">{question.paper_label}</Badge>
        <Badge variant="outline">Mains</Badge>
        {question.directive_word && (
          <Badge variant="warning" className="capitalize">
            {question.directive_word}
          </Badge>
        )}
        {question.marks != null && (
          <Badge variant="outline">{question.marks} marks</Badge>
        )}
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="text-muted-foreground">
            {t}
          </Badge>
        ))}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-7">
        {question.question_text}
      </p>

      {hasAnswer ? (
        <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm">
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              />
              {open ? "Hide model answer" : "View model answer"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Model answer
              </p>
              <NoteRenderer doc={question.model_answer} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <p className="mt-3 text-xs italic text-muted-foreground">
          Model answer coming soon.
        </p>
      )}

      {showMicrothemeLink && microtheme && (
        <p className="mt-3 text-xs text-muted-foreground">
          From:{" "}
          <Link
            href={`/app/m/${microtheme.slug}`}
            className="font-medium text-foreground underline underline-offset-2"
          >
            {microtheme.name}
          </Link>
        </p>
      )}
    </article>
  );
}
