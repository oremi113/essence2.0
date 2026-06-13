/**
 * A7 Save Confirmation — "Kept on {date} · {time}" attestation formatter.
 *
 * The format is locked by the prototype (essence-step6-a7.html): short
 * month, no zero-padded hour, lowercase am/pm, middle-dot separator.
 * Rendered in the user's local timezone from the server's created_at —
 * these cases construct ISO strings from local Date parts so they hold
 * in any TZ the suite runs in.
 */
import { describe, expect, it } from 'vitest';
import { formatKeptTimestamp } from '@/components/screens/messages/SaveConfirmationScreen';

/** ISO string for a local wall-clock moment (keeps assertions TZ-proof). */
function localIso(y: number, m: number, d: number, h: number, min: number): string {
  return new Date(y, m - 1, d, h, min, 0).toISOString();
}

describe('formatKeptTimestamp', () => {
  it('renders the locked "Kept on Mon D, YYYY · h:mmam/pm" shape', () => {
    expect(formatKeptTimestamp(localIso(2026, 4, 23, 21, 41))).toBe(
      'Kept on Apr 23, 2026 · 9:41pm',
    );
  });

  it('uses 12-hour time without zero-padding the hour', () => {
    expect(formatKeptTimestamp(localIso(2026, 6, 12, 9, 5))).toBe(
      'Kept on Jun 12, 2026 · 9:05am',
    );
  });

  it('renders midnight and noon as 12, not 0', () => {
    expect(formatKeptTimestamp(localIso(2026, 1, 1, 0, 0))).toBe(
      'Kept on Jan 1, 2026 · 12:00am',
    );
    expect(formatKeptTimestamp(localIso(2026, 1, 1, 12, 0))).toBe(
      'Kept on Jan 1, 2026 · 12:00pm',
    );
  });

  it('returns empty string for an unparseable timestamp', () => {
    expect(formatKeptTimestamp('not-a-date')).toBe('');
  });
});
