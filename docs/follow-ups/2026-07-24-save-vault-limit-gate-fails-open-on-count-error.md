---
id: 2026-07-24-save-vault-limit-gate-fails-open-on-count-error
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: The `/messages/save` vault-limit "race-safe security gate" ignores its count-query error and fails open — on any DB hiccup the count reads 0 and a save lands over the plan cap *(triage 2026-07-24)*
---

# `/messages/save` vault-limit "security gate" fails open on an unchecked count-query error

*(triage 2026-07-24 — discovery. NOT the same as the prior-cleared rate-limit fail-open: that one
(`countRecentEvents`) is documented and deliberate; this one is undocumented, in a different file, and
guards a plan cap the code itself labels a "security gate".)*

`src/app/api/messages/save/route.ts:104-112` — the block is documented (l.104) as the *"race-safe
security gate"* that stops a user exceeding the Vault plan limit (`STEP6_LIMITS.maxSavedMessages`,
default 3). But the count query destructures only `count`, never `error`:

```ts
const { count: savedCount } = await supabase
  .from("messages")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("status", "saved");
if ((savedCount ?? 0) >= STEP6_LIMITS.maxSavedMessages) { ... }
```

When the count query errors (RLS hiccup, transient DB/network fault) `count` comes back `null`, so
`savedCount ?? 0` is `0`, the `>= cap` check passes, and the insert proceeds — the one gate meant to be
the hard limit **silently fails open** on any DB error, and masks it (no log).

**Why it matters:** a transient DB error lets a save land over the plan cap. Low-frequency, but it's the
gate the code calls a "security gate," and unlike the deliberately-documented cost-control fail-opens
this one is silent and almost certainly unintended.

**Fix shape:** destructure and check `error` from the count query; on error, fail **closed** (return a
retryable 500 / `vault_limit_reached`) and log it, rather than proceeding with `0`. Longer term, enforce
the cap with a DB constraint so the invariant doesn't depend on a runtime count at all.

**Pick up when:** the next Step 6 / vault-limit hardening pass. One-line guard; pairs naturally with the
audio-render-cap atomicity item (`2026-07-24-audio-render-cost-cap-non-atomic-race`).
