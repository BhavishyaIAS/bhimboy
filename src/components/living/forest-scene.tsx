"use client";

// Theme 2 — Rainforest of Life.
// A misty canopy above the page, shafts of morning light, drifting pollen,
// and creatures that simply exist: a deer that walks and listens, an
// elephant that crosses rarely, butterflies that never fly the same path,
// birds that glide by, a turtle that barely moves. Everything is a distant
// silhouette in the mist — the forest never becomes a zoo.
import { LivingCanvas, type SceneFrame } from "./living-canvas";
import { makeNoise, makeRandom, clamp } from "@/lib/living/noise";

interface Pollen {
  x: number;
  y: number;
  phase: number;
  size: number;
}

interface Walker {
  x: number;
  dir: 1 | -1;
  state: "away" | "walking" | "pausing";
  timer: number;
  speed: number;
}

interface Butterfly {
  x: number;
  y: number;
  phase: number;
  startle: number;
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  active: boolean;
  timer: number;
  flap: number;
}

interface ForestState {
  noise: ReturnType<typeof makeNoise>;
  rand: () => number;
  pollen: Pollen[];
  deer: Walker;
  elephant: Walker;
  butterflies: Butterfly[];
  birds: Bird[];
  turtleX: number;
  canopy: { x: number; y: number; r: number; layer: number }[];
}

function init(w: number, h: number): ForestState {
  const rand = makeRandom(Math.floor(w * 3 + h * 11) + 41);
  const canopy: ForestState["canopy"] = [];
  for (let layer = 0; layer < 2; layer++) {
    const count = Math.ceil(w / 90) + 4;
    for (let i = 0; i < count; i++) {
      canopy.push({
        x: (i / count) * (w + 160) - 80,
        y: -30 + rand() * (55 + layer * 45),
        r: 55 + rand() * 70,
        layer,
      });
    }
  }
  return {
    noise: makeNoise(211),
    rand,
    pollen: Array.from({ length: w < 640 ? 18 : 34 }, () => ({
      x: rand() * w,
      y: rand() * h,
      phase: rand() * Math.PI * 2,
      size: 0.8 + rand() * 1.4,
    })),
    deer: { x: -80, dir: 1, state: "away", timer: 6 + rand() * 14, speed: 14 },
    elephant: {
      x: -200,
      dir: 1,
      state: "away",
      timer: 60 + rand() * 150,
      speed: 8,
    },
    butterflies: [
      { x: w * 0.3, y: h * 0.5, phase: rand() * 100, startle: 0 },
      { x: w * 0.7, y: h * 0.4, phase: rand() * 100 + 50, startle: 0 },
    ],
    birds: [
      { x: -40, y: 0, vx: 0, active: false, timer: 8 + rand() * 20, flap: 0 },
      { x: -40, y: 0, vx: 0, active: false, timer: 30 + rand() * 40, flap: 0 },
    ],
    turtleX: w * 0.12,
    canopy,
  };
}

function drawDeer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, step: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  // body
  ctx.ellipse(0, -26, 22, 11, 0, 0, Math.PI * 2);
  // neck + head
  ctx.moveTo(16, -32);
  ctx.quadraticCurveTo(26, -46, 27, -52);
  ctx.lineTo(31, -52);
  ctx.quadraticCurveTo(30, -44, 24, -30);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(29, -53, 5.5, 3.5, -0.35, 0, Math.PI * 2);
  ctx.fill();
  // antlers
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(28, -56);
  ctx.quadraticCurveTo(24, -66, 18, -68);
  ctx.moveTo(26, -62);
  ctx.quadraticCurveTo(22, -64, 20, -62);
  ctx.moveTo(31, -56);
  ctx.quadraticCurveTo(34, -66, 40, -68);
  ctx.moveTo(33, -62);
  ctx.quadraticCurveTo(37, -64, 39, -62);
  ctx.stroke();
  // legs (subtle stride)
  const s = Math.sin(step);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-14, -20);
  ctx.lineTo(-14 - s * 4, 0);
  ctx.moveTo(-7, -20);
  ctx.lineTo(-7 + s * 4, 0);
  ctx.moveTo(9, -20);
  ctx.lineTo(9 - s * 3.4, 0);
  ctx.moveTo(16, -20);
  ctx.lineTo(16 + s * 3.4, 0);
  ctx.stroke();
  // tail
  ctx.beginPath();
  ctx.moveTo(-21, -30);
  ctx.quadraticCurveTo(-26, -28, -24, -23);
  ctx.stroke();
  ctx.restore();
}

function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, step: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  // body
  ctx.ellipse(0, -34, 34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // head + ear
  ctx.beginPath();
  ctx.arc(30, -40, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(24, -42, 9, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // trunk — sways as it walks
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(41, -36);
  ctx.quadraticCurveTo(48 + Math.sin(step * 0.5) * 3, -18, 44, -2);
  ctx.stroke();
  // legs
  ctx.lineWidth = 8;
  const s = Math.sin(step * 0.6) * 2.5;
  ctx.beginPath();
  ctx.moveTo(-18, -18);
  ctx.lineTo(-18 - s, 0);
  ctx.moveTo(-2, -18);
  ctx.lineTo(-2 + s, 0);
  ctx.moveTo(14, -18);
  ctx.lineTo(14 - s, 0);
  ctx.stroke();
  ctx.restore();
}

function drawButterfly(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, alpha: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  const wing = Math.abs(Math.sin(flap)) * 0.85 + 0.15;
  ctx.fillStyle = "#d81f26";
  ctx.beginPath();
  ctx.ellipse(-3.4 * wing, 0, 4.4 * wing, 3.1, -0.5, 0, Math.PI * 2);
  ctx.ellipse(3.4 * wing, 0, 4.4 * wing, 3.1, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#161616";
  ctx.fillRect(-0.7, -2.6, 1.4, 5.2);
  ctx.restore();
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number) {
  const spread = Math.sin(flap);
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 4 * spread);
  ctx.quadraticCurveTo(x - 3, y + 2, x, y);
  ctx.quadraticCurveTo(x + 3, y + 2, x + 9, y - 4 * spread);
  ctx.stroke();
}

function stepWalker(
  wk: Walker,
  dt: number,
  w: number,
  margin: number,
  rand: () => number,
  pauseChance: number,
  awayRange: [number, number]
) {
  wk.timer -= dt;
  if (wk.state === "away" && wk.timer <= 0) {
    wk.dir = rand() < 0.5 ? 1 : -1;
    wk.x = wk.dir === 1 ? -margin : w + margin;
    wk.state = "walking";
  } else if (wk.state === "walking") {
    wk.x += wk.dir * wk.speed * dt;
    if (rand() < dt * pauseChance) {
      wk.state = "pausing";
      wk.timer = 1.5 + rand() * 4; // stops. listens.
    }
    if ((wk.dir === 1 && wk.x > w + margin) || (wk.dir === -1 && wk.x < -margin)) {
      wk.state = "away";
      wk.timer = awayRange[0] + rand() * (awayRange[1] - awayRange[0]);
    }
  } else if (wk.state === "pausing" && wk.timer <= 0) {
    wk.state = "walking";
  }
}

function draw(f: SceneFrame, s: ForestState) {
  const { ctx, w, h, t, dt, wind, idle, events } = f;
  const noise = s.noise;

  // a soft red-into-charcoal breath melting into the page
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(40,12,14,0.18)");
  sky.addColorStop(0.26, "rgba(60,20,22,0.07)");
  sky.addColorStop(0.5, "rgba(120,60,60,0.02)");
  sky.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // canopy silhouettes swaying — never synchronized
  for (const c of s.canopy) {
    const sway =
      noise.snoise(c.x * 0.01, t * (0.05 + c.layer * 0.03)) *
      (4 + wind * 10) *
      (c.layer + 1);
    ctx.globalAlpha = c.layer === 0 ? 0.09 : 0.055;
    ctx.fillStyle = "#141414";
    ctx.beginPath();
    ctx.ellipse(c.x + sway, c.y, c.r, c.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // volumetric light shafts, drifting slowly
  for (let i = 0; i < 4; i++) {
    const baseX = w * (0.15 + i * 0.24);
    const drift = noise.snoise(i * 7.1, t * 0.02) * 40;
    const grad = ctx.createLinearGradient(baseX, 0, baseX + 90, h * 0.8);
    grad.addColorStop(0, "rgba(245,245,245,0.07)");
    grad.addColorStop(1, "rgba(245,245,245,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(baseX + drift - 12, 0);
    ctx.lineTo(baseX + drift + 34, 0);
    ctx.lineTo(baseX + drift + 130, h * 0.85);
    ctx.lineTo(baseX + drift + 30, h * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  // mist band
  const mist = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.5);
  mist.addColorStop(0, "rgba(240,240,240,0)");
  mist.addColorStop(0.5, `rgba(240,240,240,${0.07 + wind * 0.03})`);
  mist.addColorStop(1, "rgba(240,240,240,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, h * 0.2, w, h * 0.3);

  // pollen — stillness invites more of it into the light
  const richness = 1 + clamp((idle - 25) / 60, 0, 1) * 0.7;
  for (const p of s.pollen) {
    p.y -= dt * (2.4 + noise.noise2(p.phase, t * 0.12) * 3);
    p.x += noise.snoise(p.y * 0.01, p.phase) * (6 + wind * 14) * dt;
    if (p.y < -4) {
      p.y = h + 4;
      p.x = s.rand() * w;
    }
    ctx.globalAlpha =
      (0.08 + 0.2 * noise.noise2(p.phase * 2, t * 0.5)) * richness;
    ctx.fillStyle = "#e6e6e6";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- creatures: quiet silhouettes on the forest floor ----
  const floorY = h - 14;
  ctx.fillStyle = "#161616";
  ctx.strokeStyle = "#161616";

  // deer — walks, stops, listens, moves again
  stepWalker(s.deer, dt, w, 90, s.rand, 0.12, [18, 50]);
  if (s.deer.state !== "away") {
    const step = s.deer.state === "walking" ? t * 6 : 0;
    ctx.globalAlpha = 0.13;
    drawDeer(ctx, s.deer.x, floorY, s.deer.dir, step);
  }

  // elephant — appears once every few minutes, never on the same clock
  stepWalker(s.elephant, dt, w, 220, s.rand, 0.03, [150, 380]);
  if (s.elephant.state !== "away") {
    ctx.globalAlpha = 0.12;
    drawElephant(
      ctx,
      s.elephant.x,
      floorY,
      s.elephant.dir,
      s.elephant.state === "walking" ? t * 4 : 0
    );
  }

  // turtle — near the corner; moves only a little; represents patience
  s.turtleX += dt * 0.5 * (0.5 + noise.noise2(1.1, t * 0.01));
  if (s.turtleX > w + 30) s.turtleX = -30;
  ctx.globalAlpha = 0.11;
  ctx.beginPath();
  ctx.ellipse(s.turtleX, floorY - 4, 9, 5, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.turtleX + 9.5, floorY - 4, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // butterflies — unpredictable, and taps startle them upward
  for (const e of events) {
    if (e.type === "tap") for (const b of s.butterflies) b.startle = 1;
  }
  for (const b of s.butterflies) {
    b.startle = Math.max(0, b.startle - dt * 0.6);
    const speed = 20 + b.startle * 90;
    b.x += noise.snoise(b.phase, t * 0.21) * speed * dt;
    b.y +=
      (noise.snoise(b.phase + 40, t * 0.26) * speed - b.startle * 70) * dt;
    b.x = ((b.x % w) + w) % w;
    b.y = clamp(b.y, h * 0.12, h * 0.82);
    drawButterfly(ctx, b.x, b.y, t * (9 + b.startle * 10) + b.phase, 0.35);
  }

  // birds — some glide across, some vanish into the trees
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.6;
  for (const bd of s.birds) {
    if (!bd.active) {
      bd.timer -= dt;
      if (bd.timer <= 0) {
        bd.active = true;
        const dir = s.rand() < 0.5 ? 1 : -1;
        bd.x = dir === 1 ? -20 : w + 20;
        bd.vx = dir * (26 + s.rand() * 30);
        bd.y = h * (0.1 + s.rand() * 0.3);
        bd.flap = s.rand() * 10;
      }
      continue;
    }
    bd.x += bd.vx * dt;
    bd.y += noise.snoise(bd.flap, t * 0.4) * 10 * dt;
    bd.flap += dt * (s.rand() < 0.3 ? 10 : 3); // glides, then flaps
    ctx.globalAlpha = 0.3;
    drawBird(ctx, bd.x, bd.y, bd.flap);
    if (bd.x < -30 || bd.x > w + 30) {
      bd.active = false;
      bd.timer = 14 + s.rand() * 45;
    }
  }
  ctx.globalAlpha = 1;
}

export function ForestScene({ opacity = 1 }: { opacity?: number }) {
  return <LivingCanvas init={init} draw={draw} opacity={opacity} />;
}
