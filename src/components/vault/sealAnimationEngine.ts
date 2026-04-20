/**
 * Seal animation render engine — ported from prototypes/vault-design-palette.html.
 *
 * This is a black-box port. The prototype's `drawFrame(ms, isOpen)` is the
 * single source of truth for the seal's visual identity; its dense canvas
 * math is preserved here as closely as possible, with three adaptations:
 *
 *   1. Globals from the prototype (`C`, `W`, `H`, `CX`, `CY`, `shimmerPhase`,
 *      `animating`) become per-engine state on `SealAnimationState` so
 *      multiple instances can render independently.
 *   2. Offscreen static layers (hammerLayer, velvetLayer, stoneTexLayer) and
 *      pre-computed data (stoneOutline, veinData) are created lazily inside
 *      `createSealAnimationState()` so nothing touches `document` at module
 *      import — important for Next.js SSR/bundling.
 *   3. Dead helpers (`drawInterior`, `drawBreathStone`, `drawNotches`,
 *      `drawRim`, `mineralRing`) are dropped — drawFrame inlines equivalent
 *      logic and never calls them.
 *
 * Refactoring the render itself is 7c polish. Do not edit drawFrame casually.
 */

// ─── Canvas dimensions ───────────────────────────────────────────────
export const CANVAS_W = 600;
export const CANVAS_H = 600;
const CX = CANVAS_W / 2;
const CY = CANVAS_H / 2;

// ─── Case geometry (the vault body) ──────────────────────────────────
const caseW = 300;
const caseH = 340;
const caseCR = 30;
const mechR = 105;
const wellInset = 22;

// ─── Timing (ms) ─────────────────────────────────────────────────────
export const P1 = 150;
export const P2 = 500;
export const P3 = 150;
export const SILENCE = 600;
export const TOTAL = P1 + P2 + P3; // 800ms

// ─── Utilities ───────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

class PerlinNoise {
  private g: Record<string, { x: number; y: number }> = {};
  private m: Record<string, number> = {};

  private rv() {
    const t = Math.random() * Math.PI * 2;
    return { x: Math.cos(t), y: Math.sin(t) };
  }

  private dp(x: number, y: number, vx: number, vy: number) {
    const k = `${vx},${vy}`;
    if (!this.g[k]) this.g[k] = this.rv();
    return (x - vx) * this.g[k].x + (y - vy) * this.g[k].y;
  }

  private sm(x: number) {
    return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
  }

  private lr(x: number, a: number, b: number) {
    return a + this.sm(x) * (b - a);
  }

  get(x: number, y: number): number {
    const k = `${x},${y}`;
    if (this.m[k] !== undefined) return this.m[k];
    const xf = Math.floor(x);
    const yf = Math.floor(y);
    const v = this.lr(
      y - yf,
      this.lr(x - xf, this.dp(x, y, xf, yf), this.dp(x, y, xf + 1, yf)),
      this.lr(x - xf, this.dp(x, y, xf, yf + 1), this.dp(x, y, xf + 1, yf + 1))
    );
    this.m[k] = v;
    return v;
  }
}

const noise = new PerlinNoise();

type RGB = readonly [number, number, number];

const PAL = {
  bg: [251, 248, 244] as RGB,
  card: [245, 240, 234] as RGB,
  sand: [235, 228, 220] as RGB,
  honey: [232, 220, 200] as RGB,
  mineral: [122, 128, 136] as RGB,
  mineralDk: [101, 107, 115] as RGB,
  text1: [28, 26, 24] as RGB,
  text2: [107, 107, 107] as RGB,
  text3: [173, 169, 165] as RGB,
};

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ] as const;
}

function rgb(c: RGB): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function mineralMetal(warmth: number, lightness: number): RGB {
  const cool = PAL.mineral;
  const warm: RGB = [188, 178, 158];
  const base = mix(cool, warm, warmth * 0.6);
  const light: RGB = [235, 228, 218];
  const dark: RGB = [85, 88, 94];
  return lightness >= 0.5
    ? mix(base, light, (lightness - 0.5) * 2)
    : mix(dark, base, lightness * 2);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHex(h1: string, h2: string, t: number): string {
  const r1 = parseInt(h1.slice(1, 3), 16);
  const g1 = parseInt(h1.slice(3, 5), 16);
  const b1 = parseInt(h1.slice(5, 7), 16);
  const r2 = parseInt(h2.slice(1, 3), 16);
  const g2 = parseInt(h2.slice(3, 5), 16);
  const b2 = parseInt(h2.slice(5, 7), 16);
  return (
    '#' +
    [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
  );
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type PhaseName = 'open' | 'initiation' | 'compression' | 'lock' | 'sealed';

interface PhaseState {
  p1: number;
  p2: number;
  p3: number;
  phase: PhaseName;
  overshoot: number;
}

function phaseProgress(ms: number): PhaseState {
  if (ms <= 0) return { p1: 0, p2: 0, p3: 0, phase: 'open', overshoot: 0 };
  if (ms <= P1)
    return { p1: easeOutQuad(ms / P1), p2: 0, p3: 0, phase: 'initiation', overshoot: 0 };
  const ms2 = ms - P1;
  if (ms2 <= P2)
    return {
      p1: 1,
      p2: easeInOutCubic(ms2 / P2),
      p3: 0,
      phase: 'compression',
      overshoot: 0,
    };
  const ms3 = ms2 - P2;
  if (ms3 <= P3) {
    const t3 = ms3 / P3;
    const overshoot = Math.sin(t3 * Math.PI) * (1 - t3) * 1.2;
    return { p1: 1, p2: 1, p3: Math.min(1, t3), phase: 'lock', overshoot };
  }
  return { p1: 1, p2: 1, p3: 1, phase: 'sealed', overshoot: 0 };
}

// ─── OPEN / SEALED parameter objects ──────────────────────────────────
// Every visual axis interpolates between these two states across phase
// progress. Do not add axes without updating drawFrame to consume them.

const OPEN = {
  warmth: 0.22, glow: 0.03, ringContract: 0.0,
  spokeWidth: 1.8, spokeOpacity: 0.18, stoneGlow: 0.02, stoneRadius: 30,
  interiorDark: 0.42, auraOpacity: 0.0, auraRadius: 0,
  caseHighlight: 0.04, caseShadowDepth: 0.09,
  highlightSharpness: 0.6, interiorVignette: 0.12,
  shadowBlur: 24, shadowAlpha: 0.14, shadowOffY: 6,
  rimAlpha: 0.14, rimWidth: 2.2, coolWashAlpha: 0.06,
  stoneSpecAlpha: 0.25, stoneSpecRadius: 0.22, stoneEdge: 0.08,
  stoneVein: 0.04, stoneTexture: 0.012, stoneContact: 0.12,
  cornerDark: 0.07, gapBreachAlpha: 0.06, envDarken: 0.0,
};

const SEALED = {
  warmth: 0.9, glow: 0.35, ringContract: 1.0,
  spokeWidth: 6.5, spokeOpacity: 0.65, stoneGlow: 0.3, stoneRadius: 40,
  interiorDark: 0.08, auraOpacity: 0.09, auraRadius: 7,
  caseHighlight: 0.22, caseShadowDepth: 0.02,
  highlightSharpness: 1.0, interiorVignette: 0.04,
  shadowBlur: 14, shadowAlpha: 0.07, shadowOffY: 4,
  rimAlpha: 0.38, rimWidth: 2.8, coolWashAlpha: 0.0,
  stoneSpecAlpha: 0.5, stoneSpecRadius: 0.3, stoneEdge: 0.12,
  stoneVein: 0.06, stoneTexture: 0.018, stoneContact: 0.08,
  cornerDark: 0.0, gapBreachAlpha: 0.0, envDarken: 0.04,
};

// ─── Case path + static-layer helpers ─────────────────────────────────

function makeCasePath(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  const x = cx - caseW / 2;
  const y = cy - caseH / 2;
  ctx.beginPath();
  ctx.moveTo(x + caseCR, y);
  ctx.lineTo(x + caseW - caseCR, y);
  ctx.quadraticCurveTo(x + caseW, y, x + caseW, y + caseCR);
  ctx.lineTo(x + caseW, y + caseH - caseCR);
  ctx.quadraticCurveTo(x + caseW, y + caseH, x + caseW - caseCR, y + caseH);
  ctx.lineTo(x + caseCR, y + caseH);
  ctx.quadraticCurveTo(x, y + caseH, x, y + caseH - caseCR);
  ctx.lineTo(x, y + caseCR);
  ctx.quadraticCurveTo(x, y, x + caseCR, y);
  ctx.closePath();
}

// ─── Static offscreen layers ──────────────────────────────────────────
// Deterministic content that never changes. Rendered once per state
// object and composited each frame via drawImage.

function createHammerLayer(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const caseX = CX - caseW / 2;
  const caseY = CY - caseH / 2;
  const r = seededRandom(264);
  for (let i = 0; i < 50; i++) {
    const dx = caseX + r() * caseW;
    const dy = caseY + r() * caseH;
    const dr = 5 + r() * 14;
    const dg = ctx.createRadialGradient(dx - dr * 0.2, dy - dr * 0.2, 0, dx, dy, dr);
    dg.addColorStop(0, rgba(PAL.card, 0.04 + r() * 0.04));
    dg.addColorStop(0.5, rgba(PAL.card, 0));
    dg.addColorStop(1, rgba(PAL.mineralDk, 0.02 + r() * 0.025));
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function createVelvetLayer(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const wellX = CX - caseW / 2 + wellInset;
  const wellY = CY - caseH / 2 + wellInset;
  const wellW = caseW - wellInset * 2;
  const wellH = caseH - wellInset * 2;
  const vr = seededRandom(311);
  for (let i = 0; i < 250; i++) {
    const px = wellX + vr() * wellW;
    const py = wellY + vr() * wellH;
    ctx.fillStyle =
      vr() > 0.5
        ? rgba(PAL.card, 0.02 + vr() * 0.02)
        : rgba(PAL.mineralDk, 0.01 + vr() * 0.015);
    ctx.fillRect(px, py, 0.4 + vr() * 0.8, 0.8 + vr() * 2);
  }
  return canvas;
}

function createStoneTexLayer(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const mechCY = CY + 8;
  const r = 40; // max stone radius
  const tR = seededRandom(7777);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 160; i++) {
    const a = tR() * Math.PI * 2;
    const d = tR() * r * 0.9;
    ctx.fillStyle = tR() > 0.5 ? rgba(PAL.text1, 0.4) : rgba(PAL.bg, 0.5);
    ctx.fillRect(
      CX + Math.cos(a) * d,
      mechCY + Math.sin(a) * d,
      tR() < 0.8 ? 1 : 1.4,
      tR() < 0.8 ? 1 : 1.4
    );
  }
  return canvas;
}

// ─── Pre-computed stone outline + vein positions ──────────────────────

interface StonePoint {
  cos: number;
  sin: number;
}

interface VeinPoint {
  va: number;
  vd: number;
  vs: number;
  vAspect: number;
}

function buildStoneOutline(): StonePoint[] {
  const out: StonePoint[] = [];
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2;
    const n = noise.get(Math.cos(a) * 0.2 + CX * 0.001, Math.sin(a) * 0.2 + (CY + 8) * 0.001);
    out.push({
      cos: Math.cos(a) * (1 + n * 0.045),
      sin: Math.sin(a) * (1 + n * 0.045),
    });
  }
  return out;
}

function buildVeinData(): VeinPoint[] {
  const out: VeinPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const va = (i / 6) * Math.PI * 2 + noise.get(i * 0.6, CX * 0.01) * 2;
    const vd = 0.25 + noise.get(i, 1) * 0.35;
    const vs = 0.1 + noise.get(i, 3) * 0.08;
    const vAspect = 0.5 + noise.get(i, 4) * 0.4;
    out.push({ va, vd, vs, vAspect });
  }
  return out;
}

// ─── Per-render-instance state ────────────────────────────────────────

export interface SealAnimationState {
  hammerLayer: HTMLCanvasElement;
  velvetLayer: HTMLCanvasElement;
  stoneTexLayer: HTMLCanvasElement;
  stoneOutline: StonePoint[];
  veinData: VeinPoint[];
  shimmerPhase: number;
  animating: boolean;
}

/**
 * Create the per-instance state. Must be called in a browser context — it
 * allocates three offscreen canvases via `document.createElement`.
 */
export function createSealAnimationState(): SealAnimationState {
  return {
    hammerLayer: createHammerLayer(),
    velvetLayer: createVelvetLayer(),
    stoneTexLayer: createStoneTexLayer(),
    stoneOutline: buildStoneOutline(),
    veinData: buildVeinData(),
    shimmerPhase: 0,
    animating: false,
  };
}

// ─── Ring renderer ────────────────────────────────────────────────────

function drawRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  iR: number,
  oR: number,
  w: number,
  type: 'warm' | 'cool' | 'bronze',
  hlSharp: number,
  warmT: number
) {
  ctx.save();
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  ctx.beginPath();
  ctx.arc(cx + 1, cy + 1.5, (iR + oR) / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const m = mineralMetal;
  const rg = ctx.createRadialGradient(cx - oR * 0.08, cy - oR * 0.08, iR, cx, cy, oR);
  const ww = type === 'warm' ? w : type === 'cool' ? w * 0.3 : w * 0.7;
  rg.addColorStop(0, rgb(m(ww, type === 'warm' ? 0.72 : 0.7)));
  rg.addColorStop(
    0.4,
    rgb(m(ww, type === 'warm' ? 0.58 : type === 'cool' ? 0.55 : 0.54))
  );
  rg.addColorStop(
    1,
    rgb(m(ww, type === 'warm' ? 0.42 : type === 'cool' ? 0.4 : 0.38))
  );
  ctx.beginPath();
  ctx.arc(cx, cy, oR, 0, Math.PI * 2);
  ctx.arc(cx, cy, iR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fillStyle = rg;
  ctx.fill();

  // Highlight
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, oR, 0, Math.PI * 2);
  ctx.arc(cx, cy, iR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  const hlEnd = cy - oR * lerp(0.25, 0.15, warmT);
  const hlA = (type === 'cool' ? 0.22 : 0.16) * w * hlSharp;
  const hl = ctx.createLinearGradient(cx, cy - oR, cx, hlEnd);
  hl.addColorStop(0, rgba(PAL.bg, hlA));
  hl.addColorStop(1, rgba(PAL.bg, 0));
  ctx.fillStyle = hl;
  ctx.fillRect(cx - oR, cy - oR, oR * 2, oR);
  const sh = ctx.createLinearGradient(cx, cy + oR * 0.25, cx, cy + oR);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, `rgba(0,0,0,${0.06 * w})`);
  ctx.fillStyle = sh;
  ctx.fillRect(cx - oR, cy, oR * 2, oR);
  ctx.restore();

  ctx.strokeStyle = rgba(PAL.bg, 0.08 * w);
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, oR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = rgba(PAL.mineralDk, 0.06 * w);
  ctx.beginPath();
  ctx.arc(cx, cy, iR, 0, Math.PI * 2);
  ctx.stroke();
}

// ─── Main render ──────────────────────────────────────────────────────

/**
 * Render a single frame of the seal animation to `ctx`. The phase timeline
 * is driven entirely by `ms`: 0 = fully open, TOTAL (800) = fully sealed.
 * `isOpen=true` activates the ambient open-state shimmer inside the well
 * (only useful for the static open frame; the animation pipeline passes
 * `false` throughout so the shimmer doesn't fight the mechanism motion).
 *
 * Mutates `state.shimmerPhase` when the open shimmer renders.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: SealAnimationState,
  ms: number,
  isOpen: boolean
): void {
  const pp = phaseProgress(ms);

  const mechT = Math.min(1, pp.p1 * 0.3 + pp.p2 * 0.7);
  const stoneT = Math.min(1, pp.p1 * 0.1 + pp.p2 * 0.7 + pp.p3 * 0.2);
  const globalT = Math.min(1, pp.p2 * 0.6 + pp.p3 * 0.4);
  const glowSpike =
    pp.phase === 'initiation'
      ? 0.1 * pp.p1
      : pp.phase === 'compression'
      ? 0.1 * Math.max(0, 1 - pp.p2)
      : 0;

  const rc = lerp(OPEN.ringContract, SEALED.ringContract, mechT);
  const sw = lerp(OPEN.spokeWidth, SEALED.spokeWidth, mechT);
  const so = lerp(OPEN.spokeOpacity, SEALED.spokeOpacity, mechT);
  const w = lerp(OPEN.warmth, SEALED.warmth, globalT);
  const glow = lerp(OPEN.glow, SEALED.glow, globalT) + glowSpike;
  const stoneGlow = lerp(OPEN.stoneGlow, SEALED.stoneGlow, stoneT) + glowSpike;
  const stoneR = lerp(OPEN.stoneRadius, SEALED.stoneRadius, stoneT);
  const intDark = lerp(OPEN.interiorDark, SEALED.interiorDark, stoneT);
  const hlSharp = lerp(OPEN.highlightSharpness, SEALED.highlightSharpness, globalT);
  const caseHL = lerp(OPEN.caseHighlight, SEALED.caseHighlight, globalT);
  const coolWash = lerp(OPEN.coolWashAlpha, SEALED.coolWashAlpha, globalT);
  const rimA = lerp(OPEN.rimAlpha, SEALED.rimAlpha, globalT);
  const rimW = lerp(OPEN.rimWidth, SEALED.rimWidth, globalT);
  const auraOp = lerp(OPEN.auraOpacity, SEALED.auraOpacity, globalT);
  const auraR = lerp(OPEN.auraRadius, SEALED.auraRadius, globalT);
  const shBlur = Math.round(lerp(OPEN.shadowBlur, SEALED.shadowBlur, mechT));
  const shAlpha = lerp(OPEN.shadowAlpha, SEALED.shadowAlpha, mechT);
  const shOffY = lerp(OPEN.shadowOffY, SEALED.shadowOffY, mechT);
  const csDep = lerp(OPEN.caseShadowDepth, SEALED.caseShadowDepth, stoneT);
  const intVig = lerp(OPEN.interiorVignette, SEALED.interiorVignette, stoneT);
  const gapA = lerp(OPEN.gapBreachAlpha, SEALED.gapBreachAlpha, mechT);
  const cornDark = lerp(OPEN.cornerDark, SEALED.cornerDark, mechT);
  const envDark = lerp(0, 0.04, globalT);

  let stoneSM = 1.0;
  if (pp.phase === 'compression')
    stoneSM = 1.0 - 0.02 * easeOutQuad(pp.p2) * (1 - pp.p2);

  const ssA = lerp(OPEN.stoneSpecAlpha, SEALED.stoneSpecAlpha, stoneT);
  const ssR = lerp(OPEN.stoneSpecRadius, SEALED.stoneSpecRadius, stoneT);
  const ssE = lerp(OPEN.stoneEdge, SEALED.stoneEdge, stoneT);
  const ssV = lerp(OPEN.stoneVein, SEALED.stoneVein, stoneT);
  const ssTx = lerp(OPEN.stoneTexture, SEALED.stoneTexture, stoneT);
  const ssCon = lerp(OPEN.stoneContact, SEALED.stoneContact, stoneT);

  const stoneColors = {
    hl: lerpHex('#E8E0D0', '#F8F0DC', stoneT),
    mh: lerpHex('#DDD5C5', '#EFE6D0', stoneT),
    md: lerpHex('#CCC4B4', '#E5D8C0', stoneT),
    ml: lerpHex('#B8B0A0', '#D8CAB0', stoneT),
    lo: lerpHex('#A49C8E', '#C4B8A0', stoneT),
    sh: lerpHex('#8A887E', '#AEA090', stoneT),
    dp: lerpHex('#787870', '#938A7D', stoneT),
    eg: lerpHex('#707068', '#7D827E', stoneT),
  };

  const oy = pp.overshoot;
  const cx = CX;
  const cy = CY + oy;
  const mechCY = cy + 8;
  const caseX = cx - caseW / 2;
  const caseY = cy - caseH / 2;

  // ─── Background + env darken ──────────────────────────────────────
  ctx.fillStyle = rgb(PAL.bg);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  if (envDark > 0.002) {
    ctx.fillStyle = `rgba(0,0,0,${envDark})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // Ambient glow
  const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, CANVAS_W * 0.45);
  ag.addColorStop(0, rgba(PAL.honey, glow * 0.25));
  ag.addColorStop(1, rgba(PAL.sand, 0));
  ctx.fillStyle = ag;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ─── Shadow ───────────────────────────────────────────────────────
  ctx.save();
  ctx.filter = `blur(${shBlur}px)`;
  ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
  ctx.fillRect(caseX + 2, caseY + shOffY, caseW, caseH);
  ctx.restore();

  // ─── Case body ────────────────────────────────────────────────────
  ctx.save();
  makeCasePath(ctx, cx, cy);
  ctx.clip();
  const cg = ctx.createLinearGradient(caseX, caseY, caseX + caseW * 0.5, caseY + caseH);
  const m = mineralMetal;
  cg.addColorStop(0, rgb(m(w, 0.62)));
  cg.addColorStop(0.3, rgb(m(w, 0.54)));
  cg.addColorStop(0.6, rgb(m(w, 0.46)));
  cg.addColorStop(1, rgb(m(w, 0.38)));
  ctx.fillStyle = cg;
  ctx.fillRect(caseX, caseY, caseW, caseH);

  if (globalT < 0.5) {
    const ch = ctx.createLinearGradient(caseX, caseY, caseX, caseY + caseH * 0.5);
    ch.addColorStop(0, rgba(PAL.bg, caseHL));
    ch.addColorStop(1, rgba(PAL.bg, 0));
    ctx.fillStyle = ch;
    ctx.fillRect(caseX, caseY, caseW, caseH);
  } else {
    const ch = ctx.createRadialGradient(
      caseX + caseW * 0.22,
      caseY + caseH * 0.1,
      0,
      caseX + caseW * 0.22,
      caseY + caseH * 0.1,
      caseW * 0.4
    );
    ch.addColorStop(0, rgba(PAL.bg, caseHL));
    ch.addColorStop(0.3, rgba(PAL.bg, caseHL * 0.3));
    ch.addColorStop(1, rgba(PAL.bg, 0));
    ctx.fillStyle = ch;
    ctx.fillRect(caseX, caseY, caseW, caseH);
  }

  ctx.drawImage(state.hammerLayer, 0, oy);

  if (coolWash > 0.003) {
    const cw = ctx.createLinearGradient(caseX, caseY, caseX, caseY + caseH);
    cw.addColorStop(0, `rgba(105,112,125,${coolWash})`);
    cw.addColorStop(1, `rgba(80,85,95,${coolWash * 1.3})`);
    ctx.fillStyle = cw;
    ctx.fillRect(caseX, caseY, caseW, caseH);
  }
  ctx.restore();

  // Rim
  makeCasePath(ctx, cx, cy);
  ctx.strokeStyle = rgba(PAL.text3, rimA);
  ctx.lineWidth = rimW;
  ctx.stroke();

  // ─── Interior ─────────────────────────────────────────────────────
  const wellX = caseX + wellInset;
  const wellY2 = caseY + wellInset;
  const wellW = caseW - wellInset * 2;
  const wellH2 = caseH - wellInset * 2;
  const wellCR = caseCR - 6;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(wellX + wellCR, wellY2);
  ctx.lineTo(wellX + wellW - wellCR, wellY2);
  ctx.quadraticCurveTo(wellX + wellW, wellY2, wellX + wellW, wellY2 + wellCR);
  ctx.lineTo(wellX + wellW, wellY2 + wellH2 - wellCR);
  ctx.quadraticCurveTo(
    wellX + wellW,
    wellY2 + wellH2,
    wellX + wellW - wellCR,
    wellY2 + wellH2
  );
  ctx.lineTo(wellX + wellCR, wellY2 + wellH2);
  ctx.quadraticCurveTo(wellX, wellY2 + wellH2, wellX, wellY2 + wellH2 - wellCR);
  ctx.lineTo(wellX, wellY2 + wellCR);
  ctx.quadraticCurveTo(wellX, wellY2, wellX + wellCR, wellY2);
  ctx.closePath();
  ctx.clip();

  const intWarmCenter = mix(
    mix(PAL.sand, PAL.honey, globalT * 0.3),
    PAL.card,
    globalT * 0.4
  );
  const intWarmEdge = mix(
    PAL.sand,
    mix(PAL.mineralDk, PAL.sand, globalT * 0.5),
    0.3 + (1 - globalT) * 0.15
  );
  const vg = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, wellW * 0.65);
  vg.addColorStop(0, rgb(intWarmCenter));
  vg.addColorStop(0.5, rgb(mix(intWarmCenter, intWarmEdge, 0.35)));
  vg.addColorStop(1, rgb(intWarmEdge));
  ctx.fillStyle = vg;
  ctx.fillRect(wellX, wellY2, wellW, wellH2);

  const vsh = ctx.createRadialGradient(cx, mechCY, wellW * 0.08, cx, mechCY, wellW * 0.6);
  vsh.addColorStop(0, 'rgba(0,0,0,0)');
  vsh.addColorStop(0.7, `rgba(0,0,0,${csDep})`);
  vsh.addColorStop(1, `rgba(0,0,0,${csDep * 3})`);
  ctx.fillStyle = vsh;
  ctx.fillRect(wellX, wellY2, wellW, wellH2);

  if (intVig > 0.03) {
    const vig = ctx.createRadialGradient(
      cx,
      mechCY,
      wellW * 0.15,
      cx,
      mechCY,
      wellW * 0.55
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.6, `rgba(0,0,0,${intVig * 0.4})`);
    vig.addColorStop(1, `rgba(0,0,0,${intVig})`);
    ctx.fillStyle = vig;
    ctx.fillRect(wellX, wellY2, wellW, wellH2);
  }

  if (cornDark > 0.005) {
    (
      [
        [wellX + 12, wellY2 + 12],
        [wellX + wellW - 12, wellY2 + 12],
        [wellX + 12, wellY2 + wellH2 - 12],
        [wellX + wellW - 12, wellY2 + wellH2 - 12],
      ] as const
    ).forEach(([ccx, ccy]) => {
      const cg2 = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, 55);
      cg2.addColorStop(0, `rgba(0,0,0,${cornDark})`);
      cg2.addColorStop(0.6, `rgba(0,0,0,${cornDark * 0.4})`);
      cg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg2;
      ctx.fillRect(wellX, wellY2, wellW, wellH2);
    });
  }

  if (isOpen && !state.animating) {
    state.shimmerPhase += 0.015;
    const shimAmt = 0.012 * (0.5 + 0.5 * Math.sin(state.shimmerPhase));
    const shimG = ctx.createRadialGradient(
      cx + Math.sin(state.shimmerPhase * 0.7) * 8,
      mechCY + Math.cos(state.shimmerPhase * 0.5) * 5,
      0,
      cx,
      mechCY,
      wellW * 0.4
    );
    shimG.addColorStop(0, rgba(PAL.card, shimAmt));
    shimG.addColorStop(1, rgba(PAL.card, 0));
    ctx.fillStyle = shimG;
    ctx.fillRect(wellX, wellY2, wellW, wellH2);
  }

  if (globalT > 0.1) {
    const stLightA = globalT * 0.06;
    const stLight = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, wellW * 0.45);
    stLight.addColorStop(0, rgba(PAL.honey, stLightA));
    stLight.addColorStop(0.5, rgba(PAL.honey, stLightA * 0.3));
    stLight.addColorStop(1, rgba(PAL.honey, 0));
    ctx.fillStyle = stLight;
    ctx.fillRect(wellX, wellY2, wellW, wellH2);
  }

  ctx.drawImage(state.velvetLayer, 0, oy);
  ctx.restore();

  // ─── Mechanism ────────────────────────────────────────────────────
  const recG = ctx.createRadialGradient(
    cx,
    mechCY,
    mechR * 0.8,
    cx,
    mechCY,
    mechR + 10
  );
  recG.addColorStop(0, 'rgba(0,0,0,0)');
  recG.addColorStop(0.8, 'rgba(0,0,0,0.04)');
  recG.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = recG;
  ctx.beginPath();
  ctx.arc(cx, mechCY, mechR + 10, 0, Math.PI * 2);
  ctx.fill();

  const mR = mechR - 24 + (mechR - 30 - (mechR - 24)) * rc;
  const iR = mechR - 48 + (mechR - 56 - (mechR - 48)) * rc;

  drawRing(ctx, cx, mechCY, mechR - 5, mechR + 5, w, 'warm', hlSharp, globalT);
  drawRing(ctx, cx, mechCY, mR - 4, mR + 4, w * 0.85, 'cool', hlSharp, globalT);
  drawRing(ctx, cx, mechCY, iR - 3, iR + 3, w * 0.9, 'bronze', hlSharp, globalT);

  if (gapA > 0.003) {
    (
      [
        [mR + 4, mechR - 5],
        [iR + 3, mR - 4],
      ] as const
    ).forEach(([gi, go]) => {
      const gf = ctx.createRadialGradient(cx, mechCY, gi, cx, mechCY, go);
      gf.addColorStop(0, `rgba(100,105,115,${gapA})`);
      gf.addColorStop(0.5, `rgba(90,95,105,${gapA * 0.65})`);
      gf.addColorStop(1, `rgba(100,105,115,${gapA})`);
      ctx.fillStyle = gf;
      ctx.beginPath();
      ctx.arc(cx, mechCY, go, 0, Math.PI * 2);
      ctx.arc(cx, mechCY, gi, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
    });
  }

  // Spokes
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const sI = iR + 5;
    const sO = mechR - 7 - (1 - rc) * 7;
    ctx.save();
    ctx.translate(cx, mechCY);
    ctx.rotate(a);
    const sg = ctx.createLinearGradient(0, -sw / 2, 0, sw / 2);
    sg.addColorStop(0, rgba(m(w, 0.58), so * 0.8));
    sg.addColorStop(0.5, rgba(m(w, 0.46), so));
    sg.addColorStop(1, rgba(m(w, 0.38), so * 0.8));
    ctx.fillStyle = sg;
    ctx.fillRect(sI, -sw / 2, sO - sI, sw);
    if (globalT > 0.5) {
      ctx.fillStyle = rgba(PAL.bg, 0.06 * hlSharp * (globalT - 0.5) * 2);
      ctx.fillRect(sI + 2, -sw / 2, sO - sI - 4, 0.6);
    }
    const capR = 2.8 + rc * 2.2;
    const bg2 = ctx.createRadialGradient(sO - 0.5, -0.5, 0, sO, 0, capR);
    bg2.addColorStop(0, rgb(m(w, 0.66)));
    bg2.addColorStop(1, rgb(m(w, 0.38)));
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.arc(sO, 0, capR, 0, Math.PI * 2);
    ctx.fill();
    if (globalT > 0.8) {
      ctx.strokeStyle = rgba(PAL.mineralDk, 0.12 * (globalT - 0.8) * 5);
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.arc(sO, 0, capR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Center floor
  const fl = mix(PAL.sand, PAL.text3, intDark);
  const fd = mix(PAL.sand, PAL.mineralDk, intDark + 0.2);
  const dcg = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, iR - 5);
  dcg.addColorStop(0, rgb(fl));
  dcg.addColorStop(0.5, rgb(mix(fl, fd, 0.4)));
  dcg.addColorStop(1, rgb(fd));
  ctx.fillStyle = dcg;
  ctx.beginPath();
  ctx.arc(cx, mechCY, iR - 4, 0, Math.PI * 2);
  ctx.fill();

  if (mechT < 1) {
    const va = 1 - mechT;
    const ov = ctx.createRadialGradient(cx, mechCY, (iR - 5) * 0.3, cx, mechCY, iR - 5);
    ov.addColorStop(0, `rgba(0,0,0,${0.02 * va})`);
    ov.addColorStop(0.5, `rgba(0,0,0,${0.06 * va})`);
    ov.addColorStop(1, `rgba(0,0,0,${0.12 * va})`);
    ctx.fillStyle = ov;
    ctx.beginPath();
    ctx.arc(cx, mechCY, iR - 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const dsh = ctx.createRadialGradient(cx, mechCY, (iR - 5) * 0.4, cx, mechCY, iR - 5);
  dsh.addColorStop(0, 'rgba(0,0,0,0)');
  dsh.addColorStop(0.7, `rgba(0,0,0,${csDep})`);
  dsh.addColorStop(1, `rgba(0,0,0,${csDep * 2.5})`);
  ctx.fillStyle = dsh;
  ctx.beginPath();
  ctx.arc(cx, mechCY, iR - 4, 0, Math.PI * 2);
  ctx.fill();

  // ─── Breath stone ─────────────────────────────────────────────────
  const r = stoneR * stoneSM;
  const glowExtent = r * lerp(1.8, 2.8, stoneT);
  const gg = ctx.createRadialGradient(cx, mechCY, r * 0.3, cx, mechCY, glowExtent);
  gg.addColorStop(0, rgba(PAL.honey, stoneGlow * 0.3));
  gg.addColorStop(0.25, rgba(PAL.honey, stoneGlow * 0.15));
  gg.addColorStop(0.5, rgba(PAL.sand, stoneGlow * 0.06));
  gg.addColorStop(1, rgba(PAL.sand, 0));
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.arc(cx, mechCY, glowExtent, 0, Math.PI * 2);
  ctx.fill();

  if (stoneGlow > 0.02) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const nv = noise.get(
        Math.cos(angle) * 1.8 + 0.3,
        Math.sin(angle) * 1.8 + 0.3
      );
      const dist = glowExtent * (0.45 + nv * 0.25);
      const spotR = glowExtent * (0.08 + Math.abs(nv) * 0.07);
      const spotA = stoneGlow * (0.08 + nv * 0.06);
      if (spotA > 0.003) {
        const spg = ctx.createRadialGradient(
          cx + Math.cos(angle) * dist,
          mechCY + Math.sin(angle) * dist,
          0,
          cx + Math.cos(angle) * dist,
          mechCY + Math.sin(angle) * dist,
          spotR
        );
        spg.addColorStop(0, rgba(PAL.honey, spotA));
        spg.addColorStop(1, rgba(PAL.honey, 0));
        ctx.fillStyle = spg;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(angle) * dist,
          mechCY + Math.sin(angle) * dist,
          spotR,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // Stone outline + traces
  const pts = state.stoneOutline.map((p) => ({
    x: cx + p.cos * r,
    y: mechCY + p.sin * r,
  }));
  const trace = () => {
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  };

  // Contact shadow
  ctx.save();
  ctx.translate(0, r * 0.08);
  const cs = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, r * 0.75);
  cs.addColorStop(0, `rgba(28,26,24,${ssCon})`);
  cs.addColorStop(1, 'rgba(28,26,24,0)');
  ctx.fillStyle = cs;
  ctx.beginPath();
  ctx.arc(cx, mechCY, r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  const SC = stoneColors;
  const bd = ctx.createRadialGradient(
    cx - r * 0.28,
    mechCY - r * 0.28,
    0,
    cx,
    mechCY,
    r * 1.3
  );
  bd.addColorStop(0, SC.hl);
  bd.addColorStop(0.12, SC.mh);
  bd.addColorStop(0.28, SC.md);
  bd.addColorStop(0.48, SC.ml);
  bd.addColorStop(0.65, SC.lo);
  bd.addColorStop(0.8, SC.sh);
  bd.addColorStop(0.92, SC.dp);
  bd.addColorStop(1, SC.eg);
  ctx.fillStyle = bd;
  trace();
  ctx.fill();

  // Interior shadow
  const ish = ctx.createRadialGradient(cx + r * 0.3, mechCY + r * 0.3, 0, cx, mechCY, r);
  ish.addColorStop(0, 'rgba(28,26,24,0.16)');
  ish.addColorStop(0.5, 'rgba(28,26,24,0.04)');
  ish.addColorStop(1, 'rgba(28,26,24,0)');
  ctx.fillStyle = ish;
  trace();
  ctx.fill();

  // Specular
  ctx.save();
  ctx.scale(1, 0.6);
  const hlG = ctx.createRadialGradient(
    cx - r * 0.3,
    (mechCY - r * 0.45) / 0.6,
    0,
    cx - r * 0.3,
    (mechCY - r * 0.45) / 0.6,
    r * ssR
  );
  hlG.addColorStop(0, `rgba(251,248,244,${ssA})`);
  hlG.addColorStop(0.5, `rgba(251,248,244,${ssA * 0.35})`);
  hlG.addColorStop(1, 'rgba(251,248,244,0)');
  ctx.fillStyle = hlG;
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, (mechCY - r * 0.45) / 0.6, r * ssR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Veins
  ctx.globalAlpha = ssV;
  ctx.fillStyle = rgba(PAL.mineralDk, 0.4);
  state.veinData.forEach((v) => {
    ctx.beginPath();
    ctx.ellipse(
      cx + Math.cos(v.va) * r * v.vd,
      mechCY + Math.sin(v.va) * r * v.vd,
      r * v.vs,
      r * v.vs * v.vAspect,
      v.va,
      0,
      Math.PI * 2
    );
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Texture — composite static layer
  ctx.globalAlpha = ssTx;
  ctx.drawImage(state.stoneTexLayer, 0, oy);
  ctx.globalAlpha = 1;

  // Edge
  ctx.strokeStyle = rgba(PAL.text3, ssE);
  ctx.lineWidth = 0.5;
  trace();
  ctx.stroke();

  // ─── Post-stone effects ───────────────────────────────────────────
  if (globalT > 0.2) {
    const gs = glow * 0.1 * Math.min(1, (globalT - 0.2) / 0.8);
    (
      [
        [mR + 4, mechR - 5],
        [iR + 3, mR - 4],
      ] as const
    ).forEach(([a2, b2]) => {
      const g = ctx.createRadialGradient(cx, mechCY, a2, cx, mechCY, b2);
      g.addColorStop(0, rgba(PAL.honey, gs));
      g.addColorStop(0.5, rgba(PAL.honey, gs * 0.5));
      g.addColorStop(1, rgba(PAL.honey, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, mechCY, b2, 0, Math.PI * 2);
      ctx.arc(cx, mechCY, a2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
    });
  }

  if (auraOp > 0.004) {
    ctx.strokeStyle = rgba(PAL.honey, auraOp);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, mechCY, mechR + auraR, 0, Math.PI * 2);
    ctx.stroke();
  }
}
