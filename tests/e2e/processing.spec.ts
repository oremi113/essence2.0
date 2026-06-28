/**
 * Step 3 · Processing — Pass 3 verification spec.
 *
 * Encodes the Build Handoff §9.4 / Motion Spec §8 gate for the calm wait:
 *   - the shimmer activation map (Motion Spec §4): faint 0.05 (waiting),
 *     active 0.12 ceiling (working, breathing), neutral 0.025 (handoff frame)
 *   - the breath loop holds 60fps under 4× CPU throttle at active intensity
 *   - the exit ease-down eases active → neutral (0.025) and stops on the
 *     neutral handoff contract frame (§5/§7) — a real, nameable boundary
 *   - reduced motion renders the static faint rest (0.05), zero animation
 *   - the vault + ember are dead-still through the wait (only the ground moves)
 *   - zero console errors
 *
 * GATED (not asserted green here): the notify-landing cold-start re-fetch
 * depends on the transactional notify infra, which does not exist yet
 * (FOLLOW_UPS #69). We verify the static shell renders; the re-fetch is a
 * separate, skipped test so the axis is not declared green by stubbing the one
 * thing it exists to verify.
 *
 * Runs against /dev/processing (baseURL-relative; ENABLE_DEV_ROUTES in .env.local).
 *
 * DOM CONTRACT (/dev/processing honors this):
 *   #shimmer        the ground-shimmer element (opacity = --shimmer-intensity)
 *   #btn-play  walks normal → extended (climb)   #btn-exit  gen complete (exit)
 *   #btn-rm    reduced-motion toggle
 *   state buttons by visible label; .step3-vault is the dead-still vault
 */

import { test, expect, type Page } from '@playwright/test';

const ACTIVE_LO = 0.085; // active breathes ~0.09 → 0.12
const ACTIVE_HI = 0.122;

const consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/processing', { waitUntil: 'load' });
});

test.afterEach(() => {
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

function shimmer(page: Page): Promise<number> {
  return page.locator('#shimmer').evaluate((el) => parseFloat(getComputedStyle(el as Element).opacity));
}
function selectState(page: Page, label: string) {
  return page.getByRole('button', { name: label, exact: true }).click();
}

// ── Activation map (Motion Spec §4) ──────────────────────────────────────────

test.describe('shimmer activation map', () => {
  test('waiting states render faint (~0.05), static', async ({ page }) => {
    // processing-normal is the initial state — faint, applied instantly on mount.
    await page.waitForTimeout(200);
    expect(await shimmer(page)).toBeGreaterThan(0.04);
    expect(await shimmer(page)).toBeLessThan(0.061);

    await selectState(page, 'post-seal-support');
    await page.waitForTimeout(200);
    expect(await shimmer(page)).toBeGreaterThan(0.04);
    expect(await shimmer(page)).toBeLessThan(0.061);
  });

  test('working states climb to the active band (~0.09–0.12) and breathe', async ({ page }) => {
    await selectState(page, 'extended');
    await page.waitForTimeout(2600); // climb (2200) + settle
    const a = await shimmer(page);
    expect(a, `active shimmer ${a}`).toBeGreaterThan(ACTIVE_LO);
    expect(a, `active shimmer ${a}`).toBeLessThan(ACTIVE_HI);

    // It breathes: sampled across the 7s sine, the value moves (not pinned flat).
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      samples.push(await shimmer(page));
      await page.waitForTimeout(450);
    }
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread, `breath spread ${spread.toFixed(4)}`).toBeGreaterThan(0.004);
  });

  test('neutral-exit is a nameable boundary at ~0.025', async ({ page }) => {
    await selectState(page, 'neutral-exit (handoff)');
    await page.waitForTimeout(1500); // exit ease-down (1200) + settle
    const n = await shimmer(page);
    expect(n, `neutral shimmer ${n}`).toBeGreaterThan(0.018);
    expect(n, `neutral shimmer ${n}`).toBeLessThan(0.032);
    // The frame is an explicit, pinned boundary — not an end-of-animation accident.
    await expect(page.locator('[data-neutral-handoff]')).toHaveCount(1);
  });
});

// ── Exit ease-down: active → neutral, settles and stops ──────────────────────

test.describe('exit ease-down', () => {
  test('gen complete eases active → neutral (0.025) and holds', async ({ page }) => {
    await selectState(page, 'extended');
    await page.waitForTimeout(2600); // reach active
    expect(await shimmer(page)).toBeGreaterThan(ACTIVE_LO);

    await page.locator('#btn-exit').click(); // gen complete → neutral-exit
    await page.waitForTimeout(1500); // ease-down (1200) + settle
    const a = await shimmer(page);
    expect(a, `post-exit shimmer ${a}`).toBeGreaterThan(0.018);
    expect(a, `post-exit shimmer ${a}`).toBeLessThan(0.032);

    // Held: it stops on the frame, does not drift.
    await page.waitForTimeout(700);
    const b = await shimmer(page);
    expect(Math.abs(b - a), `neutral drift ${Math.abs(b - a).toFixed(4)}`).toBeLessThan(0.004);
  });
});

// ── Reduced motion: static faint rest, zero animation ────────────────────────

test.describe('reduced motion', () => {
  test('RM renders the static faint rest (~0.05), no breath', async ({ page }) => {
    await page.locator('#btn-rm').click(); // RM on
    await selectState(page, 'extended'); // a working state, but RM collapses it
    await page.waitForTimeout(300);
    const a = await shimmer(page);
    expect(a, `RM rest ${a}`).toBeGreaterThan(0.04);
    expect(a, `RM rest ${a}`).toBeLessThan(0.061);
    // Static — no loop. Sampled over time it does not move.
    await page.waitForTimeout(900);
    const b = await shimmer(page);
    expect(Math.abs(b - a), `RM drift ${Math.abs(b - a).toFixed(4)}`).toBeLessThan(0.002);
  });
});

// ── Processing stillness: the vault never moves ──────────────────────────────

test.describe('stillness', () => {
  test('vault + ember are dead-still while the ground shimmer breathes', async ({ page }) => {
    await selectState(page, 'extended');
    await page.waitForTimeout(2600);
    const box1 = await page.locator('.step3-vault').boundingBox();
    await page.waitForTimeout(1200);
    const box2 = await page.locator('.step3-vault').boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    expect(box2!.x).toBeCloseTo(box1!.x, 1);
    expect(box2!.y).toBeCloseTo(box1!.y, 1);
    expect(box2!.width).toBeCloseTo(box1!.width, 1);
    expect(box2!.height).toBeCloseTo(box1!.height, 1);
  });
});

// ── notify-landing: the static shell renders; cold-start re-fetch is GATED ────

test.describe('notify-landing', () => {
  test('renders the cold-start shell: context badge + active ground', async ({ page }) => {
    await selectState(page, 'notify-landing');
    await expect(page.getByText('Picking up where you left off')).toBeVisible();
    await page.waitForTimeout(2600);
    expect(await shimmer(page)).toBeGreaterThan(ACTIVE_LO);
  });

  // GATED on the transactional notify infra (FOLLOW_UPS #69). The cold-start
  // deep-link re-fetch is the thing this state exists to verify; it cannot be
  // asserted until the infra lands, and stubbing it would be a false green.
  test.skip('cold-start deep-link re-fetches state on landing (gated: notify infra)', async () => {
    // Intentionally unimplemented until the notify infra exists.
  });
});

// ── Performance: breath loop holds ~60fps under 4× CPU throttle ───────────────

test.describe('performance', () => {
  test('breath loop holds ~60fps at active intensity under 4× throttle', async ({ page }) => {
    await selectState(page, 'extended');
    await page.waitForTimeout(2600); // reach the active breath

    let client;
    try {
      client = await page.context().newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    } catch {
      test.skip(true, 'CDP CPU throttling is Chromium-only');
      return;
    }

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
    await page.waitForTimeout(1900);
    const frames: number[] = await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    expect(frames.length, 'sampler collected no frames').toBeGreaterThan(30);
    const sorted = [...frames].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const worst = sorted[sorted.length - 1];
    console.log(
      `[processing breath @4× throttle] frames=${frames.length} median=${median.toFixed(1)}ms ` +
        `worst=${worst.toFixed(1)}ms (~${(1000 / median).toFixed(0)}fps median)`,
    );
    expect(median, `median frame ${median.toFixed(1)}ms`).toBeLessThan(20);
    expect(worst, `worst frame ${worst.toFixed(1)}ms`).toBeLessThan(50);
  });
});
