# ESSENCE — Decline & Lapse Copy Draft

**For Oremi to edit.** Tone: warm, not punitive. No urgency-baiting. No "act now or lose." No "🚨" or capslock. The goal is to make a stressful financial moment feel held, not scolded. Treat the user like a friend whose card just got flagged at the grocery store, not a delinquent account.

**Where each piece appears in the product:**

| Trigger | Placement | Element |
|---|---|---|
| Stripe attempt #1 fails (`invoice.payment_failed`, `attempt_count = 1`) | Banner on `/app/record` (will move to `/app/home` when that exists) | Banner Variant 1 |
| Attempt #2 fails (`attempt_count = 2`) | Same banner slot | Banner Variant 2 |
| Attempt #3 fails (`attempt_count = 3`) | Same banner slot | Banner Variant 3 |
| Subscription deleted by retry exhaustion (`customer.subscription.deleted` + `cancellation_details.reason = 'payment_failed'`) | `/app/vault/restore` screen body (no banner — the vault is paused, the message is more substantial) | Restore Screen Copy |

All banners include a single CTA: **"Update card"** → opens Stripe Customer Portal in a new tab.

---

## Banner Variant 1 — first failure

> **Your card didn't go through this time.**
> Stripe will try again in a few days. You don't need to do anything yet — but you can update your card now if you'd rather.
>
> [Update card]

**Why this tone:** First failure is often a transient bank flag, an expired card the user forgot about, or a hold from travel. No reason to alarm. The "you don't need to do anything yet" is doing real work — it removes the panic spike most billing emails create.

---

## Banner Variant 2 — second failure

> **Your card didn't go through again.**
> Stripe will try once more in a few days. Updating your card now is the easiest fix.
>
> [Update card]

**Why this tone:** Two failures means it's almost certainly not a fluke. Slightly firmer nudge toward action, but still not threatening. "Easiest fix" reframes the action as helpful rather than required.

---

## Banner Variant 3 — third failure (last retry pending)

> **One more attempt before your vault pauses.**
> If this last try doesn't go through, your vault pauses until you update your card. Your messages are safe either way.
>
> [Update card]

**Why this tone:** This is the hardest one to write. The user *needs* to know consequences are coming, but the framing has to stay non-punitive. Three moves: (1) the header carries the stakes explicitly, so users skimming only the header still get the signal, (2) "your vault pauses" — soft language for what is technically subscription cancellation, kept consistent with the restore screen's metaphor, (3) "your messages are safe either way" — the most important sentence in this whole flow. People who built a vault are afraid of losing what they made. Reassure that first, then talk about the card.

---

## Restore Screen Copy — vault paused (post-lapse)

This is what loads at `/app/vault/restore` after the user taps the banner CTA — *or* what they see if they navigate to any vault route while in the lapsed state.

**Header:**
> Your vault is paused.

**Body:**
> Your messages are still here, exactly as you left them. They're not going anywhere.
>
> When you're ready to bring the vault back, updating your card is the only step.

**CTA (primary):**
> [Bring my vault back] → opens Customer Portal

**Secondary line, smaller, below the CTA:**
> Questions? Email us at [support@essence... — Oremi to fill in].

---

### Conditional rendering — `/app/vault/restore` for users without recordings

The restore screen also catches users who arrive in non-lapsed states: voluntary cancellers (when self-serve cancel ships in a future session) and trial-ended-without-conversion users. The "paused" framing works for all three states (lapsed, cancelled, trial-ended) — but the body line *"Your messages are still here, exactly as you left them"* assumes recordings exist.

For users who never recorded a clip (most likely: trial-ended without conversion), swap that line for the no-recordings variant. Render based on `recordings.count > 0` for that user.

**Body — has recordings (default):**
> Your messages are still here, exactly as you left them. They're not going anywhere.
>
> When you're ready to bring the vault back, updating your card is the only step.

**Body — no recordings (trial expired before first recording, or paid but never recorded):**
> Your vault is ready when you are. Updating your card is the only step.
>
> When you come back, your first recording will be waiting.

The header ("Your vault is paused.") and the CTA ("Bring my vault back") stay the same in both cases. Only the body swaps.

**Why this tone:**
- "Your vault is paused" — not "cancelled," not "lapsed," not "expired." Paused implies it's waiting, not gone. Same word the banners use, so a user who reads Banner 3 and then lands here feels the product using one consistent metaphor.
- "Your messages are still here, exactly as you left them" — the most important reassurance in the entire failure flow. People who built a vault built something emotionally meaningful. Loss aversion is a real driver here, but the right move is to remove the loss anxiety entirely, not exploit it.
- "They're not going anywhere" — explicit, direct. Some users will not believe the previous sentence without this one.
- "When you're ready to bring the vault back" — agency. Not "you must," not "to avoid losing access." The CTA below echoes this exact verb deliberately, so the action reads as a continuation of the reader's own thought rather than a button being thrust at them.
- "Bring my vault back" — verb framing matches the metaphor and echoes the body sentence directly above. Not "Resume subscription" (transactional). Not "Update payment" (clinical). Not "Restart" (introduces a verb the reader hasn't met yet on this screen).
- Support line at the bottom, small. Some failures have causes Stripe's portal can't fix (closed accounts, fraud disputes). The escape hatch matters but shouldn't dominate.

---

## Notes on what I deliberately didn't write

- **No countdowns or deadlines.** "Your vault will be deleted in 30 days" is the standard SaaS pattern and it's wrong for this product. ESSENCE isn't a productivity tool — it's emotional infrastructure. A countdown turns a quiet moment into a hostile one.
- **No "we're sad to see you go" / "we'd hate to lose you."** Both common in churn flows. Both feel performed. The product's tone elsewhere doesn't talk about itself; it shouldn't start now.
- **No discount or save-offer.** Some products try to convert a lapse into a discounted reactivation. ESSENCE's pricing is positioned as fair-and-permanent. A surprise discount in this moment would undermine the whole pricing posture and train users to wait for failures.
- **No mention of "founding member" status, prior promises, or any escalation language.** Even if the user is a founding member, this isn't the moment to invoke it.

---

## Follow-ups to handle in 7c

These don't block shipping the copy itself, but the 7c doc needs to handle them:

1. **Confirm Stripe Smart Retries setting before mapping banners 1–3 to attempts.** Default is up to 4 retries over ~3 weeks. Banners 1/2/3 cover the first three failed attempts; the restore screen fires after `customer.subscription.deleted` (retry exhaustion). If Smart Retries is configured for fewer attempts (e.g., 3), the lapse fires earlier. If it's configured for more (e.g., 5), there's a window where the user sees Banner 3 content for an extra past_due cycle before the restore screen kicks in. Verify the live Dashboard setting and either align Smart Retries to 4 attempts or extend the banner sequence to match.

2. **Customer Portal must be configured before banner CTAs ship.** All four banner CTAs link to the Stripe Customer Portal. If the Portal isn't configured in Stripe Dashboard → Settings → Billing → Customer portal, clicking the CTA returns a Stripe error page. The 7c prereqs section needs to enforce: enable "Update payment method," disable "Cancel subscription" (per the no-self-serve-cancel decision), set a return URL pointing back to `/app/vault/restore`.

3. **Support email needs filling in.** `support@essence...` is a placeholder. Decide the real address (and verify it's monitored) before the copy ships to production.

4. **Recordings count check for restore screen body variant.** The 7c implementation needs to query the user's recordings count and render the appropriate body block. Cheap query — likely a single COUNT against whatever table holds voice clips.
