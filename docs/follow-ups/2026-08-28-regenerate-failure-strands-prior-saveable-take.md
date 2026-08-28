---
id: 2026-08-28-regenerate-failure-strands-prior-saveable-take
priority: P3
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: A failed "Regenerate" (shipping non-deferred arm) resets `audio_status` to pending in place and never restores it → the user's prior already-heard, saveable take now 409s on save behind another paid render *(triage 2026-08-28)*
---

# "Regenerate" failure strands the user's prior saveable take

*(triage 2026-08-28)*
`src/app/api/messages/regenerate/route.ts:234-243` — in the control arm (`isDeferredAudioEnabled()` is default-OFF, so this **is** the shipping path) the regenerate bump destructively overwrites the row's status before rendering the new variant:

```ts
.update({
  regenerate_count: nextCount,
  template_variant: variant.id,
  text_status: "pending",
  audio_status: "pending",   // <- clobbers the previously-succeeded take
})
```

If the new text render then fails (`:261-283`), the branch marks `text_status: "failed"` but **never restores `audio_status`** to `"succeeded"`; it returns `audioStatus: "pending"`. The row's `generated_text` / `audio_path` still point at the earlier, good take — but `/api/messages/save` requires `audio_status === "succeeded"` (`src/app/api/messages/save/route.ts:88`), so that earlier take can no longer be saved.

**Why it matters:** a user hears a take they like, taps "Regenerate" once to see an alternative, hits a transient LLM/TTS blip — and the take they *could* have saved is now unsaveable until they burn another paid render that succeeds. The prior good work is stranded behind vendor spend, on the main message-creation flow. Recoverable (retry regenerate) → P3, not data-loss.

**Fix shape:** don't destroy committed status in place on the shipping arm — either write the new variant to `candidate_*` columns the way the deferred arm already does, or roll `audio_status` back to `"succeeded"` (and `text_status` back) on both failure branches so the prior take stays saveable.

**Pick up when:** next Step 6 audio-pipeline touch, or when the deferred-audio arm is promoted (which sidesteps this by using candidates). Agent-fixable. Related cost-path items: [[2026-07-10-retry-audio-renders-paid-elevenlabs-audio-with-no]], [[2026-07-10-a-failed-message-generation-permanently-wedges-creation-the]].
