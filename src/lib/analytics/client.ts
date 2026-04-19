/**
 * Client-side analytics — fire-and-forget POST to /api/analytics.
 *
 * Uses navigator.sendBeacon when available so events fire even if the
 * page is unloading (e.g. user taps "Skip" which immediately advances
 * the route, or closes the tab during a sequence). Falls back to fetch
 * with keepalive for environments where sendBeacon is unavailable.
 *
 * NEVER throws — analytics failure must not break the user's flow.
 *
 * Server enforces an action allowlist by prefix (see /api/analytics).
 */

const ENDPOINT = "/api/analytics";

export function track(action: string, meta?: Record<string, unknown>): void {
  if (typeof window === "undefined") return; // SSR safety

  const payload = JSON.stringify({ action, meta });

  try {
    // sendBeacon survives page unload; the body is queued by the browser.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
    // Fallback — keepalive lets a fetch outlive a navigation.
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Swallow — best-effort.
    });
  } catch {
    // Swallow — best-effort.
  }
}
