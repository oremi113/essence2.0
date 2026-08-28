---
id: 2026-08-28-generation-offline-note-misplaced-in-exhausted-state
priority: P4
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: "GenerationScreen's failed-state offline note is pinned under the primary button and hardcodes \"Your note is kept\" → in the exhausted case it explains the wrong (enabled) button and mis-describes the skip path *(triage 2026-08-28)*"
---

# GenerationScreen offline note is attached to the wrong button (and wrong copy) in the failed state

*(triage 2026-08-28)*
`src/components/screens/messages/GenerationScreen.tsx:182-207` — in the `failed` state the offline note (`OfflineActionNote`, gated only on `!online`) is always rendered directly beneath the **primary** button. Two problems fall out of that fixed placement:

1. **Wrong button in exhausted mode.** After the 3-attempt ceiling the network action moves to the *secondary* button ("Try once more", `disabled={exhausted && !online}` at `:203`) while the primary becomes "Reach us…" — a `mailto:` (`MessagesNewPageClient.tsx:56`) that works fine offline (`disabled={!exhausted && !online}` = enabled). So when the user is offline at the ceiling: the note "you're offline, try again once you're back online" sits under the button that *works* offline, and the greyed-out retry button that is *actually* blocked gets no explanation at all. The screen contradicts itself exactly when a stuck user needs clarity.
2. **Wrong reassurance on the skip path.** `OFFLINE_ACTION_COPY.generate` (`src/components/system/OfflineActionNote.tsx:20`) hardcodes "Your note is kept", but the failed-state copy deliberately branches on `hasNote`: the skip path (no note) says "Nothing is lost" precisely because there is no note (`GenerationScreen.tsx:68-73,84-86`). An offline user who skipped the note is told their note was saved. *(The copy constant is flagged "provisional pending the consolidated Step 10 copy pass", so the wording half may be swept up there; the placement logic in #1 is not.)*

**Why it matters:** small self-contradictions on an error screen erode trust at the worst moment. Low blast radius (only offline + failed, and #1 only offline + 3-attempt-exhausted) → P4.

**Fix shape:** render `OfflineActionNote` beneath whichever button is the network-retry (primary in retry mode, secondary in exhausted mode), and pick the offline copy by `hasNote` (a note-kept vs nothing-lost variant) rather than hardcoding "Your note is kept."

**Pick up when:** the consolidated Step 10 copy pass, or the next GenerationScreen touch — do the placement fix even if the copy pass owns the wording. Agent-fixable; UI, so verify in-browser. Sibling of the offline surface behind FU-80.
