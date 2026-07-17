"use client";

// Theme 3 — Autumn drift.
// The quietest scene, for the reading page: gilded leaves fall continuously,
// each on its own path, under a soft afternoon light. No branch, no bird —
// just the calm of leaves coming down while you read.
import { LivingCanvas, type SceneFrame } from "./living-canvas";
import { makeNoise, makeRandom } from "@/lib/living/noise";

interface FallingLeaf {
  x: number;
  y: number;
  rot: number;
  size: number;
  phase: number;
  vy: number;
  hue: number;
  gust: number;
}

interface AutumnState {
  noise: ReturnType<typeof makeNoise>;
  rand: () => number;
  leaves: FallingLeaf[];
}

const LEAF_TONES = ["#c2571b", "#d97706", "#a16207", "#9a3412", "#b45309"];

function init(w: number, h: number): AutumnState {
  const rand = makeRandom(Math.floor(w * 5 + h * 3) + 7);
  const leafCount = w < 640 ? 7 : 11;
  return {
    noise: makeNoise(53),
    rand,
    leaves: Array.from({ length: leafCount }, () => ({
      x: rand() * w,
      y: rand() * h,
      rot: rand() * Math.PI * 2,
      size: 6 + rand() * 7,
      phase: rand() * 100,
      vy: 11 + rand() * 14,
      hue: rand() * LEAF_TONES.length,
      gust: 0,
    })),
  };
}

function draw(f: SceneFrame, s: AutumnState) {
  const { ctx, w, h, t, dt, wind, events } = f;
  const noise = s.noise;

  // soft afternoon light from the upper left
  const glow = ctx.createRadialGradient(w * 0.12, -40, 20, w * 0.12, -40, w * 0.7);
  glow.addColorStop(0, "rgba(240,205,140,0.16)");
  glow.addColorStop(1, "rgba(240,205,140,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // gusts push the leaves sideways
  for (const e of events) {
    if (e.type === "gust") {
      for (const leaf of s.leaves) leaf.gust = Math.max(leaf.gust, e.mag);
    }
  }

  // falling leaves — every path its own
  for (const leaf of s.leaves) {
    leaf.gust = Math.max(0, leaf.gust - dt * 0.4);
    const swirl = noise.snoise(leaf.phase, t * 0.2);
    leaf.x += (swirl * 22 + wind * 30 + leaf.gust * 60) * dt;
    leaf.y += leaf.vy * (0.7 + 0.5 * noise.noise2(leaf.phase, t * 0.15)) * dt;
    leaf.rot += (swirl * 1.6 + 0.4) * dt;
    if (leaf.y > h + 10 || leaf.x < -20 || leaf.x > w + 20) {
      leaf.x = s.rand() * w;
      leaf.y = -10 - s.rand() * 40;
      leaf.vy = 11 + s.rand() * 14;
      leaf.phase = s.rand() * 100;
    }
    const tone = LEAF_TONES[Math.floor(leaf.hue) % LEAF_TONES.length];
    // leaves catch the light as they turn
    const shine = 0.35 + 0.3 * Math.abs(Math.sin(leaf.rot * 1.3));
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rot);
    ctx.globalAlpha = shine;
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.ellipse(0, 0, leaf.size, leaf.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = shine * 0.6;
    ctx.strokeStyle = "#7c4a12";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-leaf.size * 0.8, 0);
    ctx.lineTo(leaf.size * 0.8, 0);
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function AutumnScene({ opacity = 1 }: { opacity?: number }) {
  return <LivingCanvas init={init} draw={draw} opacity={opacity} />;
}
