"use client";

// Theme 1 — Ocean of Consciousness.
// A night-to-day sky over living water. The waves are procedural (summed
// sines whose amplitudes drift on a noise field — no wave ever repeats),
// the tide breathes, dew droplets crawl down the glass and merge, and
// every tap or strong scroll touches the water with quiet ripples.
import { LivingCanvas, type SceneFrame } from "./living-canvas";
import { makeNoise, makeRandom, clamp, mixHex } from "@/lib/living/noise";

interface Ripple {
  x: number;
  y: number;
  r: number;
  speed: number;
  life: number; // 0..1 remaining
}

interface Drop {
  x: number;
  y: number;
  r: number;
  vy: number;
  wobble: number;
  pause: number;
}

interface Mote {
  x: number;
  y: number;
  phase: number;
  size: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
}

interface OceanState {
  noise: ReturnType<typeof makeNoise>;
  rand: () => number;
  ripples: Ripple[];
  drops: Drop[];
  motes: Mote[];
  stars: Star[];
  nextRainRipple: number;
}

// Sky palettes across the day — black to charcoal, with a red horizon
// glow at dawn and dusk. [zenith, mid, horizon]
const SKY: [number, string, string, string][] = [
  [0.0, "#0a0a0b", "#141215", "#1c1518"], // deep night
  [0.23, "#121013", "#1e181c", "#331f26"], // pre-dawn
  [0.32, "#1a1518", "#3a2228", "#7e2f38"], // dawn — red horizon
  [0.5, "#1c1a1c", "#2a2226", "#582931"], // day (kept dark, red-tinted)
  [0.72, "#181316", "#331f26", "#6e2b34"], // dusk — red
  [0.85, "#0f0d10", "#181318", "#241820"], // nightfall
  [1.0, "#0a0a0b", "#141215", "#1c1518"],
];

function skyAt(phase: number): [string, string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [p1, a1, b1, c1] = SKY[i];
    const [p2, a2, b2, c2] = SKY[i + 1];
    if (phase >= p1 && phase <= p2) {
      const t = (phase - p1) / (p2 - p1);
      return [mixHex(a1, a2, t), mixHex(b1, b2, t), mixHex(c1, c2, t)];
    }
  }
  return ["#0a0a0b", "#141215", "#1c1518"];
}

function nightness(phase: number): number {
  // 1 at deep night, 0 at midday
  const d = Math.abs(phase - 0.5);
  return clamp((d - 0.18) / 0.22, 0, 1);
}

function init(w: number, h: number): OceanState {
  const rand = makeRandom(Math.floor(w * 7 + h * 13) + 5);
  const motes = Array.from({ length: w < 640 ? 26 : 46 }, () => ({
    x: rand() * w,
    y: rand() * h,
    phase: rand() * Math.PI * 2,
    size: 0.7 + rand() * 1.5,
  }));
  const stars = Array.from({ length: w < 640 ? 60 : 110 }, () => ({
    x: rand() * w,
    y: rand() * h * 0.65,
    size: 0.5 + rand() * 1.1,
    phase: rand() * Math.PI * 2,
  }));
  const drops = Array.from({ length: w < 640 ? 4 : 7 }, () => ({
    x: rand() * w,
    y: rand() * h * 0.5,
    r: 1.5 + rand() * 2.5,
    vy: 3 + rand() * 8,
    wobble: rand() * Math.PI * 2,
    pause: rand() * 4,
  }));
  return {
    noise: makeNoise(97),
    rand,
    ripples: [],
    drops,
    motes,
    stars,
    nextRainRipple: 4 + rand() * 6,
  };
}

function waterlineAt(
  x: number,
  t: number,
  wind: number,
  baseY: number,
  noise: OceanState["noise"]
): number {
  const amp = 1 + wind * 0.9;
  const n = 0.5 + 0.5 * noise.snoise(x * 0.0016 + t * 0.03, t * 0.05);
  return (
    baseY +
    Math.sin(x * 0.011 + t * 0.7) * 2.4 * amp * n +
    Math.sin(x * 0.023 - t * 0.43) * 1.6 * amp +
    Math.sin(x * 0.005 + t * 0.21) * 3.2 * amp * (0.4 + 0.6 * n)
  );
}

function draw(f: SceneFrame, s: OceanState) {
  const { ctx, w, h, t, dt, wind, idle, dayPhase, events } = f;
  const [top, mid, horizon] = skyAt(dayPhase);
  const night = nightness(dayPhase);

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, top);
  sky.addColorStop(0.55, mid);
  sky.addColorStop(1, horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // stars (twinkle on a noise field; only at night)
  if (night > 0.05) {
    for (const st of s.stars) {
      const tw =
        0.35 + 0.65 * s.noise.noise2(st.x * 0.05 + t * 0.35, st.phase);
      ctx.globalAlpha = night * 0.75 * tw;
      ctx.fillStyle = "#ededed";
      ctx.fillRect(st.x, st.y, st.size, st.size);
    }
    ctx.globalAlpha = 1;
  }

  // moon with slow drift and soft halo
  const moonX = w * 0.78 + Math.sin(t * 0.008) * 12;
  const moonY = h * 0.18;
  if (night > 0.05) {
    const halo = ctx.createRadialGradient(
      moonX, moonY, 4, moonX, moonY, 90
    );
    halo.addColorStop(0, `rgba(240,240,240,${0.5 * night})`);
    halo.addColorStop(0.25, `rgba(224,224,224,${0.12 * night})`);
    halo.addColorStop(1, "rgba(224,224,224,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
    ctx.beginPath();
    ctx.arc(moonX, moonY, 13, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(246,246,246,${0.85 * night + 0.1})`;
    ctx.fill();
  }

  // the tide breathes: waterline rises and falls almost imperceptibly
  const baseY = h * 0.82 + Math.sin((t * Math.PI * 2) / 9) * 3;

  // water body
  const step = 6;
  ctx.beginPath();
  ctx.moveTo(0, waterlineAt(0, t, wind, baseY, s.noise));
  for (let x = step; x <= w + step; x += step) {
    ctx.lineTo(x, waterlineAt(x, t, wind, baseY, s.noise));
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  const water = ctx.createLinearGradient(0, baseY - 10, 0, h);
  water.addColorStop(0, mixHex("#241619", "#140d0f", night * 0.6));
  water.addColorStop(0.5, mixHex("#180f11", "#0b0708", night * 0.6));
  water.addColorStop(1, "#050405");
  ctx.fillStyle = water;
  ctx.fill();

  // glassy surface highlight
  ctx.beginPath();
  ctx.moveTo(0, waterlineAt(0, t, wind, baseY, s.noise));
  for (let x = step; x <= w + step; x += step) {
    ctx.lineTo(x, waterlineAt(x, t, wind, baseY, s.noise));
  }
  ctx.strokeStyle = "rgba(236,236,236,0.26)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // moon / dawn light reflection: a shimmering column of dashes
  const lightX = night > 0.3 ? moonX : w * 0.5;
  for (let i = 0; i < 16; i++) {
    const y = baseY + 6 + i * ((h - baseY) / 18);
    const n = s.noise.noise2(i * 3.7, t * 0.6);
    const len = 12 + n * 34 + i * 1.6;
    const off = s.noise.snoise(i * 9.1, t * 0.32) * (8 + i * 1.4);
    ctx.globalAlpha =
      (night > 0.3 ? night : 0.35) * 0.16 * (1 - i / 18) * (0.4 + n);
    ctx.strokeStyle = "#ececec";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(lightX + off - len / 2, y);
    ctx.lineTo(lightX + off + len / 2, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // drifting glints across the surface
  for (let i = 0; i < 7; i++) {
    const gx = ((s.noise.noise2(i * 13.3, t * 0.05) * 1.3) % 1) * w;
    const gy = baseY + 4 + s.noise.noise2(i * 7.7, t * 0.11) * (h - baseY) * 0.5;
    ctx.globalAlpha = 0.1 + 0.12 * s.noise.noise2(i * 3.1, t * 0.9);
    ctx.strokeStyle = "#d94a50";
    ctx.beginPath();
    ctx.moveTo(gx - 7, gy);
    ctx.lineTo(gx + 7, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // events → ripples (taps anywhere touch the stillness; gusts stir water)
  for (const e of events) {
    const y = Math.max(e.y, baseY + 8);
    for (let k = 0; k < 3; k++) {
      s.ripples.push({
        x: e.x,
        y: e.type === "tap" ? y : baseY + 10 + s.rand() * 30,
        r: 2 + k * 5,
        speed: 26 + k * 9,
        life: 1,
      });
    }
  }
  // occasionally, an unseen drop of rain touches the ocean on its own
  s.nextRainRipple -= dt;
  if (s.nextRainRipple <= 0) {
    s.ripples.push({
      x: s.rand() * w,
      y: baseY + 12 + s.rand() * (h - baseY) * 0.4,
      r: 2,
      speed: 20,
      life: 1,
    });
    s.nextRainRipple = 5 + s.rand() * 9 - Math.min(4, idle * 0.02);
  }

  // ripples: gentle circles, flattened like perspective on water
  for (const rp of s.ripples) {
    rp.r += rp.speed * dt;
    rp.life -= dt * 0.55;
    if (rp.life <= 0) continue;
    ctx.globalAlpha = rp.life * 0.35;
    ctx.strokeStyle = "#e8e8e8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  s.ripples = s.ripples.filter((r) => r.life > 0);
  ctx.globalAlpha = 1;

  // dew droplets crawling down the glass
  for (const d of s.drops) {
    if (d.pause > 0) {
      d.pause -= dt;
    } else {
      d.y += d.vy * dt * (0.6 + 0.8 * s.noise.noise2(d.x * 0.01, t * 0.3));
      d.x += s.noise.snoise(d.y * 0.02, d.wobble) * 8 * dt;
      if (s.rand() < dt * 0.08) d.pause = 1 + s.rand() * 3; // rests, like dew
    }
    // merge with a close neighbour
    for (const other of s.drops) {
      if (other === d || other.r === 0) continue;
      const dx = other.x - d.x;
      const dy = other.y - d.y;
      if (dx * dx + dy * dy < (d.r + other.r) * (d.r + other.r)) {
        d.r = Math.min(4.5, Math.hypot(d.r, other.r));
        d.vy += 6; // a merged drop runs faster for a moment
        other.r = 0;
      }
    }
    if (d.y > waterlineAt(d.x, t, wind, baseY, s.noise) || d.r === 0) {
      // it reaches the ocean and becomes ocean
      if (d.r > 0) {
        s.ripples.push({ x: d.x, y: d.y + 4, r: 2, speed: 22, life: 1 });
      }
      d.x = s.rand() * w;
      d.y = -6;
      d.r = 1.5 + s.rand() * 2.5;
      d.vy = 3 + s.rand() * 8;
      d.pause = s.rand() * 5;
    }
    const g = ctx.createRadialGradient(
      d.x - d.r * 0.3, d.y - d.r * 0.3, 0.2, d.x, d.y, d.r * 2.2
    );
    g.addColorStop(0, "rgba(242,242,242,0.5)");
    g.addColorStop(0.5, "rgba(214,214,214,0.16)");
    g.addColorStop(1, "rgba(214,214,214,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // consciousness motes — rise slowly; stillness invites more of them
  const moteBoost = clamp((idle - 20) / 60, 0, 1) * 0.5;
  for (const m of s.motes) {
    m.y -= dt * (3 + 2 * s.noise.noise2(m.phase, t * 0.1));
    m.x += s.noise.snoise(m.y * 0.008, m.phase) * 5 * dt;
    if (m.y < -4) {
      m.y = h + 4;
      m.x = s.rand() * w;
    }
    const a =
      (0.05 + 0.16 * s.noise.noise2(m.phase * 3, t * 0.4)) * (1 + moteBoost);
    ctx.globalAlpha = a;
    ctx.fillStyle = "#d98f93";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function OceanScene({ opacity = 1 }: { opacity?: number }) {
  return <LivingCanvas init={init} draw={draw} opacity={opacity} />;
}
