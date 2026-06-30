# Step 9 · Settings & Trust — copy corrections (Pass 1 audit)

Three copy fixes from the Pass 1 audit of `essence-step9-settings-trust.html`.
All three are **copy-only** — no layout, no token, no structural change. Line
numbers reference the prototype file as audited. Each replaces the system's
framing with what the person actually controls, and tightens the screen back
under the once-per-screen "vault" lock (COPY LOCK, prototype lines 28–29).

---

## 1 · "Password" row → "Sign-in"  (prototype lines 830–833)

The account is magic-link only (`authMethod: 'magic-link'`). There is no
password, so "Password" names a thing that doesn't exist, "We'll email you a
secure link" describes the system rather than the person, and "Change" has no
coherent target — you're already signed in, and there's nothing to change.

**Before**
```
Label   Password
Value   We'll email you a secure link
Action  Change
```

**After (recommended)**
```
Label   Sign-in
Value   We email a secure link each time — no password to remember
Action  (none — remove the button)
```

**Terser fallback**, if the row should match the Email row's shape and keep an action:
```
Label   Sign-in
Value   We email a secure link each time
Action  Email me a link
```
Only use the fallback if "Email me a link" does something real (re-auth /
device check). If it would no-op, drop the action — a control that does nothing
is worse than no control.

**Why:** name things by what people recognize, not how auth is built. The
"no password to remember" clause turns a confusing row into a quiet
reassurance, which is on-brand for this screen.

---

## 2 · Cancelled pill — "Active" → "Open"  (prototype line 785)

"Active until July 14" sits directly above body copy that says "You've
cancelled." Calling a cancelled subscription "Active" is mildly
self-contradictory. "Open" keeps the same promise (access continues) without
the contradiction, and reads warmer.

**Before**
```
pill-main  Your messages are safe
pill-sub   Voice Vault · Active until July 14
```

**After**
```
pill-main  Your messages are safe
pill-sub   Voice Vault · Open until July 14
```

**Why:** removes the active/cancelled contradiction. "The door stays open" is
already the footer's metaphor (line 794), so "Open until July 14" rhymes with
the warmth the state is going for. Length is unchanged — no layout risk.

---

## 3 · Unified restore CTA — one verb for one action

The same action has two button labels across two adjacent states:

- Lapsed (line 775):    `Bring it back`
- Cancelled (line 792): `Bring your vault back`

An action keeps one name through the flow. Standardize on **"Bring it back"**
in both states. This also drops the second "vault" mention on the cancelled
screen (pill already carries "Voice Vault"), bringing it back under the
once-per-screen lock.

**Before**
```
Lapsed     <button>Bring it back</button>
Cancelled  <button>Bring your vault back</button>
```

**After**
```
Lapsed     <button>Bring it back</button>
Cancelled  <button>Bring it back</button>
```

### Bundle with it: the lapsed body line (prototype line 772)

Unifying the CTA fully resolves *cancelled* under the vault lock, but *lapsed*
still doubles "vault" — pill "Voice Vault · Paused" + body "Your vault is
paused." Reword the body so "it" refers back to the pill:

**Before**
```
Your vault is paused. You can bring it back whenever you're ready.
```

**After**
```
It's paused for now. You can bring it back whenever you're ready.
```

**Why:** "it" inherits the subject from the pill, the warmth ("whenever you're
ready") is untouched, and the screen now carries "vault" exactly once — in the
pill, as the lock intends. Cancelled body (line 789) already avoids "vault", so
no change needed there.

---

## Status

All three (plus the lapsed body reword) are **applied in the prototype** as of
the Pass 2 build. This note is the rationale of record; mirror it exactly when
porting to production `SettingsScreen` (the prototype is the source of truth per
CLAUDE.md). Port-side open items live in
[`Step9_Settings_Port_Handoff.md`](./Step9_Settings_Port_Handoff.md).
