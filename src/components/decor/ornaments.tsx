// Still ornaments: a lotus mark and a leaf section divider.
// These carry the sanctuary feeling onto pages where motion would
// distract from reading.
import { cn } from "@/lib/utils";

export function Lotus({
  className,
  breathing = false,
}: {
  className?: string;
  breathing?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 40"
      aria-hidden="true"
      className={cn("fill-primary", breathing && "animate-breathe", className)}
    >
      {/* five soft petals */}
      <path d="M32 4c-3.5 6-3.5 13 0 19 3.5-6 3.5-13 0-19z" opacity="0.95" />
      <path d="M20 9c-1 6.5 1.6 12.6 7.4 16.2C28.6 18.7 26 12.2 20 9z" opacity="0.75" />
      <path d="M44 9c1 6.5-1.6 12.6-7.4 16.2C35.4 18.7 38 12.2 44 9z" opacity="0.75" />
      <path d="M9 17c1.6 6 6.6 10.3 13.4 11.5C21.2 22.3 16 18 9 17z" opacity="0.55" />
      <path d="M55 17c-1.6 6-6.6 10.3-13.4 11.5C42.8 22.3 48 18 55 17z" opacity="0.55" />
      {/* base */}
      <path
        d="M14 30c5 4.5 11 6.8 18 6.8S45 34.5 50 30c-5.5 1.8-11.5 2.7-18 2.7S19.5 31.8 14 30z"
        opacity="0.9"
      />
    </svg>
  );
}

export function LeafDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center gap-4 py-2", className)}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-primary/70">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
    </div>
  );
}
