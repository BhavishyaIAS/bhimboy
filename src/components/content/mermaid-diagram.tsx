"use client";

import { useEffect, useId, useState } from "react";

let initialized = false;

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "neutral",
      fontFamily: "inherit",
    });
    initialized = true;
  }
  return mermaid;
}

export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await getMermaid();
        const renderId = `mmd-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg } = await mermaid.render(renderId, code);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (e) {
        // mermaid.render may leave an orphaned error element behind
        document.querySelectorAll("[id^='dmmd-'], [id^='mmd-']").forEach((el) => {
          if (el.tagName === "DIV" && !el.closest(".mermaid-diagram")) el.remove();
        });
        if (!cancelled) {
          setSvg(null);
          setError(e instanceof Error ? e.message : "Could not render diagram");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (error) {
    return (
      <div className="mermaid-diagram my-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">
          Diagram could not be rendered
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
          {code}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="mermaid-diagram my-4 flex h-32 animate-pulse items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram my-4 overflow-x-auto rounded-lg border bg-white p-3 dark:bg-background"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
