"use client";

// The shared runtime for the living scenes. Owns a full-viewport canvas and
// a requestAnimationFrame loop, and hands each frame a SceneFrame carrying
// everything a world needs to feel alive:
//   t / dt      — continuous time
//   wind        — eased from the user's scrolling; decays toward a breeze
//   idle        — seconds of stillness (nature grows richer as it rises)
//   dayPhase    — 0..1 across the real local day (time flows continuously)
//   breath      — the whole scene inhales/exhales ±0.3% on an 11s cycle
//   events      — taps and gusts since the last frame (ripples, startled wings)
// The loop pauses when the tab is hidden and renders a single still frame
// when the visitor prefers reduced motion.
import { useEffect, useRef } from "react";

export interface SceneEvent {
  type: "tap" | "gust";
  x: number;
  y: number;
  mag: number;
}

export interface SceneFrame {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number;
  dt: number;
  wind: number; // -1..1
  idle: number; // seconds since last interaction
  dayPhase: number; // 0..1 over the local day
  reduced: boolean;
  events: SceneEvent[];
  pointer: { x: number; y: number; inside: boolean };
}

export type SceneDraw<S> = (frame: SceneFrame, state: S) => void;
export type SceneInit<S> = (w: number, h: number) => S;

function currentDayPhase(): number {
  const d = new Date();
  return (
    (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400
  );
}

export function LivingCanvas<S>({
  init,
  draw,
  className,
  opacity = 1,
}: {
  init: SceneInit<S>;
  draw: SceneDraw<S>;
  className?: string;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initRef = useRef(init);
  const drawRef = useRef(draw);
  useEffect(() => {
    initRef.current = init;
    drawRef.current = draw;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let w = 0;
    let h = 0;
    let state: S;
    let raf = 0;
    let last = performance.now();
    const start = last;
    let wind = 0.12;
    let windTarget = 0.12;
    let lastInteraction = performance.now();
    let lastScrollY = window.scrollY;
    const events: SceneEvent[] = [];
    const pointer = { x: -1, y: -1, inside: false };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = initRef.current(w, h);
    }
    resize();

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;

      // wind: eased toward target, target decays toward a faint breeze
      windTarget += (0.12 - windTarget) * Math.min(1, dt * 0.35);
      wind += (windTarget - wind) * Math.min(1, dt * 1.8);

      const idle = (now - lastInteraction) / 1000;

      ctx!.clearRect(0, 0, w, h);
      // the scene breathes: ±0.3% scale on an 11-second cycle
      const breath = 1 + 0.003 * Math.sin((t * Math.PI * 2) / 11);
      ctx!.save();
      ctx!.translate(w / 2, h / 2);
      ctx!.scale(breath, breath);
      ctx!.translate(-w / 2, -h / 2);

      drawRef.current(
        {
          ctx: ctx!,
          w,
          h,
          t,
          dt,
          wind,
          idle,
          dayPhase: currentDayPhase(),
          reduced,
          events: events.splice(0, events.length),
          pointer,
        },
        state
      );
      ctx!.restore();

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    function onScroll() {
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      windTarget = Math.max(
        -1,
        Math.min(1, windTarget + dy * 0.004)
      );
      lastInteraction = performance.now();
      if (Math.abs(dy) > 40) {
        events.push({
          type: "gust",
          x: pointer.x >= 0 ? pointer.x : w / 2,
          y: pointer.y >= 0 ? pointer.y : h / 2,
          mag: Math.min(1, Math.abs(dy) / 300),
        });
      }
    }
    function onPointerDown(e: PointerEvent) {
      lastInteraction = performance.now();
      events.push({ type: "tap", x: e.clientX, y: e.clientY, mag: 1 });
    }
    function onPointerMove(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      lastInteraction = performance.now();
    }
    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 ${className ?? ""}`}
      style={{ opacity }}
    />
  );
}
