'use client';

import { memo, useEffect, useRef } from 'react';
import { paintVaultFrame, phaseToDrive } from '@/lib/vault-render/paintVault';
import type { EmberState, VaultPhase } from './types';

interface VaultObjectProps {
  phase: VaultPhase;
  emberState: EmberState;
  // When stacked as an opacity-gated seal layer, the vault is decorative (the
  // aria-live copy + readouts carry state) — suppress role/label so AT does not
  // announce three overlapping "Your Vault" images.
  decorative?: boolean;
}

// The single signature Vault object — the Canvas 2D engine (src/lib/vault-render)
// behind the props the SVG approximation used to honor. ONE prop-driven
// component reused by CardCapture's sealed region and Processing; the seal's
// animated canvas (SealVaultCanvas) shares the same paint path so the settled
// frame and Processing's mount frame are pixel-identical (Motion Spec §SEAM).
//
// §SEAL-INTEGRITY (structural half): the warm/ignited frame is reached ONLY for
// phase 'sealed'. 'establish' and 'confirm-hold' map to the cool, unsealed drive
// {mechT:0, emberT:0} — there is no code path that warms the ember on a pre-seal
// phase (phaseToDrive gates ignition on phase === 'sealed').
//
// Memoized: in the seal stack three VaultObjects render with constant props.
// memo keeps a phase flip on the parent from repainting layers whose props did
// not change.
function VaultObjectImpl({ phase, emberState, decorative = false }: VaultObjectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drive = phaseToDrive(phase, emberState);
    // First paint may land before layout resolves (canvas clientWidth 0) — retry
    // once on the next frame. Static frame: no ongoing loop.
    if (!paintVaultFrame(canvas, drive)) {
      const raf = requestAnimationFrame(() => paintVaultFrame(canvas, drive));
      return () => cancelAnimationFrame(raf);
    }
  }, [phase, emberState]);

  const sealed = phase === 'sealed';
  const label = sealed ? 'Your Vault, sealed' : 'Your Vault, unsealed';
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label } as const);

  return (
    <canvas
      ref={canvasRef}
      className="step3-vault"
      {...a11y}
      data-phase={phase}
      data-ember={emberState}
    />
  );
}

export const VaultObject = memo(VaultObjectImpl);
