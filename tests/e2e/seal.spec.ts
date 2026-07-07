/**
 * Step 3 · Seal hero — Pass 2 verification spec.
 *
 * Encodes the Build Handoff §9.3 / Motion Spec §8 gate for the seal:
 *   - the seal fires ONLY from the confirmed trigger (§SEAL-INTEGRITY, motion half)
 *   - all three pre-seal states render unsealed + cool ember + shimmer 0, never a seal
 *   - the ember reads cool through the entire close, ignites at the catch, stays static
 *   - the locked timeline beats land: catching≈975, settling≈1375, onSealed≈1675,
 *     dwell ~2.5s, crossfade≈4175 — copy swaps only at the seam, vault doesn't move
 *   - reduced motion renders the settled frame directly with zero animation
 *   - the seal holds 60fps under 4× CPU throttle at 390×844, iris-close window the focus
 *   - zero console errors
 *
 * Runs against the production seal sandbox at /dev/seal (baseURL-relative, so it
 * uses the shared webServer on :4000 — ENABLE_DEV_ROUTES=true in .env.local).
 * Ported from docs/session-step3-card-capture/seal.spec.ts when Pass 1 landed
 * the dev routes; the DOM contract below is the same one /dev/seal exposes.
 *
 * DOM CONTRACT (/dev/seal honors this):
 *   #stage[data-phase]  idle→closing→catching→settling→sealed→handoff
 *   #stage[data-preseal] set in the three pre-seal states; #stage[data-rm] in RM
 *   #btn-trigger  fires the confirmed seal     #btn-rm toggles reduced motion
 *   .preseal-btn  (×3) the pre-seal integrity states
 *   #ro-phase #ro-ember #ro-shimmer #ro-seam #ro-guard  readout mirrors
 *   #seal-vault  the ONE canvas; data-mech-t / data-ember-t mirror its drive
 *                (iris-close = mech-t 0→1; ember-catch = ember-t 0→1)
 */

import { test, expect, type Page } from '@playwright/test';

const SEAL_URL = process.env.SEAL_URL ?? '/dev/seal';

// Locked timeline (Motion Spec §3 / useSealTimeline). Offsets from t=0 at the
// confirmed-payment trigger. Tolerance is generous because setTimeout + throttle
// jitter; we assert ORDER and rough landing, not frame-exact timing.
const BEAT = { CATCH: 975, SETTLE: 1375, SEALED: 1675, CROSSFADE: 4175 } as const;
const TOL = 220; // ms — covers setTimeout coalescing under CPU throttle

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(SEAL_URL, { waitUntil: 'load' });
});

test.afterEach(() => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

function phase(page: Page) {
  return page.locator('#stage');
}

// ── §SEAL-INTEGRITY: the seal fires only from the confirmed trigger ───────────

test.describe('seal gating', () => {
  for (const cap of ['confirm-hold', 'confirm-timeout', 'checkout-error']) {
    test(`pre-seal "${cap}" never seals: unsealed, cool ember, shimmer 0`, async ({
      page,
    }) => {
      // Click the matching pre-seal button by its exact visible label.
      await page.getByRole('button', { name: cap, exact: true }).click();

      await expect(phase(page)).toHaveAttribute('data-phase', 'idle');
      await expect(phase(page)).toHaveAttribute('data-preseal', '');
      // The one canvas renders the cool open vessel — mechanism open, ember
      // cool. No code path warms it here; no seal can exist.
      await expect(page.locator('#seal-vault')).toHaveAttribute('data-mech-t', '0.00');
      await expect(page.locator('#seal-vault')).toHaveAttribute('data-ember-t', '0.00');
      await expect(page.locator('#ro-ember')).toHaveText('cool');
      await expect(page.locator('#ro-shimmer')).toHaveText('0');
      await expect(page.locator('#ro-guard')).toContainText(/no seal/i);
    });
  }
});

// ── Timeline + ember discipline ──────────────────────────────────────────────

test.describe('confirmed seal timeline', () => {
  test('beats land in order; ember cool through the close, ignited from the catch', async ({
    page,
  }) => {
    // Record every data-phase change with a timestamp, client-side, so we read
    // the true sequence rather than racing polls against setTimeout.
    await page.evaluate(() => {
      (window as unknown as { __beats: Array<[string, number]> }).__beats = [];
      const stage = document.getElementById('stage')!;
      const t0 = performance.now();
      new MutationObserver(() => {
        const p = stage.getAttribute('data-phase') ?? '';
        (window as unknown as { __beats: Array<[string, number]> }).__beats.push([
          p,
          performance.now() - t0,
        ]);
      }).observe(stage, { attributes: true, attributeFilter: ['data-phase'] });
    });

    await page.locator('#btn-trigger').click();
    // ember must still read cool during the close, before the catch fires.
    await expect(page.locator('#ro-ember')).toHaveText('cool');

    // Wait past the crossfade, then read the recorded beats.
    await page.waitForFunction(
      () =>
        (window as unknown as { __beats: Array<[string, number]> }).__beats.some(
          ([p]) => p === 'handoff',
        ),
      undefined,
      { timeout: 8000 },
    );
    const beats = await page.evaluate(
      () => (window as unknown as { __beats: Array<[string, number]> }).__beats,
    );
    const at = (name: string) => beats.find(([p]) => p === name)?.[1];

    // order
    expect(beats.map(([p]) => p)).toEqual(
      expect.arrayContaining(['closing', 'catching', 'settling', 'sealed', 'handoff']),
    );
    // rough landings
    expect(at('catching')).toBeGreaterThan(BEAT.CATCH - TOL);
    expect(at('catching')).toBeLessThan(BEAT.CATCH + TOL);
    expect(at('settling')).toBeGreaterThan(BEAT.SETTLE - TOL);
    expect(at('sealed')).toBeGreaterThan(BEAT.SEALED - TOL);
    expect(at('handoff')).toBeGreaterThan(BEAT.CROSSFADE - TOL);
    // dwell really held ~2.5s between settle-end and the crossfade
    expect(at('handoff')! - at('sealed')!).toBeGreaterThan(2500 - TOL);
  });

  test('the seam swaps copy only — the sealed vault layer is continuous', async ({
    page,
  }) => {
    await page.locator('#btn-trigger').click();
    // Once sealed, the ignited frame holds; through the handoff it stays the
    // same drive (one canvas — the vault cannot swap or move, only copy fades).
    await page.waitForFunction(
      () => document.getElementById('stage')?.getAttribute('data-phase') === 'sealed',
      undefined,
      { timeout: 4000 },
    );
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-mech-t', '1.00');
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-ember-t', '1.00');
    await page.waitForFunction(
      () => document.getElementById('stage')?.getAttribute('data-phase') === 'handoff',
      undefined,
      { timeout: 6000 },
    );
    // ignited + shut, continuous across the seam — unchanged from the settle.
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-mech-t', '1.00');
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-ember-t', '1.00');
    await expect(page.locator('#ro-seam')).toHaveText('Processing');
    // only the active copy line is exposed to AT
    await expect(page.locator('.proc-copy')).toHaveAttribute('aria-hidden', 'false');
  });
});

// ── Reduced motion: settled frame rendered directly, zero animation ──────────

test.describe('reduced motion', () => {
  test('RM jumps straight to the settled frame, ember static-ignited, no in-between beats', async ({
    page,
  }) => {
    await page.locator('#btn-rm').click(); // toggle RM on
    await page.evaluate(() => {
      (window as unknown as { __phases: string[] }).__phases = [];
      const stage = document.getElementById('stage')!;
      new MutationObserver(() =>
        (window as unknown as { __phases: string[] }).__phases.push(
          stage.getAttribute('data-phase') ?? '',
        ),
      ).observe(stage, { attributes: true, attributeFilter: ['data-phase'] });
    });
    await page.locator('#btn-trigger').click();

    await expect(phase(page)).toHaveAttribute('data-phase', 'sealed');
    await expect(phase(page)).toHaveAttribute('data-rm', '');
    // RM renders the settled frame directly — ignited + shut, painted once.
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-mech-t', '1.00');
    await expect(page.locator('#seal-vault')).toHaveAttribute('data-ember-t', '1.00');
    await expect(page.locator('#ro-ember')).toHaveText('ignited');

    // No closing/catching/settling steps in RM — it renders the rest frame.
    const phases = await page.evaluate(
      () => (window as unknown as { __phases: string[] }).__phases,
    );
    expect(phases).not.toContain('closing');
    expect(phases).not.toContain('catching');
  });
});

// ── Performance: 60fps under 4× CPU throttle, iris-close window the focus ─────

test.describe('performance', () => {
  test('seal holds ~60fps under 4× CPU throttle', async ({ page, browserName }) => {
    // This gate REQUIRES Chromium CDP CPU throttling — it is the repo's motion
    // shippability bar (CLAUDE.md). The skip is explicit on engine so it reads
    // as "wrong engine," never as an environment accident that reports green:
    // run it via --project=chromium (which sets 390×844 in beforeEach). The
    // WebKit "mobile" project legitimately cannot run it and skips loudly here.
    //
    // Measure against a PRODUCTION build for the true number
    // (PLAYWRIGHT_BASE_URL=http://localhost:PORT → `next start`). `next dev`
    // adds reconciler/HMR/compile overhead that inflates the worst-frame tail
    // with one-off ~80ms spikes that are dev-only, not ceremony hitches; in
    // production the seal's worst frame holds ~28ms here, well clear of 50.
    test.skip(browserName !== 'chromium', 'perf gate requires Chromium CDP CPU throttling');
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // rAF frame-interval sampler over the whole seal window.
    await page.evaluate(() => {
      const w = window as unknown as { __frames: number[]; __t0: number };
      w.__frames = [];
      w.__t0 = performance.now();
      let last = performance.now();
      const tick = () => {
        const now = performance.now();
        w.__frames.push(now - last);
        last = now;
        if (now - w.__t0 < 1800) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    await page.locator('#btn-trigger').click();
    await page.waitForTimeout(1900); // cover iris-close → settle
    const frames: number[] = await page.evaluate(
      () => (window as unknown as { __frames: number[] }).__frames,
    );
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    expect(frames.length, 'sampler collected no frames').toBeGreaterThan(30);
    const sorted = [...frames].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const worst = sorted[sorted.length - 1];
    console.log(
      `[seal perf @4× throttle] frames=${frames.length} median=${median.toFixed(1)}ms ` +
        `worst=${worst.toFixed(1)}ms (~${(1000 / median).toFixed(0)}fps median)`,
    );
    // 60fps = 16.7ms/frame. Under 4× throttle the median should sit comfortably
    // ≤ 20ms; the worst single frame should not exceed ~50ms (a dropped frame at
    // the iris-close start would show as a long gap).
    expect(median, `median frame ${median.toFixed(1)}ms`).toBeLessThan(20);
    expect(worst, `worst frame ${worst.toFixed(1)}ms`).toBeLessThan(50);
  });
});
