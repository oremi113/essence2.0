/**
 * Step 10 · S10-B — the blocked-action note.
 *
 * When the user taps a network-required CTA (Generate / Save / Checkout) while
 * offline, the action is *prevented, not failed*: the screen disables its own
 * CTA and renders this calm reason beneath it. Mirrors the Ch2 inline-recovery
 * shape (VaultSealScreen's `.vault-error` + provisional copy), but neutral —
 * offline is a condition, not an error, so this leans on secondary text, never
 * terracotta.
 *
 * Pure/presentational: the screen owns the `blocked` decision (from useOnline)
 * and disables its CTA; this only renders the reason. Ported from the S10-B
 * prototype's `.cta-reason` — slides open on `--duration-small`, collapses when
 * unblocked, instant under reduced motion. Copy is provisional pending the
 * consolidated Step 10 copy pass (see docs/Step10_Error_Chapters_Scope.md §X).
 */

// Reassure-what's-safe first, one next step — voice guide §8. Provisional.
export const OFFLINE_ACTION_COPY = {
  generate: 'You’re offline right now. Your note is kept — try again once you’re back online.',
  save: 'You’re offline right now. Your message is kept — try again once you’re back online.',
  checkout: 'You’re offline right now. Nothing was charged — try again when you’re back online.',
} as const;

export function OfflineActionNote({
  blocked,
  children,
}: {
  blocked: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{OFFLINE_ACTION_NOTE_CSS}</style>
      <p
        className="offline-action-note"
        data-blocked={blocked}
        role="status"
        // Collapsed + silent to assistive tech when the action isn't blocked.
        aria-hidden={!blocked}
      >
        {children}
      </p>
    </>
  );
}

export const OFFLINE_ACTION_NOTE_CSS = `
.offline-action-note {
  font-family: var(--font-body);
  font-size: var(--text-small);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 320px;
  margin: 0 auto;
  line-height: 1.5;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height var(--duration-small) var(--ease-essence),
              opacity var(--duration-small) var(--ease-essence);
}
.offline-action-note[data-blocked="true"] {
  max-height: 72px;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .offline-action-note { transition: none; }
}
`;
