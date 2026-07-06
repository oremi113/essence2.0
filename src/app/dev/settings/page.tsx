"use client";

/**
 * Step 9 (Settings & Trust) dev sandbox — permanent per CLAUDE.md.
 *
 * The rail switches every state the screen designs around: the six subscription
 * variants, the three system views (content / loading / error), the delete-in-P1
 * gate, the card-updated notice, and the async result of the two fallible
 * effects (email change, account delete) so you can walk to the "check your
 * inbox", "account closed", and "delete couldn't finish" surfaces.
 *
 * Navigation + effects log to the console; the async callbacks resolve ok/fail
 * from the rail toggles so every terminal is reachable without a backend.
 */
import { useMemo, useState } from "react";
import { SettingsScreen } from "@/components/screens/settings/SettingsScreen";
import type {
  SubscriptionData,
  SubscriptionStatus,
} from "@/components/screens/settings/SettingsScreen.types";
import {
  mockSubscription,
  mockSubscriptionAnnual,
} from "@/components/screens/settings/mockSettings";

type SubKey =
  | "trial"
  | "active-monthly"
  | "active-annual"
  | "past_due"
  | "lapsed"
  | "cancelled";
type SystemKey = "content" | "loading" | "error";

const SUBS: { key: SubKey; label: string }[] = [
  { key: "trial", label: "Trial" },
  { key: "active-monthly", label: "Active · monthly" },
  { key: "active-annual", label: "Active · annual" },
  { key: "past_due", label: "Past due" },
  { key: "lapsed", label: "Lapsed" },
  { key: "cancelled", label: "Cancelled" },
];

const SYSTEMS: { key: SystemKey; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
];

function subFor(key: SubKey): SubscriptionData {
  if (key === "active-monthly") return mockSubscription("active");
  if (key === "active-annual") return mockSubscriptionAnnual();
  return mockSubscription(key as SubscriptionStatus);
}

export default function SettingsDevPage() {
  const [sub, setSub] = useState<SubKey>("trial");
  const [system, setSystem] = useState<SystemKey>("content");
  const [deleteEnabled, setDeleteEnabled] = useState(true);
  const [cardNotice, setCardNotice] = useState(false);
  const [deleteSucceeds, setDeleteSucceeds] = useState(true);
  const [emailSucceeds, setEmailSucceeds] = useState(true);
  const [trustSeen, setTrustSeen] = useState(false);

  const subscription = useMemo(() => subFor(sub), [sub]);
  const loadState = system === "content" ? "ready" : system;

  return (
    <div style={{ minHeight: "100dvh" }}>
      <SettingsScreen
        // Remount only on system-view change so the arrival replays on
        // loading→content but NOT on a subscription-state switch (matches the
        // prototype: dev-rail state switches do not re-arrive).
        key={system}
        email="rosa.mendez@example.com"
        photoUrl={null}
        authMethod="magic-link"
        subscription={subscription}
        notifications={{ trialReminders: true, paymentNotices: true }}
        loadState={loadState}
        loadError={system === "error" ? null : undefined}
        cardUpdatedNotice={cardNotice}
        deleteEnabled={deleteEnabled}
        trustBandSeen={trustSeen}
        onBack={() => console.log("[dev/settings] back → /home")}
        onRetry={() => console.log("[dev/settings] retry fetch")}
        onTrustBandSeen={() => console.log("[dev/settings] trust band seen → latch settings_trust_seen")}
        onUpdateCard={() => console.log("[dev/settings] update card → Stripe hosted card sheet")}
        onCancelSubscription={async () => {
          console.log("[dev/settings] cancel subscription");
          return { ok: true };
        }}
        onResume={() => console.log("[dev/settings] bring it back → /app/vault/restore")}
        onDismissCardNotice={() => setCardNotice(false)}
        onToggleNotification={(key, next) =>
          console.log("[dev/settings] toggle", key, "→", next)
        }
        onChangeEmail={async (e) => {
          console.log("[dev/settings] change email →", e, "ok:", emailSucceeds);
          return emailSucceeds
            ? { ok: true }
            : { ok: false, error: "We couldn't send the link just now. Try again in a moment." };
        }}
        onRemovePhoto={async () => {
          console.log("[dev/settings] remove photo");
          return { ok: true };
        }}
        onSignOut={() => console.log("[dev/settings] sign out → /auth/sign-in")}
        onDeleteAccount={async () => {
          console.log("[dev/settings] delete account, ok:", deleteSucceeds);
          return { ok: deleteSucceeds };
        }}
        onReturnToSignIn={() => console.log("[dev/settings] return to sign in → /auth/sign-in")}
      />

      <DevRail
        sub={sub}
        system={system}
        deleteEnabled={deleteEnabled}
        cardNotice={cardNotice}
        deleteSucceeds={deleteSucceeds}
        emailSucceeds={emailSucceeds}
        trustSeen={trustSeen}
        onSub={setSub}
        onSystem={setSystem}
        onToggleDelete={() => setDeleteEnabled((v) => !v)}
        onToggleCard={() => setCardNotice((v) => !v)}
        onToggleDeleteResult={() => setDeleteSucceeds((v) => !v)}
        onToggleEmailResult={() => setEmailSucceeds((v) => !v)}
        onToggleTrustSeen={() => setTrustSeen((v) => !v)}
      />
    </div>
  );
}

function DevRail(props: {
  sub: SubKey;
  system: SystemKey;
  deleteEnabled: boolean;
  cardNotice: boolean;
  deleteSucceeds: boolean;
  emailSucceeds: boolean;
  trustSeen: boolean;
  onSub: (s: SubKey) => void;
  onSystem: (s: SystemKey) => void;
  onToggleDelete: () => void;
  onToggleCard: () => void;
  onToggleDeleteResult: () => void;
  onToggleEmailResult: () => void;
  onToggleTrustSeen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = SUBS.find((s) => s.key === props.sub)?.label ?? props.sub;

  const heading = (text: string) => (
    <div
      style={{
        color: "#C9A86A",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        margin: "12px 0 6px",
      }}
    >
      {text}
    </div>
  );

  const railBtn = (active: boolean, onClick: () => void, text: string) => (
    <button
      key={text}
      type="button"
      onClick={onClick}
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
      {text}
    </button>
  );

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 64,
            right: 16,
            width: 226,
            maxHeight: "78vh",
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
          <div style={{ color: "#C9A86A", fontSize: 11, letterSpacing: "0.14em" }}>
            SETTINGS · DEV RAIL
          </div>

          {heading("Subscription")}
          {SUBS.map((s) =>
            railBtn(s.key === props.sub && props.system === "content", () => {
              props.onSub(s.key);
              props.onSystem("content");
              setOpen(false);
            }, s.label),
          )}

          {heading("System")}
          {SYSTEMS.map((s) =>
            railBtn(s.key === props.system, () => {
              props.onSystem(s.key);
              setOpen(false);
            }, s.label),
          )}

          {heading("Toggles")}
          {railBtn(props.deleteEnabled, props.onToggleDelete, `Delete in P1: ${props.deleteEnabled ? "on" : "off"}`)}
          {railBtn(props.cardNotice, props.onToggleCard, `Card-updated notice: ${props.cardNotice ? "on" : "off"}`)}
          {railBtn(props.deleteSucceeds, props.onToggleDeleteResult, `Delete effect: ${props.deleteSucceeds ? "succeeds" : "fails"}`)}
          {railBtn(props.emailSucceeds, props.onToggleEmailResult, `Email effect: ${props.emailSucceeds ? "succeeds" : "fails"}`)}
          {railBtn(props.trustSeen, props.onToggleTrustSeen, `Trust band: ${props.trustSeen ? "slim (seen)" : "full (first visit)"}`)}
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
          maxWidth: 226,
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
        {open ? "✕ close" : `⚙ ${props.system === "content" ? label : props.system}`}
      </button>
    </>
  );
}
