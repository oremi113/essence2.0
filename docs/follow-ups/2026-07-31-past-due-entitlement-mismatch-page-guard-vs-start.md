---
id: 2026-07-31-past-due-entitlement-mismatch-page-guard-vs-start
priority: P3
status: open
opened: 2026-07-31
resolved:
summary: "Voice-creation entitlement omits `past_due` while the processing page guard admits it - a still-paying dunning user is let onto the screen then 402d with \"Start your free trial\" *(triage 2026-07-31, salvaged from the monolith 2026-09-21)*"
---

# Voice-creation entitlement omits `past_due`, but the processing/reveal page guards admit it — a still-paying (dunning) user is let onto the screen and then 402'd with "Start your free trial"

*(triage 2026-07-31 - originally written into the legacy `docs/FOLLOW_UPS.md`
monolith by PR #123, which never landed. Salvaged into the per-file ledger on
2026-09-21 and verified to have no existing per-file entry before copying.)*

**Files:** `src/lib/voice-creation/entitlement.ts:12-13` (`VOICE_CREATION_ALLOWED_STATUSES = {trial, active}`, 402 copy at `:36`) vs `src/app/app/voice/processing/page.tsx:52-66` (only `none`→paywall, `lapsed`/`cancelled`→restore; `past_due` falls through and proceeds to render the actions that call `/start`).
**Why it matters:** A subscriber whose card is failing (Stripe `past_due`, still inside the retry window, still entitled) who returns to finish or retry a not-yet-`ready` voice is *allowed onto* the processing screen by the page guard, then the `/start` call rejects them with a 402 whose message reads "Start your free trial to create your voice" — wrong and disorienting for someone who already paid. The two layers disagree on whether `past_due` is entitled.
**Why P3 not P2:** gated behind `VOICE_CREATION_REQUIRES_PAYMENT` (currently OFF) and only reachable when the voice isn't `ready` **and** the user is mid-dunning — narrow — but it's a real latent page-guard/entitlement mismatch on a paid path.
**Fix shape (owner-paired — subscription semantics):** decide `past_due`'s entitlement once and apply it in both places — either add `past_due` to `VOICE_CREATION_ALLOWED_STATUSES` (grace during dunning, matching the page guards) or bounce `past_due` at the page rather than letting it reach `/start`.
**Pick up when:** paired with flipping `VOICE_CREATION_REQUIRES_PAYMENT` on (see #22) — resolve the two together.
