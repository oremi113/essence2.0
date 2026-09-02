# Beta invite email (canonical)

The invite for the invite-only closed beta. Send it individually to each
invitee (URL-control beta: no allowlist, so keep the link off public channels).
Personalize the greeting per person.

**Before sending anyone this, confirm:**
1. Sign-in works end-to-end on prod — `https://essencevault.app/auth/callback`
   is in Supabase → Authentication → URL Configuration → Redirect URLs, and a
   real click of a magic link lands you signed in (not back on the prompt).
2. Prod env: `VOICE_CONSENT_REQUIRED=true`; Stripe flags off (beta is free).
3. A fresh backup snapshot has been taken (`node scripts/backup-snapshot.mjs`).

---

**Subject:** A first look at ESSENCE

Hi [name],

I'm Oremi. I founded ESSENCE. I'd like you to be one of the first to try it.

ESSENCE preserves your voice. You read a few short prompts aloud. It keeps the way you actually sound. Everything stays in a private vault. Only you can reach it. Nothing is ever sent to anyone.

A few honest things first:

- It's an early beta. Expect rough edges.
- It may lose data. Don't add anything you couldn't bear to lose.
- It's free. No card, no charge.
- Your own voice only.
- Joining means you agree to the beta terms: https://essencevault.app/beta-terms

To start: https://essencevault.app/auth/sign-in. Enter your email. You'll get a sign-in link.

Then tell me what you think. What felt good. What felt confusing. What you wished it did. Your honest reaction is why I'm sharing it this early.

Just reply here, or email help@essencevault.app anytime.

Thank you,
Oremi
Founder, ESSENCE
