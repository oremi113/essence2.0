// Vault canvas — the canonical "reliquary" palette.
//
// This is the color source of truth for the Canvas 2D vault engine
// (vaultEngine.ts), distilled from the design rig
// `prototypes/vault-canvas-rig.html` (the single locked palette, stage 1).
//
// Why raw values live here and not only in @theme: a canvas engine consumes
// numeric RGB triples and multi-stop hex ramps (the ember body is an 8-stop
// gradient interpolated per frame) — these are render-internal detail, not
// themeable design tokens. Where a value DOES overlap a design token it mirrors
// it exactly: `glowRGB` here === `--color-glow-warm-rgb: 214, 162, 92` in
// @theme (palette-token-reconciliation.md). If a token's value changes, mirror
// it here. CLAUDE.md's "no raw hex in screens" rule is about screen components;
// this is a src/lib/ rendering primitive, where the palette is the artifact.

export type RGB = readonly [number, number, number];

export interface VaultPalette {
  // Case metal blend axis (cool→warm by warmth, dark→light by lightness).
  metalCool: RGB;
  metalWarm: RGB;
  warmFactor: number;
  metalLight: RGB;
  metalDark: RGB;
  // Interior well.
  interiorCoolCenter: RGB;
  interiorCoolEdge: RGB;
  interiorWarmTint: RGB;
  // Ember glow / lighting.
  glowRGB: RGB; // === --color-glow-warm-rgb
  glowStrength: number;
  haloExtent: number;
  litCore: string; // hex — the caught pilot-light core
  emberHalo: readonly [RGB, RGB, RGB]; // 3 halo stops
  // Ember body gradient: 8 stops, cool (dormant) → warm (ignited), lerped by emberT.
  emberCoolBody: readonly string[];
  emberWarmBody: readonly string[];
  // Dormant-only cool wash over the case (removed as warmth arrives). Optional;
  // defaults to 0.06 in the engine when absent.
  coolWashMax?: number;
}

// The single locked reliquary palette (rig stage 1 — `reliquary()`).
export const RELIQUARY: VaultPalette = {
  metalCool: [122, 128, 136],
  metalWarm: [186, 168, 143],
  warmFactor: 0.66,
  metalLight: [235, 228, 218],
  metalDark: [85, 88, 94],
  interiorCoolCenter: [207, 199, 186],
  interiorCoolEdge: [146, 136, 118],
  interiorWarmTint: [232, 212, 170],
  glowRGB: [214, 162, 92], // mirrors --color-glow-warm-rgb
  glowStrength: 0.34,
  haloExtent: 2.4,
  litCore: '#f3d9a4',
  emberHalo: [
    [251, 230, 192],
    [238, 203, 132],
    [217, 168, 90],
  ],
  emberCoolBody: ['#cbcdd0', '#bcc0c5', '#aeb3b9', '#9da3aa', '#8d949c', '#7f868f', '#727982', '#666d76'],
  emberWarmBody: ['#fbe6c0', '#f3d9a4', '#ecca8a', '#dfb673', '#cf9f5b', '#b8884a', '#9c6f38', '#7b5a2e'],
  coolWashMax: 0.06,
};
