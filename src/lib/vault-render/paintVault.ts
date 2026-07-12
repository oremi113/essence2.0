import type { VaultPhase, EmberState } from '@/components/screens/step3/types';
import { RELIQUARY } from './palette';
import { getVaultEngine, type VaultDrive } from './vaultEngine';

// The single paint path, shared by the static VaultObject and the animated seal
// canvas. Both routes call paintVaultFrame with identical sizing, so the seam
// (CardCapture's settled frame === Processing's mount frame, Motion Spec §SEAM)
// is pixel-identical by construction — same engine, same scale, same drive.

// How much of the canvas box the 600×600 engine render fills. The reliquary
// case is 300×340 of the 600 render, so at 1.6 the case stands ~0.8 box wide ×
// ~0.91 box tall — a portrait reliquary centered in the square, with the
// ambient glow/halo clipped to the box edge (as the SVG viewBox clipped it).
// Tuned on /dev/seal against the rig; keep the static and animated paths on the
// same constant or the seam shifts.
export const VAULT_DRAW_SCALE = 1.6;

// Map the prop-driven (phase, emberState) onto the engine's two drive axes
// (DC1). The seal animates between these same three frames:
//   establish / confirm-hold → {0,0}  (open, cool — the unsealed vessel)
//   sealed + cool            → {1,0}  (iris shut, ember not yet caught)
//   sealed + ignited         → {1,1}  (caught pilot light)
export function phaseToDrive(phase: VaultPhase, emberState: EmberState): VaultDrive {
  if (phase !== 'sealed') return { mechT: 0, emberT: 0 };
  return emberState === 'ignited' ? { mechT: 1, emberT: 1 } : { mechT: 1, emberT: 0 };
}

interface PaintOpts {
  dpr?: number;
  scale?: number;
}

// Size the canvas backing store to its CSS box × DPR (idempotent — only writes
// when it changes, so it's cheap to call every animation frame), then composite
// the vault centered. Returns false if the box has no layout yet (caller can
// retry on the next frame).
export function paintVaultFrame(canvas: HTMLCanvasElement, drive: VaultDrive, opts: PaintOpts = {}): boolean {
  const dpr = opts.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
  const scale = opts.scale ?? VAULT_DRAW_SCALE;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW === 0 || cssH === 0) return false;

  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (canvas.width !== bw) canvas.width = bw;
  if (canvas.height !== bh) canvas.height = bh;

  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.clearRect(0, 0, bw, bh);
  // Square draw region from the smaller side, centered — the engine render is
  // square (600×600) and we never want the case to distort.
  const size = Math.min(bw, bh) * scale;
  getVaultEngine().drawVault(ctx, bw / 2, bh / 2, size, drive, RELIQUARY);
  return true;
}
