import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { EASE_SEAL_EXIT_BEZIER } from '@/components/screens/step3/useShimmerLoop';

// Drift guard for the dual-homed exit curve. --ease-seal-exit lives in
// globals.css @theme (the token, source of truth) AND is re-sampled in JS by
// useShimmerLoop for the rAF exit ease-down. The spec flags this as "one curve,
// two homes." If someone retunes the token (e.g. toward (0.4,0,0.15,1) on oat,
// as the spec anticipates) without updating the JS, the rendered exit and the
// token silently diverge. This test fails loudly when they do.
describe('--ease-seal-exit / useShimmerLoop drift guard', () => {
  test('the JS exit-curve sampler matches the @theme token control points', () => {
    const css = readFileSync(path.resolve(__dirname, '../../src/app/globals.css'), 'utf8');
    const match = css.match(/--ease-seal-exit:\s*cubic-bezier\(([^)]+)\)/);
    expect(match, '--ease-seal-exit not found in globals.css @theme').not.toBeNull();

    const tokenPoints = match![1].split(',').map((n) => parseFloat(n.trim()));
    expect(tokenPoints).toHaveLength(4);
    expect(
      tokenPoints,
      `globals.css --ease-seal-exit ${JSON.stringify(tokenPoints)} drifted from ` +
        `useShimmerLoop EASE_SEAL_EXIT_BEZIER ${JSON.stringify([...EASE_SEAL_EXIT_BEZIER])} — ` +
        'update both (one curve, two homes).',
    ).toEqual([...EASE_SEAL_EXIT_BEZIER]);
  });
});
