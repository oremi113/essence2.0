import { describe, it, expect } from 'vitest';
import { isStalePending, STALE_PENDING_AFTER_MS } from '@/lib/messages/stale-pending';

const NOW = Date.parse('2026-09-04T12:00:00.000Z');
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isStalePending', () => {
  it('leaves a row a live /generate could still be rendering alone', () => {
    // /generate's own ceiling is 120s; a 90s-old row may still be mid-render.
    expect(isStalePending(at(90_000), NOW)).toBe(false);
  });

  it('is false exactly at the threshold (strictly older only)', () => {
    expect(isStalePending(at(STALE_PENDING_AFTER_MS), NOW)).toBe(false);
  });

  it('reclaims a row past the threshold', () => {
    expect(isStalePending(at(STALE_PENDING_AFTER_MS + 1), NOW)).toBe(true);
  });

  it('reclaims a long-abandoned row', () => {
    expect(isStalePending(at(36 * 60 * 60 * 1000), NOW)).toBe(true);
  });

  it('never reclaims on an unparseable timestamp', () => {
    expect(isStalePending('not-a-date', NOW)).toBe(false);
  });

  it('never reclaims a future-dated row (clock skew)', () => {
    expect(isStalePending(at(-60_000), NOW)).toBe(false);
  });
});
