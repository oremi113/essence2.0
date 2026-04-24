# ESSENCE — Step 5: Message Creation Flow
## Screen Inventory for Wireframing (V1)

**Purpose of this doc:** The single source of truth for Step 5 wireframing. Architecture decisions are locked. V1 = Vault tier only. Use alongside `ESSENCE_Step5_Architecture_LOCKED.md` for the technical contract.

**Status:** Ready to wireframe.

---

## V1 POSITIONING — IMPORTANT CONTEXT

**The product is voice insurance.** Vault preservation of the user's voice is the core value. The 3 messages are a bolt-on, not the main event. Step 5 should feel like "a nice thing you can do with your preserved voice," not the climax of the product. The Vault Reveal moment (Step 4) carries the emotional weight of the purchase.

This reframe affects tone throughout Step 5:
- The 3-message cap is value-add framing ("the three included with your Vault"), not scarcity framing ("you've used up three")
- Hitting the cap should feel like a calm ceiling, not a wall
- The waitlist moment is about future expansion and FOMO, not unblocking pent-up demand
- Message creation is celebratory, not transactional

---

## SCOPE

**In scope for V1:**
- Vault tier only ($12.99/month, 3 lifetime messages, voice preserved indefinitely)
- The 6-screen creation flow
- The "you've shaped your three" moment with waitlist capture
- Critical system states inside the flow

**Out of scope (V2 / waitlist):**
- Legacy tier in any form
- Scheduling
- Monthly message allowances
- Occasion reminders
- Guardian tier
- Multi-recipient sends
- Free-form long messages
- Custom user-defined categories
- Post-save editing
- Occasion-triggered entry from notifications

---

## LOCKED ARCHITECTURE ASSUMPTIONS

These shape every screen below. Wireframes must reflect them.

1. **Personal note is one optional input field, 200 char cap.** Single line, category-specific prompt, equally weighted Skip CTA.
2. **Generation has perceptible latency.** Loading state should feel intentional, not anxious.
3. **Audio plays on arrival at Preview.** No "tap to hear" gate. Audio is ready when the user lands. (Note: confirm browser autoplay reality during build — may require one-tap play.)
4. **Regenerate is one tap, capped at 3.** Cap state uses soft language, not a hard wall.
5. **Save Confirmation does not handle audio wait state.** Audio already exists.
6. **Failure states are designed first.** Success states fall out from them.
7. **Emotional moments get high-fidelity treatment.** First listen, save confirmation, vault appearance. Functional screens get standard treatment.

---

## CORE FLOW

```
ENTRY
  ↓
1. Recipient Setup (who is this for + relationship)
  ↓
2. Category Selector (shaped by recipient)
  ↓
3. Personal Note (optional, 200 char)
  ↓
4. Generation (text + audio in sequence)
  ↓
5. Preview & Refine (listen, regenerate, save)
  ↓
6. Save Confirmation (ceremonial close)
  ↓
EXIT → Memory Shelf or Home B
```

Six anchor screens. Recipient leads because relationship shapes tone across every category. Everything else is a variation, a state, or a ceiling moment layered on this spine.

---

## SECTION A — CORE SCREENS (the 6 anchors)

### A1. Entry Point (trigger, not a screen)
- From Home B "Create a message" CTA
- From Memory Shelf empty state
- From "Create another" after a save
- *Not a wireframe deliverable.*

### A2. Recipient Setup
**Purpose:** Who is this for?

**Content:**
- Recipient name field
- Relationship picker (daughter, son, partner, parent, grandchild, friend, other)
- Returning user: list of existing recipients with "+ Add new"
- Breath Stone in Ready state

**Variations:**
- A2.a — First-ever recipient (no list, soft "Who's this first message for?" framing)
- A2.b — Returning user (list + add new)
- A2.c — Adding a new recipient (fresh form)

### A3. Category Selector
**Purpose:** Choose the emotional theme.

**Content:**
- 7 categories: Birthday, Encouragement, Daily Reminder, A Message for the Future, Comfort, Holiday, Just Checking In
- Recipient name surfaces at top ("For Sarah") for context continuity
- Short emotional descriptor per category
- Breath Stone in Ready state

**Variations:**
- A3.a — Message 1 or 2 of 3 (no count surfaced, feels open)
- A3.b — Message 3 of 3 (gentle "this is the last of your three included messages" framing — value-add tone, not scarcity)

### A4. Personal Note
**Purpose:** The user's only creative input. Treat it accordingly.

**Content:**
- Single optional input field, 200 char max
- Category-specific prompt copy (final wording lands after the validation task)
- Equally weighted Skip and Continue CTAs
- Subtle character counter
- Breath Stone in Ready state

**Variations:**
- A4.a — Empty state (default)
- A4.b — User typing
- A4.c — Skipped (routes to Generation with template's default insert, no LLM call)

**Visual prominence:** This is the user's primary creative input. Don't bury it. The screen should feel inviting, not like a form field.

### A5. Generation
**Purpose:** Text and audio are being generated in sequence. Latency is real (LLM call + ElevenLabs call).

**Content:**
- Breath Stone in Working state
- Calm copy ("Shaping your message…")
- No progress bar, no percentage, no countdown

**Variations:**
- A5.a — Standard
- A5.b — Failed (single warm retry CTA)

*No "taking longer than usual" state in V1. Build it after launch when there's real latency data.*

### A6. Preview & Refine
**Purpose:** User hears the message in their voice for the first time. The emotional hook of the message creation flow.

**Content:**
- Audio plays on arrival (or one-tap play if autoplay is blocked)
- Playback control (play / pause / scrub)
- Full transcript visible
- Breath Stone in Playback state during play
- Three actions: **Save**, **Regenerate**, **Discard**
- Subtle indication of regenerations remaining (visual, not numeric counter)

**Variations:**
- A6.a — First listen (untouched)
- A6.b — After regenerate (same UI, new content, regenerations remaining decremented)
- A6.c — Regeneration cap reached (Regenerate CTA softens; user can save, edit note, or discard)
- A6.d — Discard confirmation (soft modal: "Discard this message? Your voice will remain preserved.")

**Edit note path:** Available as secondary action ("Reshape your note") that routes back to A4 with note pre-filled. Counts as a fresh generation, not a regeneration.

### A7. Save Confirmation
**Purpose:** Quiet ceremonial close. Message is preserved.

**Content:**
- Breath Stone in Infused or soft Celebrate state
- Calm copy ("Your message is safe.")
- Two CTAs: "Create another" and "View on Memory Shelf"

**Variations:**
- A7.a — Standard save (message 1 or 2 of 3)
- A7.b — Message 3 of 3 saved → triggers C1 (Three Shaped + Waitlist Moment)

---

## SECTION B — CEILING MOMENT & WAITLIST

This is where V2 features get teased. Two distinct screens, both calm, both FOMO-flavored without being pushy.

### C1. Three Shaped (after message 3 saved)
**Purpose:** Acknowledge that the user has shaped their three included messages. Voice remains preserved. Introduce what's coming.

**Form:** Full-screen ceremonial moment after A7, before return to Home B.

**Content:**
- Breath Stone in Infused state
- Acknowledgment ("You've shaped your three messages")
- Reaffirm core value ("Your voice remains preserved in your Vault")
- Soft transition to what's next ("More ways to use your voice are coming")
- Single primary CTA: "See what's coming" → routes to C2 (Waitlist)
- Soft secondary: "Back to Home"

**Tone:** Celebratory ceiling, not blocked wall. The user got what they paid for. The waitlist is a "look ahead," not a sales pitch.

### C2. Waitlist (V2 features preview + email opt-in)
**Purpose:** Generate FOMO for V2 features. Capture email signal on which features matter most.

**Form:** Full-screen, feels like a quiet announcement.

**Content:**
- Headline framing ("Coming to ESSENCE")
- Concrete feature list — named explicitly to drive specificity:
  - More messages each month
  - Schedule messages for future dates
  - Birthday and occasion reminders
  - Multiple voice profiles (parents, partners, others you love)
  - Longer, story-form messages
- Email opt-in field (most users will already have an email on file — surface it pre-filled with a single "Notify me" CTA)
- Optional: simple "which matters most to you?" multi-select to capture signal
- "Back to Home" exit option

**Tone:** Coming soon. Building this with care. Your voice is preserved either way.

### C3. Vault Limit Reached (attempting message 4 after the three are shaped)
**Purpose:** Gentle block. Re-surface the waitlist for users who want more.

**Form:** Replaces A2 when user taps "Create a message" with three already saved.

**Content:**
- Calm framing ("You've shaped your three messages. Your voice remains preserved.")
- Reminder that more is coming
- "See what's coming" CTA → routes to C2 (Waitlist)
- "Back to Home" exit

**Note:** This is the ongoing experience for capped users. C1 is the one-time ceremony.

---

## SECTION D — SYSTEM STATES (V1)

Per LOCKED doc, build only what's critical. Defer the rest.

### D1. Generation states (inside A5)
- Generating
- Failed → single warm retry

### D2. Audio states (inside A6)
- Playback failed → warm message, retry available

### D3. Save states (around A7)
- Saving
- Save failed → warm retry

### D4. Tier blocking
- Vault limit reached → see C3
- Payment lapsed → flow blocked, warm reactivation prompt (uses existing payment lapsed treatment)

### D5. Discard
- Soft confirmation modal (see A6.d)

**Deferred to post-launch:**
- Extended "taking longer than usual" delayed states
- Network/offline messaging beyond basic save retry
- Trial expiring banners inside the flow

---

## SECTION E — WHAT'S NOT IN STEP 5

Belongs elsewhere. Do not bleed into wireframing:
- Memory Shelf views (Step 7)
- Message playback from Shelf (Step 7)
- Recipient management (Settings)
- Tier/plan management (Settings)
- Trial / billing UI (separate flow)

---

## SCREEN COUNT FOR WIREFRAMING

**Anchor screens:** 6
- Recipient Setup
- Category Selector
- Personal Note
- Generation
- Preview & Refine
- Save Confirmation

**Ceiling and waitlist:** 3
- Three Shaped (C1)
- Waitlist (C2)
- Vault Limit Reached (C3)

**System states:** ~5 critical
- Generation failed
- Audio playback failed
- Save failed
- Vault limit reached (= C3)
- Discard confirmation

**Realistic V1 wireframe count:**
- ~9 unique screen layouts
- ~14–16 total screens once variations and states are included

---

## BUILD ORDER (suggested passes)

Designed so you're never blocked waiting on the personal note validation task.

**Pass 1 — Anchor spine (no dependencies):**
1. A2 Recipient Setup
2. A3 Category Selector
3. A5 Generation
4. A7 Save Confirmation

**Pass 2 — Ceiling and waitlist (parallel, no dependencies):**
5. C1 Three Shaped (highest fidelity — this is the most emotionally weighted ceiling moment)
6. C2 Waitlist (highest fidelity — this is the data capture screen, copy matters)
7. C3 Vault Limit Reached

**Pass 3 — After validation task lands:**
8. A4 Personal Note (validation task informs prompt copy and visual treatment)
9. A6 Preview & Refine (validation task informs regenerate vs edit-note balance)

**Pass 4 — States:**
10. System states (D1–D5)
11. Discard confirmation modal

That order keeps the highest-stakes screens (C1, C2, A6) for when you have the most context, and lets the spine work happen in parallel with the validation task.
