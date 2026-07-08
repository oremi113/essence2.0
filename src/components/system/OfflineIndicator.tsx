'use client';

import { useConnectivity } from '@/lib/system/useOnline';

/**
 * Step 10 · S10-B — the transient offline indicator.
 *
 * A calm mineral pill under the status bar (a quieter sibling of SystemScreen,
 * per docs/Step10_Offline_Design_Handoff.md §5). It appears when connectivity
 * drops, flips to a brief sage "Back online" beat on reconnect, then retreats.
 * Deliberately NOT terracotta — offline is a condition, not an error.
 *
 * Ported from prototypes/essence-step10-offline.html: pill lifts up + fades on
 * `--duration-page`/`--ease-page`; reconnect tints sage with a success dot;
 * reduced-motion appears/retreats instantly. It never loops — a state, not an
 * alert. Scoped under `.offline-indicator` so nothing leaks global.
 *
 * `OfflineIndicator` is pure/presentational (drive it from the `/dev/offline`
 * rail); `LiveOfflineIndicator` wires it to the real connectivity signal and is
 * what the app layout mounts.
 */

export type OfflineStatus = 'online' | 'offline' | 'reconnecting';

export function deriveOfflineStatus(online: boolean, justReconnected: boolean): OfflineStatus {
  if (!online) return 'offline';
  if (justReconnected) return 'reconnecting';
  return 'online';
}

const LABELS: Record<Exclude<OfflineStatus, 'online'>, string> = {
  offline: 'You’re offline',
  reconnecting: 'Back online',
};

export function OfflineIndicator({ status }: { status: OfflineStatus }) {
  const visible = status !== 'online';
  return (
    <div className="offline-indicator" aria-hidden={!visible}>
      <style>{OFFLINE_INDICATOR_CSS}</style>
      <div
        className="offline-indicator__pill"
        data-status={status}
        role="status"
        aria-live="polite"
      >
        <span className="offline-indicator__dot" />
        {/* Empty when online so nothing is announced or read at rest. */}
        <span className="offline-indicator__label">
          {visible ? LABELS[status] : ''}
        </span>
      </div>
    </div>
  );
}

export function LiveOfflineIndicator() {
  const { online, justReconnected } = useConnectivity();
  return <OfflineIndicator status={deriveOfflineStatus(online, justReconnected)} />;
}

export const OFFLINE_INDICATOR_CSS = `
.offline-indicator__pill {
  position: fixed; top: calc(env(safe-area-inset-top, 0px) + 8px);
  left: 50%; z-index: 60;
  display: flex; align-items: center; gap: var(--space-sm);
  padding: 8px 16px; border-radius: var(--radius-pill);
  background: var(--color-surface-card);
  border: 1px solid rgba(28, 26, 24, 0.06);
  box-shadow: var(--shadow-pill);
  font-family: var(--font-body);
  font-size: var(--text-small); font-weight: 500;
  color: var(--color-text-primary);
  white-space: nowrap;
  /* Resting (online): lifted up + faded, non-interactive. */
  transform: translate(-50%, -18px); opacity: 0; pointer-events: none;
  transition: transform var(--duration-page) var(--ease-page),
              opacity var(--duration-page) var(--ease-page),
              background var(--duration-small) var(--ease-essence);
}
.offline-indicator__pill[data-status="offline"],
.offline-indicator__pill[data-status="reconnecting"] {
  transform: translate(-50%, 0); opacity: 1;
}
.offline-indicator__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--color-mineral); flex-shrink: 0;
}
/* Reconnect beat — sage tint + success dot, its own brief copy. */
.offline-indicator__pill[data-status="reconnecting"] { background: #EAF1EC; }
.offline-indicator__pill[data-status="reconnecting"] .offline-indicator__dot {
  background: var(--color-status-success);
}
@media (prefers-reduced-motion: reduce) {
  .offline-indicator__pill { transition: none; }
}
`;
