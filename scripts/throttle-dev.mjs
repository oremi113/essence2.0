#!/usr/bin/env node
/**
 * Launch a headed Chromium with CPU throttling applied via CDP, so you can
 * click through dev flows the way a mid-range Android would see them.
 *
 * Usage:
 *   node scripts/throttle-dev.mjs [url] [--rate=4] [--mobile]
 *
 * Examples:
 *   node scripts/throttle-dev.mjs
 *   node scripts/throttle-dev.mjs /dev/onboarding --rate=6 --mobile
 *   node scripts/throttle-dev.mjs http://localhost:3000/app/record
 *
 * Leaves the browser open until you close it manually (or Ctrl+C here).
 * Requires the Next dev server to already be running (npm run dev).
 */
import { chromium, devices } from '@playwright/test';
import { parseArgs } from 'node:util';

const DEFAULT_BASE = 'http://localhost:3000';
const DEFAULT_PATH = '/dev/onboarding';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    rate: { type: 'string', default: '4' },
    mobile: { type: 'boolean', default: false },
    device: { type: 'string' },
  },
  allowPositionals: true,
});

const arg = positionals[0];
const target = arg
  ? arg.startsWith('http')
    ? arg
    : `${DEFAULT_BASE}${arg.startsWith('/') ? arg : `/${arg}`}`
  : `${DEFAULT_BASE}${DEFAULT_PATH}`;

const rate = Number(values.rate);
if (!Number.isFinite(rate) || rate <= 0) {
  console.error(`[throttle-dev] invalid --rate: ${values.rate}`);
  process.exit(1);
}

const contextOptions = values.device
  ? devices[values.device]
  : values.mobile
    ? devices['iPhone 13']
    : { viewport: { width: 1280, height: 800 } };

if (values.device && !devices[values.device]) {
  console.error(
    `[throttle-dev] unknown --device "${values.device}". See https://playwright.dev/docs/api/class-devices`
  );
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext(contextOptions);
const page = await context.newPage();

const client = await context.newCDPSession(page);
await client.send('Emulation.setCPUThrottlingRate', { rate });

console.log(`[throttle-dev] ${rate}x CPU throttle applied`);
console.log(`[throttle-dev] opening ${target}`);
await page.goto(target);

console.log('[throttle-dev] browser is yours. Close the window (or Ctrl+C) to exit.');

// Keep the process alive until the browser closes.
browser.on('disconnected', () => process.exit(0));
process.on('SIGINT', async () => {
  await browser.close().catch(() => {});
  process.exit(0);
});
