// Slowly falling autumn leaves. Pure CSS animation (transform-only, GPU
// friendly), pointer-events off, hidden when the user prefers reduced
// motion. Leaf layout comes from a seeded PRNG, so it is pure and
// deterministic — identical on server and client, no hydration mismatch.
import { cn } from "@/lib/utils";

const COLORS = [
  "#d81f26", // logo red
  "#b81a20", // deep red
  "#e0555b", // light red
  "#8f1418", // dark red
  "#1a1a1a", // near-black
  "#5a5a5a", // grey
];

// mulberry32 — tiny deterministic PRNG
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function LeafShape({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      aria-hidden="true"
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
    </svg>
  );
}

export function FallingLeaves({
  density = "full",
  className,
}: {
  // full: hero moments · whisper: quiet ambience behind browsing pages
  density?: "full" | "whisper";
  className?: string;
}) {
  const count = density === "full" ? 18 : 8;
  const baseOpacity = density === "full" ? 0.75 : 0.4;
  const rng = makeRng(density === "full" ? 20181005 : 19470815);

  const leaves = Array.from({ length: count }, () => ({
    left: rng() * 100,
    size: 13 + rng() * 17,
    fall: 22 + rng() * 26, // 22–48s: unhurried descent
    sway: 5.5 + rng() * 5,
    spin: 8 + rng() * 9,
    delay: -rng() * 48, // negative: the sky is already full
    color: COLORS[Math.floor(rng() * COLORS.length)],
    opacity: baseOpacity * (0.55 + rng() * 0.45),
  }));

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {leaves.map((leaf, i) => (
        <div
          key={i}
          className="leaf"
          style={{
            left: `${leaf.left}vw`,
            opacity: leaf.opacity,
            animationDuration: `${leaf.fall}s`,
            animationDelay: `${leaf.delay}s`,
          }}
        >
          <div
            className="leaf-inner"
            style={{ animationDuration: `${leaf.sway}s` }}
          >
            <div
              className="leaf-inner-2"
              style={{ animationDuration: `${leaf.spin}s` }}
            >
              <LeafShape color={leaf.color} size={leaf.size} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
