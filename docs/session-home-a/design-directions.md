# Home A — two design directions for decision

**Status:** open. Both directions are built and running at `/dev/home-a`.
**Decide by:** picking one; the loser is deleted and the winner is promoted (see
*Adoption* below).

Production is untouched. `src/app/home/page.tsx` still renders the interim
`HomeAScreen.tsx`, so nothing here is user-visible until a direction is chosen.

---

## What was actually free to design

The handoff (`design-handoff.md`) pins palette, type, the shell, the stone, and
the stone's two states. Those are not in question. The axes genuinely open were
**hero, hierarchy, alignment, motion, and copy** — so that is where the two
directions differ, and the difference is a real product question rather than a
skin.

Both directions implement the identical `HomeAScreenProps` contract
(`HomeAScreen.types.ts`), so the page wiring is the same either way.

---

## The question you're deciding

> When someone has paused halfway through the 25 prompts and comes back days
> later, should the screen show them **how far they've come**, or **how easy it
> is to carry on**?

Those pull in opposite directions. One makes the work feel substantial and
countable, which motivates some people and shames others. The other makes
returning frictionless but gives up the sense of accumulation entirely.

---

## Direction 1 — "Strata"

**Position:** what you've already laid down is the hero.

The 25 prompts appear as 25 marks carrying the script's real stage seams (after
prompt 5, after prompt 17), so the shape of the remaining work is legible at a
glance with no labels at all. The count lives in the sentence — "You're twelve
moments in" — not in a `12 / 25` stat.

- Centred, on Home B's axis. Reads as the same room, one step earlier.
- Stone at 140px, `idle`. Subordinate to the band.
- Boldness spent on the band; the CTA is the only other element with weight.
- **Signature motion:** the recorded marks ink in left to right, once, 26ms
  apart, then rest. Nothing else on the screen moves.

**Argues for:** the journey is long (~12 minutes of talking across 25 prompts)
and invisible. Making the accumulation concrete is the honest way to show that
a paused user has real, kept work waiting for them.

**Costs you:** a progress display invites the chore reading. Someone at 3/25
sees mostly empty marks, and the screen quietly says *you have a lot left*.

---

## Direction 2 — "Threshold"

**Position:** progress isn't the point; coming back is.

The hero is a typographic invitation, left-aligned and editorial — a letter left
open on a desk rather than a status board. The count collapses to one line of
prose. Below a single hairline, one line names what's waiting, drawn from the
script's three real stages.

- Left-aligned, deliberately off Home B's centred axis.
- Stone at 96px, `idle`, a quiet marginal presence.
- Boldness spent on the headline, which states a condition of the work rather
  than a statistic: "Your voice is half gathered."
- **Signature motion:** the hairline draws left to right once and the line
  behind it settles in. No stagger cascade over every block.

**Argues for:** this screen's only job is to get a paused person back into the
booth. Naming what's ahead in human terms lowers the cost of the next tap more
than a tally does.

**Costs you:** the sense of accumulation is gone. A user at 22/25 gets no more
visual reward than one at 6/25, and "nearly whole" is doing a lot of work alone.

---

## What the frontend-design skill changed

Recorded because these were live calls, not style preferences:

1. **Dropped the tracked ALL-CAPS `ESSENCE` eyebrow** the interim carries
   (`HomeAScreen.tsx:38`). Caps eyebrows above headings are named as a
   generated-page tell. Home B's `.homeb__archive-head` keeps its caps label
   because it heads a real list; Home A has nothing to label.
2. **No card around the strata band.** The reflex was
   `--color-surface-card` + `--shadow-sm` + `--radius-2xl` — the SaaS-card kit.
   The band sits on the ground instead, so the CTA is the only weighted element.
3. **The count moved out of a stat and into the sentence.** A big number with a
   small label is the default treatment for exactly this screen.
4. **Uniform mark height (revision after the first browser pass).** The
   recorded marks were initially taller than the unrecorded ones, which turned
   the band into a bar chart of itself and read as an audio equalizer — the one
   cliché a voice product should avoid. Same height, fill difference only, now
   reads as a tally.
5. **Threshold's "what's ahead" line dropped from `--text-body-lg` to
   `--text-body`** — it was competing with the hero for the eye.
6. **Removed the spaced em dash** in the wait copy ("come back — it will be
   here"), the `WORD — fragment` shape. Two plain sentences.

---

## Verification

Driven in a real Chromium at **4× CPU throttle**, 390×844 mobile viewport
(`.tmp/verify-home-a.mjs`), both directions across collecting (3 and 12 clips),
building, and reduced-motion.

- No console errors in any state.
- Reduced motion collapses to the destination state with no mid-flight pose
  (verified by sampling at 360ms, mid-choreography for the motion path).
- Screenshots: `.tmp/home-a-{strata,thresh}-*.png`.

Caveat: the frame-rate probe reports ~121fps in headless, which is not a
meaningful smoothness measurement — headless rAF isn't display-locked. The
motion claim rests on the throttled screenshots and the fact that both
signature beats are opacity/transform only (compositor-friendly), not on that
number. A physical-device pass is still the real bar.

Also confirmed the handoff's narrative arc holds: `idle` is
`colorTemp: 0, glow 0.06` against Home B's `infused` at `0.6 / 0.325` plus ember
and ripple (`breathStoneEngine.ts:95`), so Home A stays visibly cool and the
warmth remains Home B's payoff.

---

## Adoption (whichever wins)

1. Rename the winner to `HomeAScreen.tsx` / `HomeAScreen.css.ts`, delete the
   loser and the `.strata` / `.threshold` suffixes.
2. Collapse `/dev/home-a` back to rendering the single winner across its states
   (keep the clip-count control — it's the useful part).
3. Wire `clipsRecorded` in `src/app/home/page.tsx`. The exact query already
   exists at `src/app/app/record/page.tsx:102`:

   ```ts
   const { count: clipsRecorded } = await supabase
     .from("training_clips")
     .select("id", { count: "exact", head: true })
     .eq("voice_profile_id", voiceProfile.id)
     .eq("status", "uploaded");
   ```

4. Pass `onContinue` / `onSettings` from the page (`ROUTES.record`,
   `ROUTES.settings`) — the screens hold no navigation.

### Open question for the owner

Neither direction shows a **first-time** Home A user anything different from a
returning one. If someone lands here at 0/25 (voice profile created, nothing
recorded), both fall back to a "Start recording" CTA, which is untested against
onboarding's hand-off. Worth confirming whether 0/25 can actually reach Home A
or whether onboarding always routes straight into the booth.
