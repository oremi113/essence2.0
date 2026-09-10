---
id: 2026-09-10-word-reveal-should-use-real-tts-timestamps
priority: P2
status: open
opened: 2026-09-10
resolved:
summary: "First Playback's word-by-word reveal is driven by a hand-timed cadence table scaled to the audio's total length, not by real per-word timings — so words drift within the line even though the line now ends on time *(found with a real voice clone, 2026-09-10)*"
---

# The word reveal is proportional, not aligned

*(found running row 33 with the owner's real voice clone)*

`src/components/screens/first-playback/FirstPlaybackScreen.cadence.ts` ·
`src/components/screens/first-playback/FirstPlaybackScreen.tsx`

The reveal timings come from `MEASURED`, a table hand-timed against **one**
reading of the §4.2 line. Measured against a real clone:

| | |
|---|---|
| Real audio (owner's voice) | **2,229 ms** |
| The table's line length | **3,600 ms** |
| Drift | **1,371 ms** |
| Last word lit | **651 ms after the voice had stopped** |

Now fixed by scaling the whole table by `realDuration / modelDuration`, read off
the `<audio>` element's `loadedmetadata`. The line ends exactly with the voice
(0 ms), and the tail is scheduled from the scaled end rather than the model's.

## What is still wrong

Scaling fixes the **total length**, not the **distribution**. Words still land
on the table's relative rhythm, stretched to fit. Any voice that pauses
differently — a slower clone, a comma held longer, a different language — will
have words lighting on the wrong syllables inside the line even though the line
starts and ends on time.

Total-length drift was the visible bug and it is gone. Per-word drift remains,
and it is the one users will feel on a screen whose entire premise is that the
words resolve *as they are spoken*.

## The prototype already said so

`prototypes/essence-step5-first-playback.html`:

> *"Offsets arrive as data, not from a stopwatch… Production replaces both paths
> with render-pipeline offsets."*

The cadence model was always a stand-in for review, because the prototype speaks
no audio. Chunk 1 ported the stand-in and wired the AnalyserNode for amplitude
but left the reveal on the table. This is the unfinished half of that port.

## Fix shape

ElevenLabs returns character-level alignment from
`POST /v1/text-to-speech/{voice_id}/with-timestamps` — a JSON body with
base64 audio plus `alignment.characters` and their start/end times. So:

1. Render via the timestamps endpoint in `ensureVoiceSample` instead of the
   plain one. Same cost — it is the same synthesis, a different response shape.
2. Collapse character alignment to word onsets and store them on the profile
   (`sample_word_offsets jsonb`, alongside `sample_line`). Needs a migration.
3. Return them from `GET .../sample/play` and prefer them in the screen, falling
   back to the scaled table when absent (pre-migration samples, and the dev page
   which has no audio at all).

Keep the table. It is what makes the dev page reviewable without spending money,
and it is the fallback when alignment is missing.

## Pick up when

Before Step 5 reaches users. The scaling makes it defensible in the meantime,
but "the words resolve as they are spoken" is the beat's whole claim, and right
now that is only true in aggregate.
