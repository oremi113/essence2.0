import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

// Step 10 · S10-B — the connectivity primitive.
//
// One source of truth for "is the app online," owning `navigator.onLine` plus
// the window `online`/`offline` events. The transient offline indicator and
// every blocked-action gate (Generate / Save / Checkout) read from here so a
// single flip drives the whole offline surface — detect → inform → degrade →
// resume, no write-queue (DECISIONS.md:10, sync-MVP lock).
//
// `useOnline()` is the pure boolean (mirrors useReducedMotion's
// useSyncExternalStore shape; SSR renders as online so the indicator never
// flashes on first paint). `useConnectivity()` layers the brief "just
// reconnected" pulse the indicator uses for its sage "Back online" beat.

// Matches the prototype's reconnect beat: the pill flips to "Back online" and
// holds before retreating (prototypes/essence-step10-offline.html — 1600ms).
export const RECONNECT_PULSE_MS = 1600;

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  // No connectivity signal on the server; assume online so the offline
  // surface only ever appears in response to a real client-side drop.
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export interface Connectivity {
  online: boolean;
  /** True for RECONNECT_PULSE_MS after connection is regained — drives the
   *  transient "Back online" beat, then the indicator retreats. */
  justReconnected: boolean;
}

export function useConnectivity(): Connectivity {
  const online = useOnline();
  const [justReconnected, setJustReconnected] = useState(false);
  // Undefined until the first client read so an SSR/hydration default of
  // `online` never counts as a reconnection.
  const wasOnline = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const reconnected = wasOnline.current === false && online === true;
    wasOnline.current = online;
    if (!reconnected) return;

    setJustReconnected(true);
    const timer = window.setTimeout(
      () => setJustReconnected(false),
      RECONNECT_PULSE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [online]);

  return { online, justReconnected };
}
