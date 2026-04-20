import { useSyncExternalStore } from 'react';

// Shared `(prefers-reduced-motion: reduce)` subscription. Previously
// duplicated inline in chrome.tsx and FirstBreathSequence.tsx; consolidated
// here so every feature that branches on motion preference reads from the
// same source of truth and reacts to system-setting changes mid-session.

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
