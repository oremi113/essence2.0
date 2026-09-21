---
id: 2026-09-15-save-quota-count-read-fails-open
priority: P4
status: open
opened: 2026-09-15
summary: `/save` reads the saved-message count without checking `{ error }`, so a transient DB error makes the count read 0 and the "race-safe" vault-cap gate lets the save through — fail-open on a gate documented as the security backstop *(triage 2026-09-15)*
---

# `/save` saved-message quota fails open on a count-query error

*(triage 2026-09-15 — Step 6 spend-path review; same class as FU-85 / FU-89)*

`src/app/api/messages/save/route.ts:105-109` reads the user's saved-message count
as `const { count: savedCount } = await supabase.from("messages").select("id", {
count: "exact", head: true })…` — discarding `{ error }`. A Supabase count query
that errors returns `{ count: null, error }` without throwing, so on a transient
failure `savedCount` is null, `(savedCount ?? 0) >= maxSavedMessages` is
`0 >= 3` = false, the gate passes (`save/route.ts:110-112`), and the save proceeds
past the 3-message vault cap.

**Why it matters:** the comment on this block (`save/route.ts:104`) calls it the
"race-safe security gate" — it is the authoritative backstop behind the
client-side UX gate in `/messages/new`. A fail-open defeats exactly that role: a
momentary DB hiccup lets a user seal a 4th message. Impact is low (an over-run by
one, only during a transient error, on a lifetime cap), which is why this is P4 —
but it is a genuine fail-open on a gate whose whole purpose is to be
fail-closed, and it is the same "a read wasn't given the fail-closed treatment
writes get" root cause as FU-85 (teardown subscriptions read) and FU-89
(`useCheckout`).

**Fix shape:** destructure `{ error }` on the count query and treat a non-null
error as fail-closed — return the retryable error rather than proceeding as if the
user has zero saved messages. (The repo's `checkedWrite` lint guard covers writes,
not reads, so these read fail-opens keep slipping through — a lint rule for
unchecked count/select reads on gates would catch the class.)

**Pick up when:** next Step 6 reliability pass, or batch with the other read
fail-close fixes (FU-85 / FU-89).
