import { describe, expect, test } from 'vitest';
import { resolveDrive } from '@/lib/vault-render/vaultEngine';

// The DC1 contract (Vault_Canvas_Swap_Plan.md §3): drawVault accepts either a
// scalar (the rig's coupled behavior — mechanism and ember move together) or a
// split { mechT, emberT } so the seal can run the iris-close cool (emberT held
// at 0) and the ember-catch after (mechT pinned at 1). resolveDrive is the seam
// that normalizes both forms; pixel output is verified in Playwright (canvas
// has no meaningful jsdom backend).
describe('resolveDrive — the mechT/emberT drive contract', () => {
  test('a scalar maps to equal axes (back-compat with the rig)', () => {
    expect(resolveDrive(0)).toEqual({ mechT: 0, emberT: 0 });
    expect(resolveDrive(1)).toEqual({ mechT: 1, emberT: 1 });
    expect(resolveDrive(0.37)).toEqual({ mechT: 0.37, emberT: 0.37 });
  });

  test('a split object passes both axes through independently', () => {
    // The cool iris-close frame: mechanism shut, ember still cool.
    expect(resolveDrive({ mechT: 1, emberT: 0 })).toEqual({ mechT: 1, emberT: 0 });
    // Mid-catch: mechanism pinned, ember rising.
    expect(resolveDrive({ mechT: 1, emberT: 0.5 })).toEqual({ mechT: 1, emberT: 0.5 });
  });

  test('the three seal frames VaultObject renders are distinct drives', () => {
    const establish = resolveDrive({ mechT: 0, emberT: 0 });
    const sealedCool = resolveDrive({ mechT: 1, emberT: 0 });
    const sealedIgnited = resolveDrive({ mechT: 1, emberT: 1 });
    // establish → closed-cool differ on the mechanism only (the iris close)…
    expect(establish.mechT).not.toBe(sealedCool.mechT);
    expect(establish.emberT).toBe(sealedCool.emberT);
    // …closed-cool → ignited differ on the ember only (the catch).
    expect(sealedCool.mechT).toBe(sealedIgnited.mechT);
    expect(sealedCool.emberT).not.toBe(sealedIgnited.emberT);
  });
});
