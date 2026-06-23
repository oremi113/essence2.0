# ESSENCE Copy & Voice Guide

A working reference for writing UI copy across every ESSENCE screen. Built from the voice already established in the onboarding flow, the recording flow, the decline copy, and the master spec. Use it when building any new prototype so the words stay as consistent as the design tokens.

---

## 1. The voice in one line

ESSENCE sounds like a steady, warm person sitting beside you, not a product talking at you. It guides without rushing, reassures without performing, and treats the user's voice as something precious that is being cared for.

If a line could appear in a productivity app or a churn email, it is wrong for ESSENCE.

---

## 2. The five principles (the spine)

Every piece of copy should pass all five.

1. **Warm, not sentimental.** Tender is right. Syrupy is not. Say the true thing simply and let it land. "That's you. Clear, steady, familiar." carries more weight than any adjective pile.
2. **Steady, not urgent.** No countdowns, no "act now," no pressure. The product never raises its voice, even when a card fails or a trial ends.
3. **Guiding, not instructing.** Lead the user gently through each step. "Take a breath. We'll start here." not "Complete the following steps."
4. **Plain, not poetic.** Short sentences, simple vocabulary, real speech. The product is built to be heard aloud by older listeners, so the writing inherits that clarity even on screen.
5. **The product never talks about itself.** No "we're so glad you're here," no "we'd hate to see you go," no brand cheerleading. ESSENCE points at the user and the people they love, never at ESSENCE.

---

## 3. Who is listening

Adults 45 to 70, often thinking about people they love rather than themselves. They are not death-prepping. They are doing something forward-looking and a little brave. Write to someone intelligent, emotionally grown, and slightly cautious about technology. Never talk down. Never over-explain what is obvious. Never assume the worst about why they are here.

---

## 4. The three registers

This is the single most important structural rule in the product. Ceremony is rationed on purpose. If everything is sacred, nothing is.

| Register | Where it lives | How it sounds |
|---|---|---|
| **Elevated** | Card capture (the turn and the seal) and the first-listen Reveal. Four moments maximum across the entire lifecycle. | Ceremonial, weighted, still. "Your Voice Vault. This is where your voice is preserved." |
| **Calm** | Home, archive, settings, reminders, post-purchase, card-capture body (price, safety terms), most error states. | Practical, warm, factual. "Your message is safe." |
| **Silent** | Onboarding, voice training, first playback, message creation, delivery. | The ceremony is implied, not named. Plain guiding language only. |

Before writing any screen, decide which register it lives in. Most screens are Calm or Silent. Elevated is rare and should feel rare.

**Where the Elevated moments live now.** Loss framing, the paywall, and seal confirmation all sit inside the card-capture flow, which puts 3 of the 4 Elevated moments in one place. The first-listen Reveal is the 4th. Card-capture body copy (price, safety terms) stays Calm, not Elevated, so a cautious reader can actually read the terms. Ceremony is rationed to Beat 1 (the turn) and the seal.

**Loss framing deployment.** Loss framing is allowed but strategic and minimal. Only at card capture, only as the turn, only after value and endowment are established, never a cold open. Soft, stated as a truth, not a threat. Never the word "lose." This reconciles with Section 8: failure flows still never use "you will lose." Loss framing is a single, earned, ceremonial moment at the paywall, not a tone available across the product.

---

## 5. Word-level rules

### Never use these

- "Error," "Failed," "Something went wrong," "Critical issue," "System malfunction"
- "Version," "patch," "update number," or any build language
- "Act now," "Don't miss out," "Last chance," "Hurry," urgency baiting of any kind
- "We're sad to see you go," "We'd hate to lose you," any churn-flow cliche
- "Unlock," "Upgrade now," "Premium," hard SaaS sales verbs in ceremonial moments
- Exclamation points in ceremonial or sensitive copy. Used almost never anywhere.
- Emoji and capslock, anywhere

### Reach for these instead

- **Preserved, kept, held, safe, cared for** for the voice and the vault
- **Paused** for vault lifecycle states (a paused vault is waiting, not gone), never cancelled or expired. "Cancel" is allowed only for the payment method or the trial itself, where "pause" would be inaccurate. Sanctioned use: "Cancel anytime" in trial risk-reversal microcopy.
- **Shape, create, share** for messages
- **Gentle, steady, clear, warm, familiar** as the emotional vocabulary
- **Take your time, when you're ready, no rush** for pacing
- Specific verbs over generic ones. "Hear your voice," "Seal my vault," "Bring my vault back," not "Continue," "Submit," "Confirm"

### The "your voice" rule

The voice is referred to as "your voice," "your preserved voice," or "voice record" through onboarding, voice training, and recording. "Vault" debuts at card capture (the paywall), which now precedes the Reveal. "Voice Vault" and protection language first appear there. From card capture onward, "Voice Vault" appears once per screen maximum. If it would appear twice on one screen, swap the second instance for "your voice." If a third, delete one.

### The empty-vault tense (honesty)

At card capture, the voice does not exist yet (it is generated after payment). Copy must not imply the voice already exists or is already inside the vault.

- **Future tense** for contents: "your voice will live here," "your voice is on its way."
- **Present tense** only for the commitment or protection: "sealed," "protected," "your place is secured."

The first time the voice is real is the Reveal. Nothing before it should claim otherwise.

---

## 6. Sentence and structure mechanics

- **Sentence case everywhere** except eyebrow labels, which are ALL CAPS with wide letter spacing ("YOUR VOICE," "STAGE 1 OF 3," "MOMENT 5 OF 25").
- **Short lines.** Headlines break into two or three short lines for the staggered reveal. "Your voice. / Clear, warm, / unmistakably yours."
- **Italic is reserved for human asides and coaching notes**, written in Spectral. The whispered last line before an action: "Take a breath. We'll start here." Functional microcopy like "11 to 14 minutes" stays upright, never italic.
- **One idea per line.** Body copy reveals in chunks, so each chunk should be a complete, self-contained thought.
- **End soft.** Closing lines should sound like something the user could actually say out loud. "The one they would want to keep." not "Begin your preservation journey today."
- **Hold the peak before the next line.** Ceremonial payoff lines hold on screen before wait copy replaces them. The seal line "Sealed. Your voice is on its way." holds about 2.5s after the seal settles, before "Preparing your voice." crossfades in. Wait copy never crossfades in under two seconds or it steps on the peak. This is a copy-pacing rule, not only a motion one.

---

## 7. Buttons and CTAs

There is a strict three-tier button language. Match the word to the weight of the action.

- **Primary button** is the one committed forward action per screen. Mineral fill, sentence case, never all-caps. Use a specific verb tied to the moment: "Hear your voice," "Begin Stage 1," "Seal my vault," "Create a message."
- **Secondary / link button** is for everything that is not the forward action. Skip, back, pause, dismiss, "not now," "maybe later." Quiet by default.
- **Never** use "Submit," "Continue," or "Begin" when a more specific verb exists for that exact moment. "Continue" is acceptable only when the action genuinely is just "move to the next thing" with no emotional content.

For the card-capture commit, "Keep my voice" is the model primary CTA. If the CTA instead names the vault ("Seal my vault"), the value line must not also say "Voice Vault" (once-per-screen rule). "Keep my voice" keeps the single Vault mention in the value line, which is why it is the default there.

Opt-outs stay gentle and judgment-free. "Maybe later" and "Not now" are the house style for declining, never "No thanks" or "Skip for now."

---

## 8. Error and failure tone

Friction must never break the atmosphere. Even when something fails, the user should feel the product is still caring for their voice.

Structure of any error message:

1. **State what happened, plainly and without blame.** "Your card didn't go through this time."
2. **Reassure about what is safe.** "Your messages are safe either way." This sentence does the most work in the whole product. Lead with it whenever loss anxiety is possible.
3. **Offer one easy next step.** A single clear CTA, never a wall of options.

Pacing of consequence, from the real decline copy:

- First failure: no alarm. "You don't need to do anything yet."
- Second failure: slightly firmer, still kind. "Updating your card now is the easiest fix."
- Final warning: stakes go in the header so a skimmer still gets it, the consequence stays soft ("your vault pauses"), and reassurance comes immediately after ("your messages are safe either way").

What never appears in a failure flow: countdowns, deadlines, "you will lose," discounts to win you back, founding-member guilt, or any language that turns a quiet moment into a hostile one.

---

## 9. The money voice (stewardship, not sales)

ESSENCE is positioned as preservation infrastructure, not a messaging utility. The pricing voice follows.

- **Stewardship over selling.** Tier indicators read as quiet care, never as a paywall. "Cold storage stewardship," "your voice is covered," not "Premium plan."
- **Protection framing.** The user pays to keep something safe, not to unlock features. "Protection keeps it available." "Your voice deserves to be kept safe."
- **No comparison grids, no pressure ladders.** Expansion is behavioral and quiet. A lapsed user is never shamed and the door is always open. "When you're ready to bring the vault back."
- **Annual is the gentle default**, presented without hard-sell urgency.
- **Ceremony and paywall stay separate.** The emotional moment is never the moment you are also asking for money in the same breath.

**Trial framing.** Trial risk-reversal reads as calm microcopy beneath the CTA, never a pill, never a countdown:

> 7 days free. Nothing today. Cancel anytime.

Pair it with a trial-ending reminder before the day-8 charge and a reachable cancel path. Annual stays the gentle default, framed in human terms ("about $10 a month to keep your voice safe"). Ceremony and the price ask stay in separate beats.

**Example labeling (honesty).** When a generic voice sample is shown (the pre-paywall quality proof), it must be clearly labeled as an example from another person or family, never implied to be the user's own result. The user's own voice is only ever surfaced after it exists.

- Honest: "Hear what a preserved voice sounds like. An example, from another family."
- Not honest: anything that lets the example read as theirs.

---

## 10. The voice in practice

Real lines from the prototypes, grouped so you can match register and reuse the cadence. Ordered roughly along the lifecycle.

**Recognition and arrival**
- "Your voice. Clear, warm, unmistakably yours."
- "Not a recording. Not a memory. Your voice, captured as it is today."
- "That's you. Clear, steady, familiar."

**Settling and pacing**
- "Take a breath. Let it settle."
- "This is the voice your family knows. The one they hear when they think of you."
- "Take a breath. We'll start here."

**Guidance and setup**
- "Let's start with simple moments."
- "Speak naturally, like telling a story."
- "You're all set."

**Recognition at the paywall (Calm into Elevated)**
- "That's your voice."
- "Twenty-five prompts, in your own words. The hard part's done."

**The turn (Elevated, the loss frame)**
- "Right now, it's only a recording. A beginning, not something kept."

**Seal confirmation at card capture (Elevated, empty-vault tense)**
- "Sealed. Your voice is on its way."
- Holds about 2.5s before the wait copy replaces it (see Section 6).

**The Reveal (Elevated, rare)**
- "Your Voice Vault. This is where your voice is preserved."
- "For now, it's being kept with care."
- "Your voice is protected. Your Voice Vault is sealed."

**Working and waiting**
- "Your voice is being preserved. A moment while we shape it."
- "Shaping your message."
- "Preparing your voice." (the Processing happy-path line, replaces the seal line once the wait begins)
- No progress bars, no percentages, no countdowns. The stone does the waiting.

**Close and continuity**
- "Your message is safe."
- "Take your time. When you're ready, you can create a message for someone you love."
- "Your voice endures."

**Failure, handled with care**
- "Your card didn't go through this time."
- "Your messages are safe either way."
- "When you're ready to bring the vault back."
- "Still confirming your payment. There's no need to pay again. We'll seal your Vault the moment it comes through." (payment confirming, success not yet known, never offer re-pay)
- "Taking longer than usual. You can keep this open, or we'll email you the moment your Vault is sealed." (extended wait; sequential to the line above, never co-rendered, or the second "your Vault" swaps to "your voice")
- "Your Vault is sealed and your voice is safe. It's taking a little longer to prepare than usual. We'll have it ready soon." (post-seal wait, the seal already fired, never un-seal, never ask for a retry)
- "You can keep this open, or we'll let you know the moment your voice is ready to hear." (notify handoff)
- "Your Vault is sealed and your voice is safe. We're making sure it gets created, and we'll reach out within a day." (support tail; "within a day" is a placeholder until ops sets a staffable number)

Note on the post-seal lines: "Your voice is safe" is present tense by design. It refers to the preserved recording and the commitment, not the generated result, which is still "on its way." That keeps it consistent with the empty-vault tense.

---

## 11. Pre-ship copy checklist

Run every new screen through this before it ships.

- [ ] Could this line live in a productivity app? If yes, rewrite it.
- [ ] Which register is this screen in, and does the copy match? (Most are Calm or Silent.)
- [ ] Sentence case everywhere except eyebrow labels?
- [ ] Does the primary button use a specific verb tied to this exact moment?
- [ ] Any banned words? (error, failed, version, urgency, churn cliches)
- [ ] If loss is possible, does a reassurance line come first?
- [ ] Is "Vault" used correctly for this point in the journey, and no more than once on screen?
- [ ] If this screen is card capture or later, is the empty-vault tense honored? (Nothing implies the voice exists before the Reveal.)
- [ ] If a sample voice is shown, is it labeled as an example, not the user's own?
- [ ] Read it aloud. Does it sound like a calm person, or like software?
- [ ] No exclamation points, no emoji, no pressure.

---

*This guide describes the voice as it already exists in the ESSENCE prototypes. When in doubt, pull the closest real line from Section 10 and match its cadence rather than writing fresh.*

*Updated 2026-06-22 with the card-capture (Step 3) edits folded in: the ten from the copy-guide update handoff plus the four reconciled from the Step 3 build handoff and motion spec.*
