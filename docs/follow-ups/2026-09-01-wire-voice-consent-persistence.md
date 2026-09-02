---
id: 2026-09-01-wire-voice-consent-persistence
priority: P2
status: open
opened: 2026-09-01
resolved:
owner_paired: true
summary: L2 consent gate DONE in code — own-voice-only copy, voice_consent_records table applied to prod + persistence wired. ONLY remaining item is the owner env flip VOICE_CONSENT_REQUIRED=true to enforce it for beta.
---

# Enable voice-consent enforcement for beta (env flip)

**Done (L2 Part A + B):**
- Own-voice-only consent copy (fixed a contradiction with ToS §5.4 / AUP §1),
  canonical strings + `CONSENT_TEXT_VERSION` in `consent-copy.ts`; form sends
  the version and gates its CTA on both boxes.
- `voice_consent_records` migration **applied to the remote** (project
  idqvimiybiskposxhbor, 2026-09-01); `types.ts` regenerated (linked, drift-clean).
- Service-role persistence write wired in `src/app/api/voice-profiles/route.ts`
  (records consent + version + UA/IP via `checkedWrite`).

**Remaining — owner env step (no code):**

Set `VOICE_CONSENT_REQUIRED=true` in the deployment env (Vercel → Settings →
Environment Variables, Production scope, NOT `NEXT_PUBLIC_`) and redeploy. Until
then the boxes are collected + recorded but a malformed client could still
create a profile without them. **This is what actually enforces the gate.**

**Why it matters:** ElevenLabs' terms require holding rights to every submitted
voice; the record is the evidence (done), the env flip is the enforcement
(pending). Beta-blocker per the Compliance Pack Part 1 / Part 4 (§1).

**Detail:** `docs/legal/L2_consent_persistence_RUNBOOK.md`.
