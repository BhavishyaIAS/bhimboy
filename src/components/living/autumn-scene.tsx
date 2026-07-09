"use client";

// Theme 3 — Sparrow and the Autumn Tree.
// The quietest scene, for the reading page. An old branch reaches in from
// the corner, its sub-branches turned at the golden angle. Leaves fall
// continuously — each on its own path. And through the whole visit a
// sparrow builds her nest in the fork: flies in, places one twig, looks
// around, leaves. The nest persists for the session (~15 minutes to
// complete). When it is done, she settles in it. The visitor witnesses
// creation, not animation.
import { LivingCanvas, type SceneFrame } from "./living-canvas";
import { makeNoise, makeRandom, clamp } from "@/lib/living/noise";

const NEST_KEY = "bhimboy-nest-pieces";
const NEST_COMPLETE = 18;
const GOLDEN_ANGLE = 2.39996; // radians — nature's own divergence

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

type SparrowState = "away" | "flyIn" | "placing" | "watching" | "flyOut" | "home";

interface AutumnState {
  noise: ReturnType<typeof makeNoise>;
  rand: () => number;
  leaves: FallingLeaf[];
  nestPieces: number;
  nestBits: { a0: number; a1: number; r: number; tone: number }[];
  sparrow: {
    state: SparrowState;
    timer: number;
    x: number;
    y: number;
    fromX: number;
    fromY: number;
    progress: number;
  };
  fork: { x: number; y: number };
  anchor: { x: number; y: number };
}

function readNest(): number {
  try {
    return clamp(
      parseInt(sessionStorage.getItem(NEST_KEY) ?? "0", 10) || 0,
      0,
      NEST_COMPLETE
    );
  } catch {
    return 0;
  }
}

function writeNest(n: number) {
  try {
    sessionStorage.setItem(NEST_KEY, String(n));
  } catch {
    /* private browsing — the nest lives only in memory */
  }
}

const LEAF_TONES = ["#c2571b", "#d97706", "#a16207", "#9a3412", "#b45309"];

function init(w: number, h: number): AutumnState {
  const rand = makeRandom(Math.floor(w * 5 + h * 3) + 7);
  // the bough reaches well into the page, below the header
  const anchor = { x: w + 24, y: 24 };
  const fork = { x: w - Math.min(300, w * 0.34), y: 168 };
  const pieces = readNest();
  const nestBits = Array.from({ length: NEST_COMPLETE }, (_, i) => ({
    a0: Math.PI + ((i * GOLDEN_ANGLE) % Math.PI) * 0.9 - 0.3,
    a1: 0,
    r: 9 + (i % 5) * 1.6 + rand() * 2,
    tone: rand(),
  })).map((b) => ({ ...b, a1: b.a0 + 1.1 + rand() * 1.2 }));

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
    nestPieces: pieces,
    nestBits,
    sparrow: {
      state: pieces >= NEST_COMPLETE ? "home" : "away",
      timer: 6 + rand() * 12,
      x: -30,
      y: 60,
      fromX: -30,
      fromY: 60,
      progress: 0,
    },
    fork,
    anchor,
  };
}

function drawBranch(f: SceneFrame, s: AutumnState) {
  const { ctx, t, wind } = f;
  const sway = s.noise.snoise(0.4, t * 0.06) * (0.008 + wind * 0.02);
  ctx.save();
  ctx.translate(s.anchor.x, s.anchor.y);
  ctx.rotate(sway);
  ctx.translate(-s.anchor.x, -s.anchor.y);

  ctx.strokeStyle = "rgba(84,56,32,0.75)";
  ctx.lineCap = "round";

  // main bough from the corner to past the fork
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(s.anchor.x, s.anchor.y);
  ctx.quadraticCurveTo(
    s.fork.x + 170,
    s.fork.y - 90,
    s.fork.x - 8,
    s.fork.y - 2
  );
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(s.fork.x - 8, s.fork.y - 2);
  ctx.quadraticCurveTo(
    s.fork.x - 110,
    s.fork.y + 30,
    s.fork.x - 190,
    s.fork.y + 20
  );
  ctx.stroke();

  // sub-branches diverging near the golden angle
  const subs: [number, number, number, number][] = [
    [0.32, -1, 46, 3.6],
    [0.55, 1, 40, 3.2],
    [0.75, -1, 34, 2.6],
    [0.9, 1, 26, 2.2],
  ];
  for (const [frac, side, len, width] of subs) {
    const bx =
      s.anchor.x + (s.fork.x - 8 - s.anchor.x) * frac + (1 - frac) * 60;
    const by = s.anchor.y + (s.fork.y - s.anchor.y) * frac * 1.15;
    const ang = Math.PI * 0.62 + side * (GOLDEN_ANGLE % (Math.PI / 2)) * 0.55;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(
      bx - Math.cos(ang) * len * 0.6,
      by + Math.sin(ang) * len * 0.5,
      bx - Math.cos(ang) * len,
      by + Math.sin(ang) * len
    );
    ctx.stroke();

    // trembling leaf clusters at the tips
    const tipX = bx - Math.cos(ang) * len;
    const tipY = by + Math.sin(ang) * len;
    for (let i = 0; i < 5; i++) {
      const la = (i * GOLDEN_ANGLE) % (Math.PI * 2);
      const tremble = s.noise.snoise(i * 3 + bx, t * 0.5) * (2 + wind * 5);
      const lx = tipX + Math.cos(la) * (7 + i * 2.4) + tremble;
      const ly = tipY + Math.sin(la) * (5 + i * 1.8);
      ctx.fillStyle = LEAF_TONES[(i + Math.floor(frac * 10)) % LEAF_TONES.length];
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 5, 2.6, la + tremble * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // the nest — arcs laid one act at a time
  for (let i = 0; i < s.nestPieces; i++) {
    const b = s.nestBits[i];
    ctx.strokeStyle = `rgba(${96 + b.tone * 40},${62 + b.tone * 26},${30 + b.tone * 14},0.8)`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(
      s.fork.x,
      s.fork.y + 4 - i * 0.45,
      b.r * (1 + i * 0.012),
      b.a0,
      b.a1
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawSparrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flap: number,
  facing: number,
  carrying: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  // tail
  ctx.fillStyle = "#5f4632";
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.lineTo(-12, -3.5);
  ctx.lineTo(-12, 1.5);
  ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = "#7a5a3d";
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.4, 4.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // breast
  ctx.fillStyle = "#c9b18f";
  ctx.beginPath();
  ctx.ellipse(1.4, 1.4, 3.6, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = "#6b4c33";
  ctx.beginPath();
  ctx.arc(5.4, -3.4, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // eye + beak
  ctx.fillStyle = "#1d1611";
  ctx.beginPath();
  ctx.arc(6.4, -4, 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c98a2d";
  ctx.beginPath();
  ctx.moveTo(8.6, -3.6);
  ctx.lineTo(11.4, -2.9);
  ctx.lineTo(8.6, -2.1);
  ctx.closePath();
  ctx.fill();
  // twig in beak
  if (carrying) {
    ctx.strokeStyle = "#7d5b35";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(7.5, -2.4);
    ctx.lineTo(14.5, -0.8);
    ctx.stroke();
  }
  // wing
  const wingLift = Math.sin(flap) * 3.5;
  ctx.fillStyle = "#5f4632";
  ctx.beginPath();
  ctx.ellipse(-0.8, -1.2 - Math.max(0, wingLift), 4.4, 2.6, -0.5 - wingLift * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

  drawBranch(f, s);

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
      // most leaves are born near the branch
      leaf.x = s.rand() < 0.6 ? w - s.rand() * Math.min(320, w * 0.5) : s.rand() * w;
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

  // ---- the sparrow's work ----
  const sp = s.sparrow;
  const nestX = s.fork.x;
  const nestY = s.fork.y - 6;
  sp.timer -= dt;

  switch (sp.state) {
    case "away":
      if (sp.timer <= 0 && s.nestPieces < NEST_COMPLETE) {
        sp.state = "flyIn";
        sp.progress = 0;
        sp.fromX = s.rand() < 0.5 ? -24 : w * 0.3;
        sp.fromY = h * (0.15 + s.rand() * 0.3);
      }
      break;
    case "flyIn": {
      sp.progress = Math.min(1, sp.progress + dt / 2.6);
      const p = sp.progress;
      const ease = p * p * (3 - 2 * p);
      // a shallow arc, dipping mid-flight
      sp.x = sp.fromX + (nestX - 14 - sp.fromX) * ease;
      sp.y =
        sp.fromY + (nestY - sp.fromY) * ease + Math.sin(p * Math.PI) * 36;
      if (p >= 1) {
        sp.state = "placing";
        sp.timer = 1.6;
      }
      break;
    }
    case "placing":
      sp.x = nestX - 14;
      sp.y = nestY;
      if (sp.timer <= 0) {
        s.nestPieces = Math.min(NEST_COMPLETE, s.nestPieces + 1);
        writeNest(s.nestPieces);
        sp.state = "watching";
        sp.timer = 1.8 + s.rand() * 2.6;
      }
      break;
    case "watching":
      sp.x = nestX - 14 + Math.sin(t * 2) * 0.5;
      sp.y = nestY;
      if (sp.timer <= 0) {
        if (s.nestPieces >= NEST_COMPLETE) {
          sp.state = "home";
        } else {
          sp.state = "flyOut";
          sp.progress = 0;
        }
      }
      break;
    case "flyOut": {
      sp.progress = Math.min(1, sp.progress + dt / 2.2);
      const p = sp.progress;
      sp.x = nestX - 14 - p * (nestX + 60);
      sp.y = nestY - Math.sin(p * Math.PI * 0.5) * 90 + p * 20;
      if (p >= 1) {
        sp.state = "away";
        // she gathers unhurriedly — roughly a nest in fifteen minutes
        sp.timer = 34 + s.rand() * 42;
      }
      break;
    }
    case "home":
      sp.x = nestX + 1;
      sp.y = nestY - 4 + Math.sin(t * 0.9) * 0.4; // resting, breathing
      break;
  }

  if (sp.state !== "away") {
    const flying = sp.state === "flyIn" || sp.state === "flyOut";
    const facing = sp.state === "flyOut" ? -1 : 1;
    drawSparrow(
      ctx,
      sp.x,
      sp.y,
      flying ? t * 16 : Math.PI * 0.1,
      facing,
      sp.state === "flyIn" || sp.state === "placing"
    );
  }
}

export function AutumnScene({ opacity = 1 }: { opacity?: number }) {
  return <LivingCanvas init={init} draw={draw} opacity={opacity} />;
}
