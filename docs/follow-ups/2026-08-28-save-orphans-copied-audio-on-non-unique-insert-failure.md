---
id: 2026-08-28-save-orphans-copied-audio-on-non-unique-insert-failure
priority: P4
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: "`/api/messages/save` only cleans up the copied permanent audio object on a `23505` conflict; any other insert failure leaves the copy orphaned, and the retry mints a new path → slow storage-cost leak on the main save path *(triage 2026-08-28)*"
---

# `/save` orphans the copied audio object on a non-unique insert failure

*(triage 2026-08-28)*
`src/app/api/messages/save/route.ts:132-185` — the audio-promotion flow mints a fresh `messageId = randomUUID()` per attempt, derives `permanentPath` from it, **copies** the pending object to `permanentPath`, then inserts the `messages` row. Cleanup of the copied object only happens on the concurrent-winner branch:

```ts
if (insertError?.code === "23505") {
  await service.storage.from(AUDIO_BUCKET).remove([permanentPath]).catch(() => {});
  …return winner…
}
logError({ event: "step6_save_insert_failed", … });
return NextResponse.json({ …retryable: true }, { status: 500 });  // <- copy left behind
```

On **any other** insert error the route returns 500 retryable without removing the copy. Because the retry generates a *new* `messageId` → a *new* `permanentPath` → a *new* copy, the earlier copy is never reclaimed.

**Why it matters:** every transient (non-unique) insert failure on save permanently orphans an mp3 in the audio bucket — a slow storage-cost leak on the main save path. Low severity (small files, only on the transient-failure path) → P4, but it's real and unbounded over time.

**Fix shape:** remove the copied object on *any* insert failure (not just `23505`) before returning, **or** derive `permanentPath` deterministically (e.g. keyed to `source_generation_id`) so a retry overwrites the same object instead of duplicating it.

**Pick up when:** next Step 6 save/storage touch, or a storage-hygiene pass. Agent-fixable. Related storage-wipe pagination gap: [[2026-07-10-account-delete-storage-wipe-caps-each-prefix-at]].
