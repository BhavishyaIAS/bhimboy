"use client";

// Prelims PYQ with the answer-reveal interaction: options are shown,
// the student picks one, then the correct answer + explanation appear.
// Purely client-side; nothing is persisted (V1).
//
// Key-only mode: official APPSC "final key" papers publish each question
// with only its correct answer (the distractor options are not released).
// Those rows store the answer in option_a and leave b/c/d empty — the card
// then renders a think-then-reveal flow instead of a four-option MCQ.
import { useState } from "react";
import Link from "next/link";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CorrectOption } from "@/lib/database.types";

export interface PrelimsCardData {
  id: string;
  year: number;
  paper_label: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: CorrectOption;
  explanation: string | null;
}

const OPTION_KEYS: { key: CorrectOption; field: keyof PrelimsCardData }[] = [
  { key: "A", field: "option_a" },
  { key: "B", field: "option_b" },
  { key: "C", field: "option_c" },
  { key: "D", field: "option_d" },
];

export function PrelimsQuestionCard({
  question,
  microtheme,
  tags = [],
  showMicrothemeLink = true,
}: {
  question: PrelimsCardData;
  microtheme?: { name: string; slug: string } | null;
  tags?: string[];
  showMicrothemeLink?: boolean;
}) {
  const [selected, setSelected] = useState<CorrectOption | null>(null);
  // Final-key papers publish only the correct answer; b/c/d stay empty.
  const keyOnly =
    !question.option_b.trim() &&
    !question.option_c.trim() &&
    !question.option_d.trim();
  const revealed = selected !== null;

  return (
    <article className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{question.year}</Badge>
        <Badge variant="outline">{question.paper_label}</Badge>
        <Badge variant="outline">Prelims</Badge>
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="text-muted-foreground">
            {t}
          </Badge>
        ))}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[15px] font-medium leading-7">
        {question.question_text}
      </p>

      {keyOnly ? (
        <div className="mt-3">
          {!revealed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelected("A")}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Reveal answer
            </Button>
          ) : (
            <div className="rounded-lg border border-foreground/30 bg-muted p-3 text-sm">
              <p className="font-medium text-foreground">
                Answer
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-6">
                {question.option_a}
              </p>
              {question.explanation && (
                <p className="mt-1.5 whitespace-pre-wrap leading-6 text-muted-foreground">
                  {question.explanation}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-xs"
                onClick={() => setSelected(null)}
              >
                <RotateCcw className="mr-1 h-3 w-3" /> Hide
              </Button>
            </div>
          )}
        </div>
      ) : (
      <div className="mt-3 space-y-2">
        {OPTION_KEYS.map(({ key, field }) => {
          const isCorrect = key === question.correct_option;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              disabled={revealed}
              onClick={() => setSelected(key)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                !revealed && "hover:border-primary/50 hover:bg-accent",
                revealed && isCorrect && "border-foreground bg-muted",
                revealed && isSelected && !isCorrect && "border-primary bg-accent",
                revealed && !isSelected && !isCorrect && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  revealed && isCorrect && "border-foreground bg-foreground text-background",
                  revealed && isSelected && !isCorrect && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {revealed && isCorrect ? (
                  <Check className="h-3 w-3" />
                ) : revealed && isSelected && !isCorrect ? (
                  <X className="h-3 w-3" />
                ) : (
                  key
                )}
              </span>
              <span className="whitespace-pre-wrap">{String(question[field])}</span>
            </button>
          );
        })}
      </div>
      )}

      {!keyOnly && revealed && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
          <p className="font-medium">
            {selected === question.correct_option ? (
              <span className="font-semibold text-foreground">
                Correct!
              </span>
            ) : (
              <span className="text-primary">
                Not quite — the answer is {question.correct_option}.
              </span>
            )}
          </p>
          {question.explanation && (
            <p className="mt-1.5 whitespace-pre-wrap leading-6 text-muted-foreground">
              {question.explanation}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs"
            onClick={() => setSelected(null)}
          >
            <RotateCcw className="mr-1 h-3 w-3" /> Try again
          </Button>
        </div>
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
