# Review — threads 01 / 03 / 04 and the owner UX pass

**Reviewed:** `thread-01-correctness.md`, `thread-03-craft.md`,
`thread-04-promotion.md`, `review-02-owner-ux-pass.md`
**Date:** 2026-09-18
**Verdict:** threads 1 and 3 are strong and their values stand, with one defect
(§B1). **Thread 4 must not run as written** — see §A.

Everything below was checked against `src/app/globals.css`,
`HomeAScreen.strata.css.ts` and `HomeBScreen.css.ts`, not against the thread
prose.

---

## §A — Thread 4 (promotion): three corrections before it runs

Promotion is the one pass whose mistakes are durable. Two of its three headline
items are already done in the repo, and the third would codify an invention over
a shipped convention.

### A1. The `--shadow-mineral` "conflict" does not exist in the repo

Thread 4 §4 calls this "the one real conflict" and asks for it to be retired
centrally. `src/app/globals.css:56`:

```css
--shadow-mineral: 0 4px 14px rgba(110, 80, 40, 0.20);
/* primary-action lift — warm-keyed for the app's warm grounds
   (re-keyed 2026-06-12, FOLLOW_UPS #40: the old teal rgba(74,107,126,.3)
   predated the live --color-mineral and cast bluer than the buttons it sat under) */
```

**The repo already carries the warm value, and already records that the teal was
retired.** The `_ds/…/colors_and_type.css` export is a stale snapshot from before
FOLLOW_UPS #40. Thread 4 quotes that file's own header — *"Source wins if it
drifts — regenerate from it"* — and then treats the drifted copy as a peer.

**Action: regenerate the export. Repo-side work is zero.**

**The risk if it runs as written** is a PR that edits `globals.css` to match a
stale file, or that "retires the conflict" by reintroducing the teal into six
live consumers of `--shadow-mineral`.

### A2. §5.1 is already done

`--color-text-secondary-strong: #5A5A5A` is in `globals.css` with the comment
*"supporting text on warm surfaces — clears AA where -secondary dips below
4.5:1."* Same cause as A1: the export is stale, not the source.

The only real action is dropping Home A's local `<helmet>` declaration. Thread 1
was right to add it locally and right to flag it; it just isn't a promotion.

### A3. §5.3 would codify an invention over the shipped convention

This is the consequential one. **Both shipped homes already use an identical
arrival pattern:**

| | Home B (`HomeBScreen.css.ts:334-341`) | Strata (`.strata.css.ts:170-177`) |
|---|---|---|
| duration | `620ms` (`--hb-ad`) | `620ms` |
| distance | `translateY(14px)` | `translateY(14px)` |
| easing | `var(--ease-page)` | `var(--ease-page)` |
| fill | `both` | `both` |
| resting | `.arr { opacity: 1 }` | `.arr { opacity: 1 }` |
| stagger | 80 / 150 / 220 / 300 | 80 / 160 / 240 |

Thread 3 §4.5 changed Home A to **800ms, `translateY(8px)`, stagger 0 / 100 /
200**. Thread 4 §5.3 then proposes promoting those, saying *"what is missing is
the named pattern and the 8px distance."*

**14px is already the pattern, in two files.** Promoting 8px / 800ms / 0-100-200
would make every future screen diverge from both shipped homes — and it breaks
thread 4's own rule 2, *promote only what was proven*. The new numbers were
invented in thread 3, not argued for; the thread notes the stagger change only as
"back on the 0 / 100 / 200 stagger grid," which is a grid no shipped screen uses.

**Action:** revert Home A to `620ms` / `translateY(14px)` / 80-160-240, then
promote *that* as the named pattern. If 800ms is genuinely better, it is a craft
argument to make against Home B as well — not something to enter the system
through a promotion pass.

Two details to carry into the promoted card, both currently missing:

- **`.arr { opacity: 1 }` as the resting state.** Both screens set it so content
  never flashes hidden when the animation doesn't run. A promoted pattern that
  starts at `opacity: 0` reintroduces that bug everywhere.
- **Home B's heavier first-arrival variant** (760ms; 120/360/520/700/880). Any
  promoted pattern has to accommodate it or it is wrong on day one.

### A4. §5.2's owner call — tokens or component spec?

**Component spec, not tokens.**

`--progress-track-height` would have exactly one consumer, which violates thread
4's own §8 (*"do not add tokens for values that appear once in one screen"*). The
band is a composite — height, boundary inset, three-state track colour, fill —
which is a component, not a value.

The repo already has the precedent: `.record-stage-map` lives in `globals.css` as
a component class. Put the band beside it.

Thread 4 is right that the system must say explicitly that **dots (ambient
onboarding progress) and the band (staged journey progress) are two different
idioms**. That note belongs with the component, not in the token file.

---

## §B — Thread 1 (correctness): one defect

### B1. The CTA is now 17px, which is off the type scale

Thread 1 §4.1 moved the CTA from 16px to **17px**, citing *"canon: 17px Inter
600."* That is the external design-system doc. The repo scale is:

```
48 / 36 / 28 / 20 / 18 / 16 / 15 / 14 / 12
```

**There is no 17px token.** Strata's CTA is `font-size: var(--text-body-lg)` =
**18px** (`.strata.css.ts:143`); `.step3-cta` uses `--text-ui` = 15px.

Thread 3 §4.4 then ran an off-token sweep and put *every spacing value* on the
scale — but did not apply the same test to type, so this survived both passes.

**Action: `--text-body-lg` (18px)**, which is also what is already on the branch.

Worth noting the shape of it: thread 1 fixed an off-token *typeface* and
introduced an off-token *size* in the same edit. The `button { font-family:
inherit }` finding (§5.4) is excellent and correct — promote it.

### B2. Minor — `role="status"` on the paused pill

`role="status"` is a live region. The pill is static content at load, so it
announces nothing then (correct), but it will fire on every harness state change
and it is not a status in the ARIA sense. `role="status"` is the right role for
thread 2's **offline** banner. On the pill it is noise. Low priority.

### B3. Everything else in thread 1 stands

The banner-into-flow fix, the contrast table, the three `role="progressbar"`
segments with 5/12/8 maxima and `aria-hidden` labels, and the decision against a
second sr-only summary are all correct and measured. The contrast values match
the repo's own token comments (CTA white on `#656B73` = 5.38:1). No changes.

---

## §C — Thread 3 (craft): two notes, no defects

### C1. `overflow-y: auto` is superseded

Thread 3 §4.6 took `overflow-y: auto` on the content column so 130% text + banner
scrolls rather than clips, and handed the collapse question to thread 2.

**Owner call 2 answered it** (`owner-calls-2-4-5.md`): the banner never collapses,
and the scroll region **excludes the action block**, which pins. Thread 3's fix
scrolls the CTA and sign-out along with everything else, which is the part that
had to change. Restating here so it is not re-derived.

Note that owner call 4 also removes sign-out from every register, which shortens
the action block and buys back some of the 92px.

### C2. The em-relative type base — agree, don't promote, but don't drop it silently

Thread 4 §6 is right that it is a single-screen technique. Two things to add:

**It must not port into the TSX either.** Production reads dynamic type from the
browser and OS; a base pegged by `renderVals()` is a harness device. The coded
screen uses the px tokens and is verified at real browser zoom and real iOS text
size — not a simulated 130%.

**But the concern underneath it is real and would otherwise vanish.** Thread 3
proved the screen overflows by 92px at 130% with a banner. Dropping the technique
must not drop the finding. That is a system-wide question — the repo's type scale
is px throughout — and it needs a FOLLOW_UPS entry, not silence.

### C3. Everything else in thread 3 stands

The pill-not-headline demotion, card 5 as the 18px anchor, 40px/32px around the
stone, honey on the current segment only, the 10px band with a boundary inset,
and the two owner calls taken in §4.1 and §4.2 are all well argued. The band's
boundary rationale — *the empty track is 1.20:1 and no light track on cream can
reach 3:1* — is exactly the kind of reasoning that should survive into the
component card, as thread 4 §5.2 says.

---

## §D — Owner UX pass: two notes

**The grade reasoning is right and should survive into the sign-off.** "Gap to A
is the stone, and it is not in your gift" correctly attributes the ceiling to
FOLLOW_UPS #35. Say it in the sign-off rather than letting the grade absorb it.

**One omission is still unowned.** *"Focus order is correct by accident… Write it
down."* Thread 1 did ARIA but not focus order; thread 3 changed the composition;
nobody claimed it. With the banner now in flow and sign-out being removed, the
order changes again. **Owner: whoever codes it** — assert it in the dev harness.

---

## §E — Unowned across all four threads

Carried so none of these become the hole nobody remembers:

| item | owner |
|---|---|
| p95 frame time, 390×844 at 4× throttle, via `.tmp/verify-home-a.mjs` | **me, in the repo.** Every thread owes it; none can produce it. |
| Focus order, written down and asserted | me, with the code |
| Dynamic type at 130% — the 92px overflow as a system question | new FOLLOW_UPS entry |
| FOLLOW_UPS #105 — `getOrCreateVoiceProfile` row selection | blocks the page layer |
| FOLLOW_UPS #35 — stone warmth | gates the grade, own chunk |
| FOLLOW_UPS #75 — placeholder support address | now load-bearing: failed sub-state 3 needs a real mailto |

---

## Summary

| thread | verdict |
|---|---|
| 1 — correctness | Strong. One defect: 17px CTA is off-scale → `--text-body-lg`. |
| 3 — craft | Strong. No defects. Two supersessions to record. |
| 4 — promotion | **Hold.** Two items already done in the repo; one would codify an invention. Re-brief before running. |
| owner UX pass | Sound. One omission still unowned (focus order). |

The single most valuable correction is **A3** — everything else is recoverable in
a later pass, but a promoted arrival pattern that disagrees with both shipped
homes propagates into every screen that comes after.
