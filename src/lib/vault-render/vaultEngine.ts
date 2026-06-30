// ===========================================================================
// Voice Vault — parameterized Canvas 2D render engine (Step 3 bronze/ember).
//
// Distilled from the design rig `prototypes/vault-canvas-rig.html` (one engine,
// deduped from the 3× showcase). Geometry & lighting are unchanged from the rig;
// the one production divergence is DC1 (Vault_Canvas_Swap_Plan.md §3): the rig's
// single `t` warmth-ramp is split into two drive axes so the seal's two-beat
// grammar (Motion Spec §3) can be rendered:
//
//   • mechT  — the MECHANISM: iris/ring contraction, spoke draw-in, ring gaps.
//              Reads cool on its own (no warmth coupled to it).
//   • emberT — the WARMTH: metal blend, glow/halo, lit core, ember body, the
//              interior warm tint, highlights, shadows-settling.
//
// IRIS CLOSE drives mechT 0→1 with emberT held at 0 (case shuts, ember stays
// cool); EMBER CATCH then drives emberT 0→1 (the pilot light catches). Passing a
// scalar drives both axes together — byte-for-byte the rig's original behavior.
//
// Renders with a TRANSPARENT background so it composites onto the oat surface.
// initVaultEngine() touches the DOM (offscreen canvases) — call it client-side
// only, and once (getVaultEngine() memoizes a shared instance).
// ===========================================================================

import type { RGB, VaultPalette } from './palette';

// The seal can drive the mechanism and the ember on separate clocks (DC1), or
// pass a single scalar to move them together (the rig's coupled behavior).
export type VaultDrive = number | { mechT: number; emberT: number };

export interface VaultEngine {
  drawVault: (
    tctx: CanvasRenderingContext2D,
    dcx: number,
    dcy: number,
    size: number,
    drive: VaultDrive,
    pal: VaultPalette,
  ) => void;
  readonly W: number;
  readonly H: number;
}

// Normalize a drive into its two axes. Exported for unit testing the contract
// (a scalar maps to equal axes; an object passes through).
export function resolveDrive(drive: VaultDrive): { mechT: number; emberT: number } {
  if (typeof drive === 'number') return { mechT: drive, emberT: drive };
  return { mechT: drive.mechT, emberT: drive.emberT };
}

export function initVaultEngine(): VaultEngine {
  // -------- utilities ----------------------------------------------------
  function seededRandom(seed: number) {
    let s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }
  class PerlinNoise {
    g: Record<string, { x: number; y: number }> = {};
    m: Record<string, number> = {};
    rv() {
      const t = Math.random() * Math.PI * 2;
      return { x: Math.cos(t), y: Math.sin(t) };
    }
    dp(x: number, y: number, vx: number, vy: number) {
      const k = `${vx},${vy}`;
      if (!this.g[k]) this.g[k] = this.rv();
      return (x - vx) * this.g[k].x + (y - vy) * this.g[k].y;
    }
    sm(x: number) {
      return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
    }
    lr(x: number, a: number, b: number) {
      return a + this.sm(x) * (b - a);
    }
    get(x: number, y: number): number {
      const k = `${x},${y}`;
      if (this.m[k]) return this.m[k];
      const xf = Math.floor(x),
        yf = Math.floor(y);
      const v = this.lr(
        y - yf,
        this.lr(x - xf, this.dp(x, y, xf, yf), this.dp(x, y, xf + 1, yf)),
        this.lr(x - xf, this.dp(x, y, xf, yf + 1), this.dp(x, y, xf + 1, yf + 1)),
      );
      this.m[k] = v;
      return v;
    }
  }
  const noise = new PerlinNoise();

  function mix(a: RGB | number[], b: RGB | number[], t: number): number[] {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }
  function rgb(c: number[]) {
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }
  function rgba(c: number[] | RGB, a: number) {
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }
  function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }
  function hexRGB(h: string): number[] {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function lerpHex(h1: string, h2: string, t: number) {
    const a = hexRGB(h1),
      b = hexRGB(h2);
    return (
      '#' +
      mix(a, b, t)
        .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
        .join('')
    );
  }

  // neutral texture inks (subtle, palette-independent)
  const TX_LIGHT = [245, 240, 234],
    TX_DARK = [101, 107, 115],
    TX_INK = [28, 26, 24];

  // parametric case metal: cool→warm by warmth, dark→light by lightness
  function metal(pal: VaultPalette, warmth: number, lightness: number) {
    const base = mix(pal.metalCool, pal.metalWarm, warmth * pal.warmFactor);
    return lightness >= 0.5
      ? mix(base, pal.metalLight, (lightness - 0.5) * 2)
      : mix(pal.metalDark, base, lightness * 2);
  }

  // -------- geometry -----------------------------------------------------
  const W = 600,
    H = 600,
    CX = 300,
    CY = 300;
  const caseW = 300,
    caseH = 340,
    caseCR = 30,
    mechR = 105,
    wellInset = 22;
  const C = document.createElement('canvas');
  C.width = W;
  C.height = H;

  function makeCasePath(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const x = cx - caseW / 2,
      y = cy - caseH / 2;
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

  // -------- offscreen static texture layers (rendered once) --------------
  const hammerLayer = document.createElement('canvas');
  hammerLayer.width = W;
  hammerLayer.height = H;
  (function () {
    const ctx = hammerLayer.getContext('2d')!;
    const caseX = CX - caseW / 2,
      caseY = CY - caseH / 2;
    const r = seededRandom(264);
    for (let i = 0; i < 50; i++) {
      const dx = caseX + r() * caseW,
        dy = caseY + r() * caseH,
        dr = 5 + r() * 14;
      const dg = ctx.createRadialGradient(dx - dr * 0.2, dy - dr * 0.2, 0, dx, dy, dr);
      dg.addColorStop(0, rgba(TX_LIGHT, 0.04 + r() * 0.04));
      dg.addColorStop(0.5, rgba(TX_LIGHT, 0));
      dg.addColorStop(1, rgba(TX_DARK, 0.02 + r() * 0.025));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    }
  })();

  const velvetLayer = document.createElement('canvas');
  velvetLayer.width = W;
  velvetLayer.height = H;
  (function () {
    const ctx = velvetLayer.getContext('2d')!;
    const wellX = CX - caseW / 2 + wellInset,
      wellY = CY - caseH / 2 + wellInset,
      wellW = caseW - wellInset * 2,
      wellH = caseH - wellInset * 2;
    const vr = seededRandom(311);
    for (let i = 0; i < 250; i++) {
      const px = wellX + vr() * wellW,
        py = wellY + vr() * wellH;
      ctx.fillStyle = vr() > 0.5 ? rgba(TX_LIGHT, 0.02 + vr() * 0.02) : rgba(TX_DARK, 0.01 + vr() * 0.015);
      ctx.fillRect(px, py, 0.4 + vr() * 0.8, 0.8 + vr() * 2);
    }
  })();

  const stoneTexLayer = document.createElement('canvas');
  stoneTexLayer.width = W;
  stoneTexLayer.height = H;
  (function () {
    const ctx = stoneTexLayer.getContext('2d')!;
    const mechCY = CY + 8;
    const r = 40;
    const tR = seededRandom(7777);
    for (let i = 0; i < 160; i++) {
      const a = tR() * Math.PI * 2,
        d = tR() * r * 0.9;
      ctx.fillStyle = tR() > 0.5 ? rgba(TX_INK, 0.4) : rgba([251, 248, 244], 0.5);
      ctx.fillRect(CX + Math.cos(a) * d, mechCY + Math.sin(a) * d, tR() < 0.8 ? 1 : 1.4, tR() < 0.8 ? 1 : 1.4);
    }
  })();

  // Case drop-shadow, blurred ONCE here (PERF): a per-frame ctx.filter='blur()'
  // over the whole case rect is the single most expensive op in the scene and
  // blows the 4× CPU frame budget on the iris-close. Baked at alpha 1 and a base
  // y-offset (SHADOW_OFFY); drawVault composites it with globalAlpha = shAlpha
  // and a small dy so the shadow's fade + lift still animate, at blit cost.
  const SHADOW_OFFY = 6;
  const SHADOW_BLUR = 20; // representative of the 24→14 range; baked, not animated
  const shadowLayer = document.createElement('canvas');
  shadowLayer.width = W;
  shadowLayer.height = H;
  (function () {
    const ctx = shadowLayer.getContext('2d')!;
    ctx.filter = `blur(${SHADOW_BLUR}px)`;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(CX - caseW / 2 + 2, CY - caseH / 2 + SHADOW_OFFY, caseW, caseH);
  })();

  const stoneOutline: { cos: number; sin: number }[] = [];
  for (let i = 0; i < 54; i++) {
    const a = (i / 54) * Math.PI * 2;
    const n = noise.get(Math.cos(a) * 0.2 + CX * 0.001, Math.sin(a) * 0.2 + (CY + 8) * 0.001);
    stoneOutline.push({ cos: Math.cos(a) * (1 + n * 0.045), sin: Math.sin(a) * (1 + n * 0.045) });
  }
  const veinData: { va: number; vd: number; vs: number; vAspect: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const va = (i / 6) * Math.PI * 2 + noise.get(i * 0.6, CX * 0.01) * 2;
    const vd = 0.25 + noise.get(i, 1) * 0.35;
    const vs = 0.1 + noise.get(i, 3) * 0.08;
    const vAspect = 0.5 + noise.get(i, 4) * 0.4;
    veinData.push({ va, vd, vs, vAspect });
  }

  // -------- ring renderer ------------------------------------------------
  function drawRing(
    ctx: CanvasRenderingContext2D,
    pal: VaultPalette,
    cx: number,
    cy: number,
    iR: number,
    oR: number,
    type: 'warm' | 'cool' | 'bronze',
    hlSharp: number,
    warmT: number,
  ) {
    // Soft contact shadow under the ring. A radial gradient feathers the edge
    // instead of a ctx.filter blur (PERF — no per-frame filter pass).
    const shR = (iR + oR) / 2;
    const rsh = ctx.createRadialGradient(cx + 1, cy + 1.5, shR * 0.7, cx + 1, cy + 1.5, shR + 4);
    rsh.addColorStop(0, 'rgba(0,0,0,0.04)');
    rsh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rsh;
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 1.5, shR + 4, 0, Math.PI * 2);
    ctx.fill();
    const ww = type === 'warm' ? warmT : type === 'cool' ? warmT * 0.3 : warmT * 0.7;
    const rg = ctx.createRadialGradient(cx - oR * 0.08, cy - oR * 0.08, iR, cx, cy, oR);
    rg.addColorStop(0, rgb(metal(pal, ww, type === 'warm' ? 0.72 : 0.7)));
    rg.addColorStop(0.4, rgb(metal(pal, ww, type === 'warm' ? 0.58 : type === 'cool' ? 0.55 : 0.54)));
    rg.addColorStop(1, rgb(metal(pal, ww, type === 'warm' ? 0.42 : type === 'cool' ? 0.4 : 0.38)));
    ctx.beginPath();
    ctx.arc(cx, cy, oR, 0, Math.PI * 2);
    ctx.arc(cx, cy, iR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, oR, 0, Math.PI * 2);
    ctx.arc(cx, cy, iR, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    const hlEnd = cy - oR * lerp(0.25, 0.15, warmT);
    const hlA = (type === 'cool' ? 0.22 : 0.16) * Math.max(0.35, warmT) * hlSharp;
    const hl = ctx.createLinearGradient(cx, cy - oR, cx, hlEnd);
    hl.addColorStop(0, rgba([251, 248, 244], hlA));
    hl.addColorStop(1, rgba([251, 248, 244], 0));
    ctx.fillStyle = hl;
    ctx.fillRect(cx - oR, cy - oR, oR * 2, oR);
    const sh = ctx.createLinearGradient(cx, cy + oR * 0.25, cx, cy + oR);
    sh.addColorStop(0, 'rgba(0,0,0,0)');
    sh.addColorStop(1, `rgba(0,0,0,${0.06 * Math.max(0.4, warmT)})`);
    ctx.fillStyle = sh;
    ctx.fillRect(cx - oR, cy, oR * 2, oR);
    ctx.restore();
    ctx.strokeStyle = rgba([251, 248, 244], 0.08 * Math.max(0.4, warmT));
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, oR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba(TX_DARK, 0.06 * Math.max(0.4, warmT));
    ctx.beginPath();
    ctx.arc(cx, cy, iR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // -------- main: render vault into target context -----------------------
  // mechT = mechanism progress (0 open → 1 shut), emberT = warmth (0 cool → 1 lit).
  function drawVault(
    tctx: CanvasRenderingContext2D,
    dcx: number,
    dcy: number,
    size: number,
    drive: VaultDrive,
    pal: VaultPalette,
  ) {
    const { mechT: m, emberT: e } = resolveDrive(drive);
    const ctx = C.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    // emberT axis — warmth, glow, lighting
    const w = e; // warmth axis drives metal blend
    const glow = lerp(0.03, pal.glowStrength, e);
    const stoneGlow = lerp(0.02, pal.glowStrength, e);
    const stoneR = lerp(30, 40, e);
    const intDark = lerp(0.42, 0.08, e),
      caseHL = lerp(0.04, 0.22, e),
      coolWash = lerp(pal.coolWashMax ?? 0.06, 0.0, e);
    const rimA = lerp(0.14, 0.38, e),
      rimW = lerp(2.2, 2.8, e),
      auraOp = lerp(0, 0.09, e),
      auraR = lerp(0, 7, e);
    const shAlpha = lerp(0.14, 0.07, e),
      shOffY = lerp(6, 4, e);
    const csDep = lerp(0.09, 0.02, e),
      intVig = lerp(0.12, 0.04, e),
      cornDark = lerp(0.07, 0, e);
    const hlSharp = lerp(0.6, 1.0, e);
    const ssA = lerp(0.25, 0.5, e),
      ssR = lerp(0.22, 0.3, e),
      ssE = lerp(0.08, 0.12, e),
      ssV = lerp(0.04, 0.06, e),
      ssTx = lerp(0.012, 0.018, e),
      ssCon = lerp(0.12, 0.08, e);

    // mechT axis — geometry, mechanism closure
    const rc = m,
      sw = lerp(1.8, 6.5, m),
      so = lerp(0.18, 0.65, m);
    const gapA = lerp(0.06, 0, m);

    const cx = CX,
      cy = CY,
      mechCY = cy + 8,
      caseX = cx - caseW / 2,
      caseY = cy - caseH / 2;
    const G = pal.glowRGB;

    // ambient glow (on transparent → reads on oat)
    const ag = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45);
    ag.addColorStop(0, rgba(G, glow * 0.22));
    ag.addColorStop(1, rgba(G, 0));
    ctx.fillStyle = ag;
    ctx.fillRect(0, 0, W, H);

    // shadow — pre-blurred layer, composited with the animated alpha + lift
    ctx.save();
    ctx.globalAlpha = shAlpha;
    ctx.drawImage(shadowLayer, 0, shOffY - SHADOW_OFFY);
    ctx.restore();

    // case body
    ctx.save();
    makeCasePath(ctx, cx, cy);
    ctx.clip();
    const cg = ctx.createLinearGradient(caseX, caseY, caseX + caseW * 0.5, caseY + caseH);
    cg.addColorStop(0, rgb(metal(pal, w, 0.62)));
    cg.addColorStop(0.3, rgb(metal(pal, w, 0.54)));
    cg.addColorStop(0.6, rgb(metal(pal, w, 0.46)));
    cg.addColorStop(1, rgb(metal(pal, w, 0.38)));
    ctx.fillStyle = cg;
    ctx.fillRect(caseX, caseY, caseW, caseH);
    if (e < 0.5) {
      const ch = ctx.createLinearGradient(caseX, caseY, caseX, caseY + caseH * 0.5);
      ch.addColorStop(0, rgba([251, 248, 244], caseHL));
      ch.addColorStop(1, rgba([251, 248, 244], 0));
      ctx.fillStyle = ch;
      ctx.fillRect(caseX, caseY, caseW, caseH);
    } else {
      const ch = ctx.createRadialGradient(
        caseX + caseW * 0.22,
        caseY + caseH * 0.1,
        0,
        caseX + caseW * 0.22,
        caseY + caseH * 0.1,
        caseW * 0.4,
      );
      ch.addColorStop(0, rgba([251, 248, 244], caseHL));
      ch.addColorStop(0.3, rgba([251, 248, 244], caseHL * 0.3));
      ch.addColorStop(1, rgba([251, 248, 244], 0));
      ctx.fillStyle = ch;
      ctx.fillRect(caseX, caseY, caseW, caseH);
    }
    ctx.drawImage(hammerLayer, 0, 0);
    if (coolWash > 0.003) {
      const cw = ctx.createLinearGradient(caseX, caseY, caseX, caseY + caseH);
      cw.addColorStop(0, `rgba(105,112,125,${coolWash})`);
      cw.addColorStop(1, `rgba(80,85,95,${coolWash * 1.3})`);
      ctx.fillStyle = cw;
      ctx.fillRect(caseX, caseY, caseW, caseH);
    }
    ctx.restore();
    // rim
    makeCasePath(ctx, cx, cy);
    ctx.strokeStyle = rgba(TX_DARK, rimA);
    ctx.lineWidth = rimW;
    ctx.stroke();

    // interior well
    const wellX = caseX + wellInset,
      wellY2 = caseY + wellInset,
      wellW = caseW - wellInset * 2,
      wellH2 = caseH - wellInset * 2,
      wellCR = caseCR - 6;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wellX + wellCR, wellY2);
    ctx.lineTo(wellX + wellW - wellCR, wellY2);
    ctx.quadraticCurveTo(wellX + wellW, wellY2, wellX + wellW, wellY2 + wellCR);
    ctx.lineTo(wellX + wellW, wellY2 + wellH2 - wellCR);
    ctx.quadraticCurveTo(wellX + wellW, wellY2 + wellH2, wellX + wellW - wellCR, wellY2 + wellH2);
    ctx.lineTo(wellX + wellCR, wellY2 + wellH2);
    ctx.quadraticCurveTo(wellX, wellY2 + wellH2, wellX, wellY2 + wellH2 - wellCR);
    ctx.lineTo(wellX, wellY2 + wellCR);
    ctx.quadraticCurveTo(wellX, wellY2, wellX + wellCR, wellY2);
    ctx.closePath();
    ctx.clip();

    const intCenter = mix(pal.interiorCoolCenter, pal.interiorWarmTint, e * 0.45);
    const intEdge = mix(pal.interiorCoolEdge, mix(pal.interiorCoolEdge, pal.interiorWarmTint, 0.35), e);
    const vg = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, wellW * 0.65);
    vg.addColorStop(0, rgb(intCenter));
    vg.addColorStop(0.5, rgb(mix(intCenter, intEdge, 0.4)));
    vg.addColorStop(1, rgb(intEdge));
    ctx.fillStyle = vg;
    ctx.fillRect(wellX, wellY2, wellW, wellH2);

    const vsh = ctx.createRadialGradient(cx, mechCY, wellW * 0.08, cx, mechCY, wellW * 0.6);
    vsh.addColorStop(0, 'rgba(0,0,0,0)');
    vsh.addColorStop(0.7, `rgba(0,0,0,${csDep})`);
    vsh.addColorStop(1, `rgba(0,0,0,${csDep * 3})`);
    ctx.fillStyle = vsh;
    ctx.fillRect(wellX, wellY2, wellW, wellH2);
    if (intVig > 0.03) {
      const vig = ctx.createRadialGradient(cx, mechCY, wellW * 0.15, cx, mechCY, wellW * 0.55);
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
    // ember casts warm light onto interior (only when igniting)
    if (e > 0.1) {
      const stLightA = e * 0.06;
      const stLight = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, wellW * 0.45);
      stLight.addColorStop(0, rgba(G, stLightA));
      stLight.addColorStop(0.5, rgba(G, stLightA * 0.3));
      stLight.addColorStop(1, rgba(G, 0));
      ctx.fillStyle = stLight;
      ctx.fillRect(wellX, wellY2, wellW, wellH2);
    }
    ctx.drawImage(velvetLayer, 0, 0);
    ctx.restore();

    // mechanism
    const recG = ctx.createRadialGradient(cx, mechCY, mechR * 0.8, cx, mechCY, mechR + 10);
    recG.addColorStop(0, 'rgba(0,0,0,0)');
    recG.addColorStop(0.8, 'rgba(0,0,0,0.04)');
    recG.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = recG;
    ctx.beginPath();
    ctx.arc(cx, mechCY, mechR + 10, 0, Math.PI * 2);
    ctx.fill();

    const mR = mechR - 24 + (mechR - 30 - (mechR - 24)) * rc;
    const iR = mechR - 48 + (mechR - 56 - (mechR - 48)) * rc;
    drawRing(ctx, pal, cx, mechCY, mechR - 5, mechR + 5, 'warm', hlSharp, w);
    drawRing(ctx, pal, cx, mechCY, mR - 4, mR + 4, 'cool', hlSharp, w * 0.85);
    drawRing(ctx, pal, cx, mechCY, iR - 3, iR + 3, 'bronze', hlSharp, w * 0.9);

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

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const sI = iR + 5,
        sO = mechR - 7 - (1 - rc) * 7;
      ctx.save();
      ctx.translate(cx, mechCY);
      ctx.rotate(a);
      const sg = ctx.createLinearGradient(0, -sw / 2, 0, sw / 2);
      sg.addColorStop(0, rgba(metal(pal, w, 0.58), so * 0.8));
      sg.addColorStop(0.5, rgba(metal(pal, w, 0.46), so));
      sg.addColorStop(1, rgba(metal(pal, w, 0.38), so * 0.8));
      ctx.fillStyle = sg;
      ctx.fillRect(sI, -sw / 2, sO - sI, sw);
      if (e > 0.5) {
        ctx.fillStyle = rgba([251, 248, 244], 0.06 * hlSharp * (e - 0.5) * 2);
        ctx.fillRect(sI + 2, -sw / 2, sO - sI - 4, 0.6);
      }
      const capR = 2.8 + rc * 2.2;
      const bg2 = ctx.createRadialGradient(sO - 0.5, -0.5, 0, sO, 0, capR);
      bg2.addColorStop(0, rgb(metal(pal, w, 0.66)));
      bg2.addColorStop(1, rgb(metal(pal, w, 0.38)));
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.arc(sO, 0, capR, 0, Math.PI * 2);
      ctx.fill();
      if (e > 0.8) {
        ctx.strokeStyle = rgba(TX_DARK, 0.12 * (e - 0.8) * 5);
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.arc(sO, 0, capR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // center floor
    const fl = mix(pal.interiorCoolCenter, [173, 169, 165], intDark),
      fd = mix(pal.interiorCoolCenter, TX_DARK, intDark + 0.2);
    const dcg = ctx.createRadialGradient(cx, mechCY, 0, cx, mechCY, iR - 5);
    dcg.addColorStop(0, rgb(fl));
    dcg.addColorStop(0.5, rgb(mix(fl, fd, 0.4)));
    dcg.addColorStop(1, rgb(fd));
    ctx.fillStyle = dcg;
    ctx.beginPath();
    ctx.arc(cx, mechCY, iR - 4, 0, Math.PI * 2);
    ctx.fill();
    if (rc < 1) {
      const va = 1 - rc;
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

    // ===== ember boss (stone) =====
    const r = stoneR;
    const Hh = pal.emberHalo; // [[r,g,b]..] 3 stops
    const glowExtent = r * lerp(1.8, pal.haloExtent, e);
    const gg = ctx.createRadialGradient(cx, mechCY, r * 0.3, cx, mechCY, glowExtent);
    gg.addColorStop(0, rgba(Hh[0], stoneGlow * 0.9));
    gg.addColorStop(0.32, rgba(Hh[1], stoneGlow * 0.45));
    gg.addColorStop(0.62, rgba(Hh[2], stoneGlow * 0.15));
    gg.addColorStop(1, rgba(Hh[2], 0));
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(cx, mechCY, glowExtent, 0, Math.PI * 2);
    ctx.fill();
    if (stoneGlow > 0.04) {
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const nv = noise.get(Math.cos(angle) * 1.8 + 0.3, Math.sin(angle) * 1.8 + 0.3);
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
            spotR,
          );
          spg.addColorStop(0, rgba(Hh[1], spotA));
          spg.addColorStop(1, rgba(Hh[1], 0));
          ctx.fillStyle = spg;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * dist, mechCY + Math.sin(angle) * dist, spotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const pts = stoneOutline.map((p) => ({ x: cx + p.cos * r, y: mechCY + p.sin * r }));
    function trace() {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
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

    const eb = pal.emberCoolBody,
      ew = pal.emberWarmBody;
    const SC = {
      hl: lerpHex(eb[0], ew[0], e),
      mh: lerpHex(eb[1], ew[1], e),
      md: lerpHex(eb[2], ew[2], e),
      ml: lerpHex(eb[3], ew[3], e),
      lo: lerpHex(eb[4], ew[4], e),
      sh: lerpHex(eb[5], ew[5], e),
      dp: lerpHex(eb[6], ew[6], e),
      eg: lerpHex(eb[7], ew[7], e),
    };
    const bd = ctx.createRadialGradient(cx - r * 0.28, mechCY - r * 0.28, 0, cx, mechCY, r * 1.3);
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
    const ish = ctx.createRadialGradient(cx + r * 0.3, mechCY + r * 0.3, 0, cx, mechCY, r);
    ish.addColorStop(0, 'rgba(28,26,24,0.16)');
    ish.addColorStop(0.5, 'rgba(28,26,24,0.04)');
    ish.addColorStop(1, 'rgba(28,26,24,0)');
    ctx.fillStyle = ish;
    trace();
    ctx.fill();

    // lit core — small solid lit center on the sealed boss
    if (e > 0.08) {
      const lc = hexRGB(pal.litCore);
      const coreA = Math.min(1, (e - 0.08) / 0.92);
      const cR = r * 0.46;
      const cgc = ctx.createRadialGradient(cx - cR * 0.18, mechCY - cR * 0.18, 0, cx, mechCY, cR);
      cgc.addColorStop(0, rgba(lc, 0.92 * coreA));
      cgc.addColorStop(0.45, rgba(lc, 0.5 * coreA));
      cgc.addColorStop(1, rgba(lc, 0));
      ctx.fillStyle = cgc;
      ctx.beginPath();
      ctx.arc(cx, mechCY, cR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.scale(1, 0.6);
    const hlG = ctx.createRadialGradient(
      cx - r * 0.3,
      (mechCY - r * 0.45) / 0.6,
      0,
      cx - r * 0.3,
      (mechCY - r * 0.45) / 0.6,
      r * ssR,
    );
    hlG.addColorStop(0, `rgba(251,248,244,${ssA})`);
    hlG.addColorStop(0.5, `rgba(251,248,244,${ssA * 0.35})`);
    hlG.addColorStop(1, 'rgba(251,248,244,0)');
    ctx.fillStyle = hlG;
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, (mechCY - r * 0.45) / 0.6, r * ssR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = ssV;
    ctx.fillStyle = rgba(TX_DARK, 0.4);
    veinData.forEach((v) => {
      ctx.beginPath();
      ctx.ellipse(
        cx + Math.cos(v.va) * r * v.vd,
        mechCY + Math.sin(v.va) * r * v.vd,
        r * v.vs,
        r * v.vs * v.vAspect,
        v.va,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.globalAlpha = ssTx;
    ctx.drawImage(stoneTexLayer, 0, 0);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba([173, 169, 165], ssE);
    ctx.lineWidth = 0.5;
    trace();
    ctx.stroke();

    // inter-ring glow + aura
    if (e > 0.2) {
      const gs = glow * 0.1 * Math.min(1, (e - 0.2) / 0.8);
      (
        [
          [mR + 4, mechR - 5],
          [iR + 3, mR - 4],
        ] as const
      ).forEach(([a2, b2]) => {
        const g = ctx.createRadialGradient(cx, mechCY, a2, cx, mechCY, b2);
        g.addColorStop(0, rgba(G, gs));
        g.addColorStop(0.5, rgba(G, gs * 0.5));
        g.addColorStop(1, rgba(G, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, mechCY, b2, 0, Math.PI * 2);
        ctx.arc(cx, mechCY, a2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
      });
    }
    if (auraOp > 0.004) {
      ctx.strokeStyle = rgba(G, auraOp);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(cx, mechCY, mechR + auraR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // composite onto target
    tctx.drawImage(C, dcx - size / 2, dcy - size / 2, size, size);
  }

  return { drawVault, W, H };
}

// Shared singleton — the offscreen static texture layers are built once and
// reused across every VaultObject instance. Client-only (touches the DOM).
let shared: VaultEngine | null = null;
export function getVaultEngine(): VaultEngine {
  if (!shared) shared = initVaultEngine();
  return shared;
}
