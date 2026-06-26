"use client";

/**
 * Step 8 (Home B) dev sandbox — permanent per CLAUDE.md.
 *
 * The dev rail switches the seven states the screen designs around:
 *   trial·first / trial·steady / protected·steady / protected·full(3/3) /
 *   lapsed / loading / error.
 *
 * Messages are mock (no `/api/messages` fetch); navigation + settings log
 * instead of routing. `?welcome=1` first-arrival is exercised by the
 * "trial · first" entry.
 */
import { useMemo, useState } from "react";
import { HomeBScreen } from "@/components/screens/home/HomeBScreen";
import type {
  HomeBLoadState,
  HomeBVaultState,
} from "@/components/screens/home/HomeBScreen.types";
import { mockHomeMessages } from "@/components/screens/home/mockHomeB";

type DevState =
  | "trial-first"
  | "trial-steady"
  | "protected-steady"
  | "protected-full"
  | "lapsed"
  | "loading"
  | "error";

const STATES: { key: DevState; label: string }[] = [
  { key: "trial-first", label: "Trial · first arrival" },
  { key: "trial-steady", label: "Trial · steady" },
  { key: "protected-steady", label: "Protected · steady" },
  { key: "protected-full", label: "Protected · full 3/3" },
  { key: "lapsed", label: "Lapsed" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
];

const CONFIG: Record<
  DevState,
  {
    vaultState: HomeBVaultState;
    firstArrival: boolean;
    loadState: HomeBLoadState;
    count: number;
  }
> = {
  "trial-first": { vaultState: "trial", firstArrival: true, loadState: "ready", count: 1 },
  "trial-steady": { vaultState: "trial", firstArrival: false, loadState: "ready", count: 2 },
  "protected-steady": { vaultState: "protected", firstArrival: false, loadState: "ready", count: 2 },
  "protected-full": { vaultState: "protected", firstArrival: false, loadState: "ready", count: 3 },
  lapsed: { vaultState: "lapsed", firstArrival: false, loadState: "ready", count: 2 },
  loading: { vaultState: "trial", firstArrival: false, loadState: "loading", count: 0 },
  error: { vaultState: "trial", firstArrival: false, loadState: "error", count: 0 },
};

export default function HomeBDevPage() {
  const [state, setState] = useState<DevState>("trial-first");
  const cfg = CONFIG[state];
  const messages = useMemo(() => mockHomeMessages(cfg.count), [cfg.count]);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <HomeBScreen
        key={state}
        vaultState={cfg.vaultState}
        messages={messages}
        loadState={cfg.loadState}
        listError={state === "error" ? null : undefined}
        onRetry={() => console.log("[dev/home-b] retry preview fetch")}
        firstArrival={cfg.firstArrival}
        onCreate={() => console.log("[dev/home-b] create → /messages/new")}
        onRestore={() => console.log("[dev/home-b] restore → /app/vault/restore")}
        onOpenShelf={() => console.log("[dev/home-b] open shelf → /app/shelf")}
        onOpenMessage={(id) => console.log("[dev/home-b] open message", id, "→ /app/shelf")}
        onWaitlist={() => console.log("[dev/home-b] waitlist → /messages/waitlist")}
        onSettings={() => console.log("[dev/home-b] settings → Step 9 (dead-link until M3)")}
      />

      <DevRail current={state} onSelect={setState} />
    </div>
  );
}

function DevRail({
  current,
  onSelect,
}: {
  current: DevState;
  onSelect: (s: DevState) => void;
}) {
  // Collapsed by default so the rail never sits over the screen on a phone-
  // width window. The toggle lives bottom-right (clear of the screen's gear
  // top-right and Next's devtools bottom-left); the panel opens upward and
  // auto-collapses on selection so you immediately see the result.
  const [open, setOpen] = useState(false);
  const currentLabel = STATES.find((s) => s.key === current)?.label ?? current;

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            right: 16,
            width: 220,
            maxHeight: "70vh",
            overflowY: "auto",
            background: "#16140F",
            border: "1px solid #2E2A22",
            borderRadius: 12,
            padding: 12,
            fontFamily: "'SF Mono', Monaco, monospace",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            zIndex: 101,
          }}
        >
          <div
            style={{
              color: "#C9A86A",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Home B · dev rail
          </div>
          {STATES.map(({ key, label }) => {
            const active = key === current;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelect(key);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: active ? "#C9A86A" : "none",
                  color: active ? "#16140F" : "#BDB6A6",
                  fontWeight: active ? 600 : 400,
                  border: "1px solid transparent",
                  borderRadius: 7,
                  fontFamily: "inherit",
                  fontSize: 12,
                  padding: "8px 10px",
                  marginBottom: 4,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          maxWidth: 220,
          background: "#16140F",
          color: "#C9A86A",
          border: "1px solid #2E2A22",
          borderRadius: 9999,
          padding: "10px 16px",
          fontFamily: "'SF Mono', Monaco, monospace",
          fontSize: 12,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          zIndex: 101,
        }}
      >
        {open ? "✕ close" : `⚙ ${currentLabel}`}
      </button>
    </>
  );
}
