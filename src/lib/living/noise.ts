// Small deterministic value-noise implementation with fBm, used to drive
// every organic movement in the living scenes. No dependencies.

function hash2(x: number, y: number, seed: number): number {
  let h = seed ^ (x * 374761393) ^ (y * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function makeNoise(seed = 1337) {
  // 2D value noise in [0,1]
  function noise2(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const a = hash2(xi, yi, seed);
    const b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed);
    const d = hash2(xi + 1, yi + 1, seed);
    const u = smooth(xf);
    const v = smooth(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // fractal Brownian motion, roughly [0,1]
  function fbm(x: number, y: number, octaves = 3): number {
    let value = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      value += amp * noise2(x * freq, y * freq);
      freq *= 2.02;
      amp *= 0.5;
    }
    return value;
  }

  // signed variant [-1,1]
  function snoise(x: number, y: number): number {
    return noise2(x, y) * 2 - 1;
  }

  return { noise2, fbm, snoise };
}

export type Noise = ReturnType<typeof makeNoise>;

// Seedable uniform random stream for one-off decisions (spawn times, sizes).
export function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// Mix two hex colors (#rrggbb) — used for time-of-day palette flow.
export function mixHex(c1: string, c2: string, t: number): string {
  const p1 = parseInt(c1.slice(1), 16);
  const p2 = parseInt(c2.slice(1), 16);
  const r = Math.round(lerp((p1 >> 16) & 255, (p2 >> 16) & 255, t));
  const g = Math.round(lerp((p1 >> 8) & 255, (p2 >> 8) & 255, t));
  const b = Math.round(lerp(p1 & 255, p2 & 255, t));
  return `rgb(${r},${g},${b})`;
}
