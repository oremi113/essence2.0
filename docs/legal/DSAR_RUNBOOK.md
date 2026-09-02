# DSAR runbook — handling privacy requests

**For:** whoever monitors `help@essencevault.app`
**Why it exists:** the Privacy Policy (§8) commits to handling data-subject
requests **manually** (there is no self-serve export/DSAR tool yet) and promises
to **acknowledge within 7 days** and **complete within 30 days**. This is the
process that keeps that promise. Beta scale = a handful of emails; keep it simple
and logged.

---

## 0. Intake

Requests arrive at **help@essencevault.app**, ideally with **"Privacy request"**
in the subject (the Privacy Policy tells users to do this). A request can also be
any email that, in substance, asks to access / export / correct / delete data or
withdraw consent — honor the substance, not just the subject line.

**Log every request** (a simple sheet or a labeled email folder): date received,
requester email, type, date acknowledged, date completed, what was done.

## 1. Verify identity (always, before acting)

Only act on requests that come **from the email address on the account**, or can
otherwise be confirmed to control it (e.g. reply-to-confirm from that address).
Do **not** action a deletion/export for an account based on a request from a
different email. If you can't verify, ask them to send the request from their
account email. We do not charge for requests.

## 2. Acknowledge within 7 days

Reply confirming receipt and that you'll complete within 30 days (or explain if a
lawful extension is needed). Template:

> Thanks — we've received your privacy request and will complete it within 30
> days. We may email you to confirm a detail or verify it's really you.

## 3. Fulfill, by request type

All actions are manual, via the **Supabase dashboard** (project
`idqvimiybiskposxhbor`) and the **service role**. Find the user's `auth.users.id`
by their email (Authentication → Users), then work by `user_id`.

### Access / "what do you have on me"
Report the categories we hold (all keyed to their `user_id`):
- **Profile** — `public.profiles` (name, DOB, city, state, country, photo path,
  terms-acceptance record, onboarding timestamps).
- **Voice** — `public.voice_profiles` (+ the synthetic voice model at ElevenLabs)
  and training clips in the `essence-audio` bucket under `users/<id>/`.
- **Messages** — `public.messages` (+ generated audio in `essence-audio`),
  `public.recipients` (private labels), `public.pending_generations`.
- **Consent** — `public.voice_consent_records`.
- **Usage** — `public.usage_events` (pseudonymous product analytics).
- **Billing** — held by **Stripe** (we don't store card data); point them there
  for payment records if asked.

### Export / portability
Gather the above into a readable bundle: export the user's rows (Supabase SQL
Editor → CSV/JSON per table filtered by `user_id`), and download their audio +
photo objects from Storage (or generate time-limited signed URLs). Send via a
secure link. There is no one-click export yet — this is by hand.

### Correction
Update the relevant `public.profiles` fields (or other row) for that `user_id`.

### Deletion — individual item
No self-serve per-item delete exists. To remove a specific recording or message,
delete the Storage object(s) under `users/<id>/…` **and** the corresponding
`messages` / `training_clips` row via the service role. (Messages are immutable
by trigger but can be deleted.)

### Deletion — whole account / "delete everything" / withdraw consent
The user can do this themselves in **Settings → Delete account** (immediate,
synchronous). It cancels the subscription, deletes storage + rows, and **tells
ElevenLabs to delete the voice model**. If they'd rather you do it, or self-serve
fails, run the same teardown from the dashboard. Note the Privacy Policy's honest
caveat: deleted rows **age out of routine DB backups within ~7 days**.

### Opt-out of sale / sharing / targeted ads
Not applicable — we don't sell or share personal information and run no ad
tracking. Reply confirming that, so the record shows it was addressed.

## 4. Complete within 30 days + close the log

Reply confirming what was done. Record the completion date in the log. If a
lawful extension was needed, note why.

---

## Escalate to counsel (don't answer solo) if a request

- alleges a voice was cloned **without consent**, or
- is a **law-enforcement / legal demand / subpoena**, or
- comes from an **EU/UK** resident asserting GDPR rights at any volume, or
- demands something these docs don't cover.

See the Compliance Pack's "when to retain counsel" list.
