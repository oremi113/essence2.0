---
id: 2026-09-21-settings-shows-a-trial-to-users-with-no-subscription
priority: P2
status: resolved
opened: 2026-09-21
resolved: 2026-09-21
summary: "RESOLVED 2026-09-21 - Settings rewrote `none` to `trial`, so a signed-in user with no subscription was told they were on a free trial and offered to cancel one that did not exist *(found cross-referencing a prod screenshot against the DB)*"
---

# Settings told a never-subscribed user they were on a free trial

*(found 2026-09-21 by comparing the owner's production Settings screenshot
against the `subscriptions` table)*

The owner's account had **no voice profile and no subscription row**. Settings
showed a full plan card: a "Voice Vault - Trial" pill, "Free trial", "Your card
won't be charged until then. After that it's $12.99 a month", a "Payment
method - No card on file" row, and a **Cancel subscription** row.

`src/app/app/settings/page.tsx:105`:

```ts
// `none` shouldn't reach Settings (the arc captures a card before processing);
// fall back to trial so a stray state never renders an alarming plan card.
const status: SubscriptionStatus = record.status === 'none' ? 'trial' : record.status;
```

`getSubscriptionStatus` was correct - it returned `none`. The page overwrote it.

## Why the coercion existed

`SettingsScreen.types.ts` declared its own `SubscriptionStatus` union **without
`none`**, under a comment claiming it "matches the backend". It did not. The
screen could not represent "never subscribed", so the page had to pick some
other member, and picked `trial`. A second coercion sat in `planVariant()`,
whose `default:` also fell through to `trial`.

## Why it mattered

The assumption in that comment - that `none` "shouldn't reach Settings" - is
false. **Every user passes through `none` between signing up and paying**, and
Settings is reachable from the tab bar the whole time. So the product told
people they were on a trial they had not started, showed no card on file as
though something were wrong, and offered to cancel a subscription that did not
exist. Tapping Cancel opened the cancel sheet and called the cancel action with
nothing to cancel.

It also fully explains the "No card on file" oddity from the same screenshot:
there was no payment method because there was no subscription.

## Resolved - 2026-09-21

- `none` added to the screen's status union, and the comment corrected to say
  what keeping the two unions in step actually requires.
- `planVariant()` maps `none` to its own variant instead of defaulting to trial.
- The page passes `record.status` through unchanged.
- A **no-vault-yet** plan card: pill "Voice Vault - Not yet", "Nothing is kept
  here yet.", "Keep your voice and it will live here. $12.99 a month, after a
  7-day free trial." - empty-vault tense throughout (copy guide s7: future
  tense for contents, present only for the commitment). No payment row, no
  cancel row.
- CTA "Keep my voice" -> `ROUTES.vaultProtect` via a new `onKeepVoice` prop.
  Deliberately NOT `onResume`, which routes to the RESTORE arc and would be the
  wrong destination for someone who never subscribed. The row is omitted
  entirely when no handler is wired, rather than rendering a dead button.
- Row label is "Your voice", not "Voice Vault" - the pill already spends the
  screen's one allowed use of the vault name (copy guide s5).
- `/dev/settings` gains a "No vault yet" variant per the permanent-scaffolding
  rule, wired to log the Card Capture route.

Covered by `tests/unit/settings-no-vault-yet.test.tsx` (7 cases: no trial
claimed, no cancel row, the honest line, the future tense, the CTA fires, the
CTA is omitted when unwired, and the real trial card still renders). The cancel
assertions are scoped to the plan card's rows because the cancel sheet is
always mounted in the DOM.

## Noticed while verifying, not fixed here

The Settings trust band reads "Your voice and your messages are yours. They
stay safe here..." to a user who has neither. Same class of presumption, a
different surface, and a deliberate reassurance band rather than a state
readout - worth an owner call rather than a quiet edit.
