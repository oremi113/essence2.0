#!/usr/bin/env node
/**
 * Home A motion verification — 4x CPU throttle on a mobile viewport.
 *
 * CLAUDE.md: "4x CPU throttle on mobile sim is the shippability bar for
 * motion." This produces the number that bar refers to.
 *
 * It lives in scripts/ on purpose. The previous version of this harness lived
 * in .tmp/, which is gitignored, so it evaporated — and four separate review
 * threads then each recorded "run it against the existing harness" as owed
 * work against a file that no longer existed. Screenshots still go to .tmp/;
 * the harness itself does not.
 *
 * Usage:
 *   npm run dev                       # in another shell
 *   node scripts/verify-home-a.mjs
 *   node scripts/verify-home-a.mjs --rate=4 --runs=5
 *
 * Reports p95 frame time during the arrival choreography for each state, and
 * writes a screenshot per state to .tmp/.
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    rate: { type: 'string', default: '4' },
    runs: { type: 'string', default: '5' },
    base: { type: 'string', default: 'http://localhost:3000' },
    /* The FRAME route, not the harness. The harness wraps the screen in an
       iframe (so media queries and dvh resolve against a real 390px viewport),
       which means sampling the top document measures a page that does not
       animate. Point straight at the screen. */
    path: { type: 'string', default: '/dev/home-a/frame?register=paused&clips=12' },
    headed: { type: 'boolean', default: false },
  },
});

const RATE = Number(values.rate);
const RUNS = Number(values.runs);
const URL = `${values.base}${values.path}`;
const OUT = '.tmp';

/** Frame budget at 60fps. A frame over this is a dropped frame. */
const BUDGET_MS = 16.7;

mkdirSync(OUT, { recursive: true });

/**
 * Sample frame-to-frame deltas across the arrival window via rAF. Measured in
 * the page so the numbers are the ones the compositor actually produced, not
 * wall-clock guesses from Node.
 */
async function sampleFrames(page, ms) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const t0 = last;
        function tick(now) {
          deltas.push(now - last);
          last = now;
          if (now - t0 < duration) requestAnimationFrame(tick);
          else resolve(deltas);
        }
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

const pct = (arr, p) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const browser = await chromium.launch({ headless: !values.headed });
const context = await browser.newContext({
  ...devices['Pixel 5'],
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });

// No replay control on the bare frame — re-navigate to re-run the arrival.
const replay = { count: async () => 0, click: async () => {} };

const rows = [];
for (let i = 0; i < RUNS; i++) {
  if (await replay.count()) await replay.click();
  else await page.goto(URL, { waitUntil: 'domcontentloaded' });
  // Arrival is 620ms + a 240ms stagger tail; sample past it so the tail's
  // settle is included rather than clipped at the interesting moment.
  const deltas = await sampleFrames(page, 1200);
  // Drop the first delta: it spans the click, not the animation.
  rows.push(deltas.slice(1));
}

/**
 * Focus order, asserted rather than documented — prose does not fail.
 * A review pass found the order "correct by accident"; the composition has
 * changed three times since (banner into flow, action block pinned outside the
 * scroll region, sign-out removed), so it is captured here against the shape
 * that actually ships.
 */
async function focusOrder() {
  await page.evaluate(() => document.activeElement?.blur?.());
  const seen = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const inFrame = !!el.closest('main.homea');
      const label = el.getAttribute('aria-label') || (el.textContent || '').trim().slice(0, 34);
      return inFrame ? `${el.tagName.toLowerCase()}:${label}` : null;
    });
    if (d) seen.push(d);
  }
  return [...new Set(seen)];
}

const order = await focusOrder();

/**
 * Browser zoom, tested by shrinking the CSS viewport — which is what zoom
 * actually does. `Emulation.setPageScaleFactor` is pinch-zoom: it magnifies
 * without reflowing, so it reports no overflow however far you push it and
 * proves nothing.
 * The app's type scale is px throughout (FOLLOW_UPS #106), so a text-size
 * preference moves nothing at all; zoom is the only thing a user has. The
 * requirement is not that nothing overflows — it is that the primary action
 * stays reachable when it does.
 */
async function atZoom(factor) {
  const z = await context.newPage();
  await z.setViewportSize({
    width: Math.round(390 / factor),
    height: Math.round(844 / factor),
  });
  await z.goto(URL, { waitUntil: 'networkidle' });
  await z.waitForTimeout(700);
  const r = await z.evaluate(() => {
    const cta = document.querySelector('.homea__cta');
    const sc = document.querySelector('.homea__scroll');
    if (!cta) return { ctaReachable: null, hidden: null };
    const c = cta.getBoundingClientRect();
    return {
      ctaReachable: c.bottom <= window.innerHeight + 1 && c.top >= 0,
      hidden: sc ? sc.scrollHeight - sc.clientHeight : 0,
    };
  });
  await z.close();
  return r;
}
const zoom13 = await atZoom(1.3);
const zoom20 = await atZoom(2.0);

/**
 * Reader text size — the setting, not a simulation of it.
 *
 * `Page.setFontSizes` changes the browser's own default font size, which is
 * what a person changes in Safari's AA control or Chrome's accessibility
 * settings. That matters beyond convenience: `em` in a MEDIA QUERY resolves
 * against the browser default, not against `documentElement.style.fontSize`.
 * Setting the root inline — the obvious-looking approach, and the one used
 * here first — scales `rem` type but leaves every `max-height: NNem` query
 * inert, so it reports a layout the user will never see. This screen relies on
 * exactly such a query to let the stone yield space to the content, so the
 * wrong emulation hid a real failure.
 */
async function atReaderFontSize(px) {
  const t = await context.newPage();
  const s = await context.newCDPSession(t);
  await s.send('Page.setFontSizes', { fontSizes: { standard: px, fixed: px } });
  await t.goto(URL, { waitUntil: 'networkidle' });
  await t.waitForTimeout(900);
  const r = await t.evaluate(() => {
    const sc = document.querySelector('.homea__scroll');
    if (!sc) return null;
    const sr = sc.getBoundingClientRect();
    const inView = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return 'absent';
      const b = e.getBoundingClientRect();
      return b.top >= sr.top - 1 && b.bottom <= sr.bottom + 1 ? 'ok' : 'scrolls';
    };
    const cta = document.querySelector('.homea__cta');
    return {
      cta: getComputedStyle(cta).fontSize,
      pill: inView('.essence-status-pill'),
      band: inView('.homea__band'),
      next: inView('.homea__next-stop'),
      ctaReachable: cta.getBoundingClientRect().bottom <= window.innerHeight + 1,
    };
  });
  await t.close();
  return r;
}
/**
 * Region height, which is the condition the screen actually responds to.
 *
 * Neither emulation above reaches iOS Safari's AA control: it applies
 * -webkit-text-size-adjust, which scales text while leaving both the browser
 * default and every media-query `em` reference at 16px. Two fixes were shipped
 * against emulations that could not see that, and a real phone found both.
 *
 * So the screen keys on the scroll region's MEASURED height via a container
 * query, and this checks that ladder directly. Shrinking the viewport produces
 * a small region the same way large text does; what matters is that the stone
 * — the one element carrying no information — yields before the progress
 * display does.
 */
async function atRegionHeight(vh) {
  const t = await context.newPage();
  await t.setViewportSize({ width: 390, height: vh });
  await t.goto(URL, { waitUntil: 'networkidle' });
  await t.waitForTimeout(700);
  const r = await t.evaluate(() => {
    const sc = document.querySelector('.homea__scroll');
    const sr = sc.getBoundingClientRect();
    const iv = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return 'absent';
      const b = e.getBoundingClientRect();
      return b.top >= sr.top - 1 && b.bottom <= sr.bottom + 1 ? 'ok' : 'scrolls';
    };
    const st = document.querySelector('.homea__stone canvas');
    return {
      region: Math.round(sr.height),
      stone: st ? Math.round(st.getBoundingClientRect().width) + 'px' : 'hidden',
      band: iv('.homea__band'),
      next: iv('.homea__next-stop'),
    };
  });
  await t.close();
  return r;
}
const tall = await atRegionHeight(844);
const mid = await atRegionHeight(600);
const short = await atRegionHeight(460);

const read16 = await atReaderFontSize(16);
const read21 = await atReaderFontSize(21);
const read32 = await atReaderFontSize(32);

const all = rows.flat();
const p50 = pct(all, 50);
const p95 = pct(all, 95);
const worst = Math.max(...all);
const dropped = all.filter((d) => d > BUDGET_MS).length;

await page.screenshot({ path: `${OUT}/home-a-verify.png`, fullPage: false });

console.log(`
Home A — motion verification
  url            ${URL}
  viewport       390x844 @2x, Pixel 5 UA, touch
  CPU throttle   ${RATE}x
  runs           ${RUNS} (${all.length} frames)

  p50            ${p50.toFixed(1)}ms
  p95            ${p95.toFixed(1)}ms   ${p95 <= BUDGET_MS ? 'PASS' : 'OVER BUDGET'}
  worst          ${worst.toFixed(1)}ms
  over ${BUDGET_MS}ms      ${dropped} / ${all.length}  (${((dropped / all.length) * 100).toFixed(1)}%)

  zoom 130% (300x649)   CTA reachable: ${zoom13.ctaReachable}   scroll hidden: ${zoom13.hidden}px
  zoom 200% (195x422)   CTA reachable: ${zoom20.ctaReachable}   scroll hidden: ${zoom20.hidden}px

  region ${tall.region}px   stone ${tall.stone.padEnd(6)} band ${tall.band}  next ${tall.next}
  region ${mid.region}px   stone ${mid.stone.padEnd(6)} band ${mid.band}  next ${mid.next}
  region ${short.region}px   stone ${short.stone.padEnd(6)} band ${short.band}  next ${short.next}

  reader 16px    CTA ${read16?.cta}  pill ${read16?.pill}  band ${read16?.band}  next ${read16?.next}
  reader 21px    CTA ${read21?.cta}  pill ${read21?.pill}  band ${read21?.band}  next ${read21?.next}
  reader 32px    CTA ${read32?.cta}  pill ${read32?.pill}  band ${read32?.band}  next ${read32?.next}

  focus order    ${order.length ? order.join('  ->  ') : '(none inside the screen)'}

  console errors ${errors.length === 0 ? 'none' : errors.length}
${errors.map((e) => `    ${e}`).join('\n')}
  screenshot     ${OUT}/home-a-verify.png
`);

await browser.close();
process.exit(p95 <= BUDGET_MS && errors.length === 0 ? 0 : 1);
