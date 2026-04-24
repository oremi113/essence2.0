# ESSENCE MASTER SPECIFICATION V5.2

**The Single Source of Truth for Product, Design, and Architecture**

**Status:** In Progress — Chapter-by-Chapter Update  
**Last Updated:** April 21, 2026  
**Version:** 5.2

**V5.2 Changelog:**
- New: V1 Launch Scope section (precedes Part One). Single source of truth for what ships in V1 vs what is deferred to v2.
- V1 ships Vault tier only as a paying tier. Legacy and Guardian remain in the spec as architectural and strategic targets but are deferred behind a waitlist signal at the message-3 cap moment.
- All 7 message categories ship in V1 to gather usage signal on which categories drive engagement.
- Source: ESSENCE_Step5_Architecture_LOCKED.md (April 2026) + V1 scope discipline pass.

**V5.1 Changelog:**
- Chapter 8 expanded to include locked V1 generation architecture (text generation method, audio generation timing, regeneration scope)
- Chapter 8 adds V1 personal note input scope decision (single optional field, 200 char cap)
- Chapter 8 adds explicit v2 deferrals (free-form long input, custom categories, multi-recipient, scheduling)
- Chapter 8 adds cost basis section

---

## DOCUMENT PURPOSE

This specification defines the structural, emotional, and architectural foundation of ESSENCE. It is the binding document between product philosophy, system design, and monetization logic.

**Canonical References:**
- Pricing: ESSENCE Pricing Architecture V3.0 (sole source of truth for all pricing)
- Design: ESSENCE MINERAL & WARMTH Design Handoff
- Voice Vault: ESSENCE Voice Vault Concept V3

**What this document covers:**
- Product philosophy, terminology, and metaphor system
- Emotional arc tied to primitive lifecycle
- Design system (palette, typography, motion, components)
- Breath Stone behavior system
- Home states, CCY flow, message templates, archive
- Edge cases and error handling

**What this document does not cover:**
- Screen-by-screen UI copy (lives in prototypes)
- Specific CTAs, labels, and body text (lives in prototypes)
- Exact Breath Stone pixel sizes per screen (lives in prototypes)
- Pricing details beyond structural references (lives in Pricing Architecture V3.0)

---

# V1 LAUNCH SCOPE

This section is the single source of truth for what ships in V1 versus what is deferred to v2. It supersedes any chapter-level implication that a feature is "live" without the explicit V1 marker below. When a chapter (e.g. Chapter 11 on tiers, Chapter 8 on templates) describes the full architecture, that architecture is the long-term target. This section governs what is actually built and shipped in the V1 product.

**V1 Framing:** Pre-revenue, pre-launch. V1 is a learning instrument. The job of V1 is to validate two bets cheaply: (1) people will pay $12.99/month for ESSENCE Vault, and (2) the personalization layer is what drives retention and willingness to pay. Every scope decision below is in service of running that test with the smallest possible build.

---

## V1.1 Tiers

| Tier | V1 Status | V1 Behavior |
|------|-----------|-------------|
| **Vault ($12.99/mo)** | **Ships** | Sole paying tier. 7-day trial. 3 lifetime messages. Cold storage stewardship. Archive access. Full hybrid generation per Chapter 8. |
| **Legacy ($19.99/mo)** | **Deferred (waitlist)** | Architecture present in data model and pricing config but not wired to a live upgrade flow. At the message-3 cap moment, the user sees a warm waitlist invitation instead of an upgrade screen. Waitlist signups are the validation signal for whether to build Legacy in v2. |
| **Guardian ($29.99/mo)** | **Deferred (waitlist)** | Not surfaced in V1. Multi-voice intent triggers a waitlist invitation, not a product offering. |

**Why Legacy is waitlisted, not built:** Legacy adds three things to Vault: higher message allowance, scheduling, and occasion reminders. Scheduling and occasion reminders each require meaningful infrastructure (job runners, timezone handling, notification systems, recipient date capture). Building that infrastructure pre-validation is a poor use of pre-launch engineering time. The waitlist at the message-3 moment generates the demand signal without the build cost.

**Message-3 cap behavior in V1:** When a Vault user creates their third message, they receive a warm message acknowledging the moment and inviting them to join a waitlist for expanded message creation. No upgrade CTA, no Legacy comparison. Tone matches the existing "quiet stewardship" voice. The waitlist must capture: user ID, timestamp, optional reason for wanting more (free text, optional).

---

## V1.2 Message Generation (per Chapter 8)

| Element | V1 Status | Notes |
|---------|-----------|-------|
| Hybrid text generation (templates + LLM-handled insert) | **Ships** | Per 8.7.1. Anthropic Claude Haiku for cost. |
| Audio generation on every preview | **Ships** | Per 8.7.2. |
| Regeneration cap of 3 (configurable) | **Ships** | Per 8.7.2. |
| Regeneration via new template variant | **Ships** | Per 8.7.3. |
| Service boundary separation (text vs audio) | **Ships** | Per 8.7.4. |
| Generation logging | **Ships** | Per 8.7.5. Most important V1 data asset. |
| Personal note: single optional field, 200 char cap | **Ships** | Per 8.8. |
| Free-form long-form input | **Deferred (v2)** | Waitlist signal: count of users who request longer input. |
| Multi-recipient messages | **Deferred (v2)** | |
| Custom user-defined categories | **Deferred (v2)** | |
| Scheduling / future-dated delivery | **Deferred (v2)** | Tied to Legacy tier. |
| Occasion reminders | **Deferred (v2)** | Tied to Legacy tier. |
| Post-save editing | **Not building** | Blocked by immutability rule (Chapter 2). |

---

## V1.3 Message Categories

**All 7 categories ship in V1.** Birthday, Encouragement, Daily Reminder, A Message for the Future, Comfort, Holiday, Just Checking In.

**Rationale:** V1 needs to learn which categories users actually reach for. Shipping all 7 from launch means every category has equal opportunity to surface in the data. Cutting categories pre-launch would bias the signal. Each category requires only 2–3 template variants in V1 (variant pool expansion is post-launch content work).

**What this means for content workload:** 7 categories × 2–3 variants each × relationship variants = a manageable but real content task. This is the rate-limiting input for V1, not engineering. Template authoring should begin in parallel with wireframing.

**Future categories (deferred):** Life advice, memory anchors, gratitude reflections, guided breathing, milestone messages (graduation, wedding). These are added based on V1 signal, not pre-built.

---

## V1.4 Archive (per Chapter 9)

| Element | V1 Status |
|---------|-----------|
| Message list with cards (recipient, category, preview, duration, date) | **Ships** |
| Default sort: most recent first | **Ships** |
| Filtering by recipient, category, date | **Defer to fast-follow** (ships in V1.1 if needed; not a launch blocker) |
| Message detail view with playback, transcript, actions | **Ships** |
| Empty state | **Ships** |
| Tier indicators (Vault count) | **Ships** |
| Continuity Hub features (gentle reminders, voice care prompts, seasonal templates, reflection prompts) | **Defer to v2** |

---

## V1.5 Settings & Trust (per Chapter 3 Step 9)

| Element | V1 Status |
|---------|-----------|
| Account basics (email, password, plan visibility) | **Ships** |
| Subscription management (cancel, update payment, view trial status) | **Ships** |
| Notification preferences (basic toggle set) | **Ships** |
| Voice ownership reassurance copy | **Ships** |
| Voice export | **Defer to v2** |
| Legal flows (formal data deletion, GDPR/CCPA tooling beyond minimum) | **Defer to v2 unless legally required at launch** |

---

## V1.6 System States (per Chapter 12 + Step 8 prototype)

| Element | V1 Status |
|---------|-----------|
| Loading states (text generation, audio generation, save) | **Ships** |
| Recording errors (mic denied, mic unavailable, recording failed) | **Ships** |
| Network/connection states (offline, lost connection, reconnected) | **Ships** |
| Auth states (session expired, payment lapsed) | **Ships** |
| Voice processing states | **Ships** |
| "Taking longer than usual" delayed second-tier states | **Defer until launch latency data exists** |
| Storage full / upload queued | **Defer** |
| Account suspended | **Defer** |

---

## V1.7 Continuity & Engagement

| Element | V1 Status |
|---------|-----------|
| CCY (Continue Capturing Your Voice) for Home A | **Ships** |
| CCY post-completion enrichment moments on Home B | **Defer to v2** |
| Push notifications | **Defer to v2** unless required for trial conversion mechanics |
| Email engagement sequences | **Ships in minimal form** (welcome, trial expiring, payment failed only) |

---

## V1.8 What V1 Validates

V1 must produce signal on:

1. **Activation rate.** What percentage of card-capture users complete all 25 prompts and reach Vault Reveal?
2. **First-message rate.** Of users who reach Home B, what percentage create message #1?
3. **Personal note engagement.** Of message creations, what percentage include a personal note?
4. **Regeneration behavior.** How often do users regenerate? Where do they hit the cap?
5. **Category usage.** Which of the 7 categories drive the most message creation?
6. **3-message ceiling behavior.** Of users who hit message #3, what percentage join the Legacy waitlist?
7. **Trial-to-paid conversion.** What percentage of trial users convert to paying Vault?
8. **Vault retention.** What is monthly churn on Vault subscribers?

These signals govern v2 scope. Every V1 build decision should ask: "does this help us learn the answer to one of these questions?" If not, defer.

---

## V1.9 Explicit Non-Goals for V1

- Building Legacy or Guardian as live tiers
- Scheduling infrastructure
- Notification system beyond minimum auth/billing
- Multi-recipient sends
- Free-form long-form personalization input
- Custom categories
- B2B positioning (per Pricing V3.0)
- Founding member discounts (per Pricing V3.0)
- Free tier (per Pricing V3.0)
- Public pricing comparison grid
- Voice export and full data portability tooling
- Continuity Hub engagement features

---

# PART ONE: FOUNDATION

## CHAPTER 1. PRODUCT PURPOSE AND PHILOSOPHY

### 1.1 Mission

ESSENCE preserves a person's voice as a living keepsake.

Users create a **voice record** that can support future messages, memories, comforts, and moments of connection.

### 1.2 Core Promise

**Your voice is something only you can give.**

ESSENCE helps you save it so it can stay with the people you love.

### 1.3 The ESSENCE Lens

Every screen and interaction must feel:
- **Warm** — Emotionally safe and inviting
- **Ceremonial** — Meaningful and significant
- **Personal** — Shaped by and for the individual
- **Steady** — Reliable and grounded
- **Safe** — Protective of emotional and technical vulnerability
- **Emotionally aware** — Responsive to the user's emotional state

**Core Principle:**  
The experience should feel like shaping something real and meaningful, not interacting with tech.

### 1.4 Key Metaphors

ESSENCE uses a consistent set of metaphors throughout all copy, UI, and interactions:

| Metaphor | Meaning | Application |
|----------|---------|-------------|
| **Preserved voice** | The irreplaceable voice asset the user built | Replaces "voice model" or "AI clone" |
| **Voice record** | Alternate term for the preserved voice | Used in onboarding and journey contexts |
| **Voice Vault** | The container that holds the preserved voice | Introduced at Vault Reveal, after voice processing; never before |
| **Voice continuity** | Ongoing stability and depth | Describes quality improvements |
| **Artifact** | Your voice feels like a crafted object | Used in completion/celebration moments |
| **Keepsake** | Preserved gently, like a family memento | Used in protection/storage contexts |
| **Stewardship** | ESSENCE cares for your voice with intention | Used in security/preservation offers |
| **Protection / Sealing** | The act of paying to preserve the Vault long-term | Replaces "subscribing" or "purchasing" |

**Official Terminology Table:**

| Thing | Official Term | Acceptable Alternates | Never Say |
|-------|--------------|----------------------|-----------|
| The AI voice model the user built | preserved voice | your voice, voice record | voice clone, AI voice, voice model, digital voice, recording |
| The container that holds it | Voice Vault | your Vault | storage, archive, cloud, account, locker, safe |
| The 25-prompt process | voice journey | your journey, the twenty five moments | training, voice training, onboarding, setup, recording session |
| The act of paying | protection / sealing your Vault | caring for your Vault, long-term care, voice insurance (as metaphor) | subscribing, upgrading, purchasing, buying a plan, unlocking |
| The voice messages the user creates | messages | voice messages, moments | content, deliverables, outputs, recordings |

**Usage Guidelines:**
- Never say "AI voice" or "voice clone"
- Never say "training" (use "voice journey" or "building your voice record")
- Never say "model quality" (use "voice continuity")
- Never say "subscribe" or "purchase" (use "seal your Vault" or "activate protection")
- Always use tangible, physical-feeling language
- "Voice Vault" is always capitalized as a proper noun
- "Preserved voice" is lowercase
- "Voice insurance" is always metaphorical, never a literal product name

### 1.5 The Breath Stone

The Breath Stone is the emotional anchor of the experience. It is present throughout the entire user journey, from the first welcome screen through ongoing home use.

**Core Qualities:**
- Present, steady, and responsive
- Reflects emotional tone and progress
- Creates grounding, ceremonial presence
- Feels alive, not animated
- Behaves asymmetrically (never perfectly smooth)

**Stone behaviors vary by context:**
- Onboarding screens
- Recording states
- Celebration moments
- Playback experiences
- Preservation offers
- Home states (A and B)

A complete behavior table appears in Chapter 5.

### 1.6 The Voice Vault

The Voice Vault is the preservation anchor of the experience. It is the container that holds the user's preserved voice after they complete their voice journey.

**Core Concept:**  
Think of the Voice Vault like a keepsake case holding something irreplaceable. Inside the case is the user's preserved voice. The Vault is created automatically when the voice journey is complete. It is not something the user unlocks later — it already exists. What changes is how it is cared for over time.

**Vault States:**

| State | Condition | What the User Sees |
|-------|-----------|-------------------|
| **Trial** | User within 7-day trial period. Card captured, voice processed. | Vault exists. Full experience available. Subtle visual cue that protection is pending. |
| **Protected** | Paying Vault subscriber ($12.99/mo or $119/year). | Vault is sealed. Warm glow, complete visual. Voice is covered. |
| **Lapsed** | Trial ended without conversion, or subscription cancelled/expired. | Vault is no longer active. Voice is no longer available. Dormant visual. |

**Key Principles:**
- The Vault is infrastructure. It holds the thing. It is not the thing.
- The Vault is the primary monetization product. Users pay to seal and protect it.
- Card is required before voice processing. There is no free tier.
- The transition from Trial to Lapsed is never dramatic. Dignity, not punishment.
- A protected user never sees Vault language as a selling mechanism.
- A lapsed user is never shamed. The door is always open to return.

**Relationship to the Breath Stone:**  
The Breath Stone reflects the user's emotional state throughout the journey. The Voice Vault reflects the preservation state of the voice after the journey is complete. They are complementary: the Stone is felt, the Vault is trusted. The Stone accompanies the user. The Vault protects what they built.

**The First-Use Rule:**  
The words "Voice Vault" appear in the UI for the first time at the Vault Reveal, after voice processing is complete. They must never appear before that moment in the user's journey. Before the reveal, the concept exists only through its alternates: "your voice," "voice record," "your preserved voice." After the reveal, "Voice Vault" becomes the standard term.

**Frequency Guidance:**
- Onboarding through First Playback: "Voice Vault" appears **zero** times
- Vault Reveal flow: "Voice Vault" appears **3–5** times (reveal, loss framing, paywall, confirmation)
- Home B onward: "Voice Vault" appears **once per screen max**, typically as a label or status indicator
- Message creation flow: "Voice Vault" appears **zero** times

**Three Registers for Vault Language:**

| Register | When Used | Tone |
|----------|-----------|------|
| **Elevated** | Vault Reveal, loss framing, paywall CTA, seal confirmation (4 moments max) | Ceremonial, emotional, weighted |
| **Calm** | Home B indicator, expiration reminders, post-purchase, archive browsing | Practical, warm, factual |
| **Silent** | Onboarding, voice training, First Playback, message creation, delivery confirmation | Vault is not mentioned at all |

If ceremony is everywhere, it is nowhere. Elevated register is reserved for a maximum of four moments across the entire user lifecycle.

**The Repetition Rule:**  
If "Vault" appears twice on the same screen, use "your voice" instead for the second instance. If it would appear a third time, delete one of the previous uses.

---


## CHAPTER 2. EMOTIONAL ARC AND PRIMITIVE LIFECYCLE MODEL

ESSENCE follows a fixed emotional progression. This progression is not decorative. It is structurally tied to the lifecycle of core primitives.

Every emotional stage must correspond to a change in system state. The emotional arc and primitive lifecycle are inseparable.

### 2.1 Core Primitives (Reference Model)

The system is built on five primitives:

- **User**
- **VoiceProfile**
- **TrainingClip**
- **Message** (immutable)
- **Recipient**

The emotional arc describes how the user moves through these objects.

### 2.2 Stage-by-Stage Emotional and System Alignment

---

#### Stage 1 — Orientation

*The quiet moment before anything begins.*

**Primitive Active:** User  
**VoiceProfile State:** Not yet created

**System Reality:**
- User account created.
- No audio exists.
- No VoiceProfile exists.

**Emotional Objective:**  
User understands: this is preservation infrastructure, not a memo recorder. The process is finite and guided.

**Design Requirements:**
- No technical language.
- Clear expectations.
- Explicit time framing.

This stage builds psychological safety before any system asset exists.

---

#### Stage 2 — Commitment

*The first breath of something irreversible.*

**Primitive Active:** User → VoiceProfile (created, empty)  
**VoiceProfile State:** created

**System Reality:**
- VoiceProfile row created in database.
- Status: created.
- No TrainingClips yet.

**Emotional Objective:**  
User understands: they are beginning to shape something. Their voice will be preserved intentionally. They are in control.

This stage marks the beginning of asset formation.

---

#### Stage 3 — Construction

*Each moment spoken becomes part of something whole.*

**Primitive Active:** VoiceProfile + TrainingClip  
**VoiceProfile State:** training

**System Reality:**
- Each prompt creates a TrainingClip.
- TrainingClip linked to VoiceProfile.
- Clips stored externally.
- Database stores metadata only.
- VoiceProfile accumulates structured voice data.

**Emotional Objective:**  
User transitions from performance to presence. Stage 1 prompts reduce anxiety. Stage 2 prompts deepen warmth. Stage 3 prompts capture identity markers. The user should feel steady progress.

---

#### Stage 4 — Completion

*The voice is whole. The work is done.*

**Primitive Active:** VoiceProfile  
**VoiceProfile State:** processing → ready

**System Reality:**
- All required TrainingClips captured.
- Card capture occurs here, before voice processing. Per V3.0 pricing architecture, card is required before processing eligibility. There is no free path.
- 7-day trial begins at card capture.
- Server triggers voice processing.
- VoiceProfile transitions to processing.
- On completion, status becomes ready.
- No Message objects exist yet.

**Emotional Objective:**  
User feels accomplishment, anticipation, and ownership of something complete.

This stage marks the transformation from input collection to preserved system asset.

---

#### Stage 5 — Vault Reveal

*What you built now has a name and a home.*

**Primitive Active:** VoiceProfile  
**VoiceProfile State:** ready

**System Reality:**
- VoiceProfile exists as a usable preserved voice.
- No Messages yet.
- The Voice Vault is introduced for the first time. This is the first moment the user sees the words "Voice Vault."
- Per V3.0 activation architecture: Voice Training → Card Capture → Trial → Voice Processing → Vault Reveal.
- User is in active trial. Subscription conversion is framed as sealing the Vault for long-term protection.

**Emotional Objective:**  
User understands: the VoiceProfile is a durable asset held inside the Voice Vault. It can be protected and maintained. It has long-term value.

Protection is framed as stewardship of the VoiceProfile, not of future Messages. This distinction is critical.

**Register:** Elevated. This is one of the four ceremonial moments where Vault language carries full weight.

---

#### Stage 6 — Recognition

*The first time you hear yourself, preserved.*

**Primitive Active:** VoiceProfile  
**VoiceProfile State:** ready

**System Reality:**
- System generates a neutral playback sample from VoiceProfile.
- No Message object created.
- This is demonstration of continuity, not message creation.

**Emotional Objective:**  
User experiences recognition, validation, and emotional proof. This stage confirms system integrity before enabling expression.

Playback is verification of asset quality.

---

#### Stage 7 — Expression

*Your voice reaches someone it was always meant for.*

**Primitive Active:** Message + Recipient  
**VoiceProfile State:** ready

**System Reality:**
- User selects Recipient.
- System generates Message using VoiceProfile.
- Message object created.
- Message is immutable.
- Audio stored externally.
- Metadata stored in database.
- Message linked to both VoiceProfile and Recipient.

This is the first artifact.

**Emotional Objective:**  
User feels agency, purpose, and the emotional usefulness of their preserved voice. Expression validates preservation.

---

#### Stage 8 — Tangibility

*What was spoken now lives somewhere steady.*

**Primitive Active:** Message (persisted)  
**VoiceProfile State:** ready

**System Reality:**
- Message visible on Memory Shelf.
- Message replayable.
- Immutable.
- Counted against tier limits per V3.0 pricing architecture (3 lifetime messages at Vault tier, 5 per month at Legacy tier).

Shelf is durable proof of system value.

**Emotional Objective:**  
User experiences stability, permanence, and confidence in system reliability. The product transitions from moment to infrastructure.

---

#### Stage 9 — Responsibility

*Preservation is not a moment. It is an ongoing act of care.*

**Primitive Active:** VoiceProfile + Message  
**VoiceProfile State:** ready  
**Message State:** immutable

**System Reality:**
- Per V3.0 pricing architecture, tier determines message limits:
  - Vault ($12.99/mo): 3 lifetime messages. No replenishment.
  - Legacy ($19.99/mo): 5 messages per month. Upgrade introduced after 3 lifetime messages used.
  - Guardian ($29.99/mo): Up to 5 voice profiles, 5 messages per profile per month. Appears only when multi-voice intent is triggered.
- No editing of existing Messages.
- No silent regeneration.
- Expansion is behavioral, not comparative. No public pricing comparison grid.

**Emotional Objective:**  
User understands: preservation carries responsibility. Expansion is intentional. System is controlled and disciplined.

This stage aligns monetization with continuity, not volume.

### 2.3 Immutable Rules of the Emotional Arc

The following rules may not be violated:

1. VoiceProfile must exist before Message creation.
2. Card must be captured before voice processing begins.
3. Playback of preserved voice must occur before first Message creation.
4. The Voice Vault is never named before the Vault Reveal stage.
5. Messages are immutable once created.
6. Protection applies to VoiceProfile, not to individual Messages.
7. Shelf represents artifact permanence.
8. Emotional sequencing cannot bypass lifecycle sequencing.
9. If lifecycle order changes, the emotional arc must change.

### 2.4 Emotional-to-Primitive Summary Table

| Emotional Stage | Primitive Transition | System Event |
|----------------|---------------------|-------------|
| Orientation | User created | Account setup |
| Commitment | VoiceProfile created | Profile initialized |
| Construction | TrainingClip added | Voice accumulation |
| Completion | VoiceProfile ready | Card captured, processing finished |
| Vault Reveal | VoiceProfile framed | Vault introduced, protection explained |
| Recognition | Playback sample | Proof of continuity |
| Expression | Message created | Immutable artifact |
| Tangibility | Message persisted | Shelf visible |
| Responsibility | Tier governs usage | Controlled expansion |

### 2.5 Why This Matters

The emotional arc is not marketing language. It is a reflection of primitive state transitions.

If engineering changes lifecycle order, the emotional arc must be rewritten. If pricing changes activation sequence, the emotional arc must be realigned.

This chapter ensures:
- Product philosophy cannot drift from system design.
- Copy cannot contradict database truth.
- Monetization cannot violate emotional sequencing.
- Migration decisions remain structurally coherent.

This is the binding layer between experience and architecture.

---

# PART TWO: USER JOURNEY

## CHAPTER 3. EXPERIENCE INVENTORY AND USER JOURNEY

This chapter defines the complete user journey as a linear sequence of steps. Each step documents what the user experiences, what the system must support, and what remains undecided. This is the canonical step-by-step reference for how a user moves through ESSENCE.

All monetization timing aligns with Pricing Architecture V3.0. Card capture occurs before voice processing. There is no free tier. ESSENCE cannot absorb the ~$6 per-user voice creation cost without payment commitment.

### 4.1 Activation Sequence (V3.0)

The fixed activation sequence is:

**Onboarding → Voice Training → Card Capture → 7-Day Trial Begins → Voice Processing → Vault Reveal → First Playback → First Message → Home B**

This sequence is immutable. No step may be reordered without revising both the emotional arc (Chapter 2) and the pricing architecture.

### 4.2 Step-by-Step Journey

---

#### Step 1: Onboarding

**Emotional Intent:**  
User enters ESSENCE calmly, understands the purpose, and self-identifies without pressure.

**System Rules:**
- User identity is lightweight and preparatory
- Emotional framing precedes any technical capture
- App state can exist before audio or AI involvement

**Not Yet Decided:** Auth system, database schema, permission implementation details

**Priority:** Critical

---

#### Step 2: Voice Training

**Emotional Intent:**  
User completes a finite, guided voice capture journey without overwhelm.

**System Rules:**
- Voice capture is step-based and bounded (25 prompts across 3 stages)
- Voice creation has clear states: created → training → processing → ready
- Training is intentional, not continuous
- Completion gates all future actions (playback, messages, archive)

**Not Yet Decided:** Audio format, storage provider, processing infrastructure, model vendor

**Priority:** Critical

---

#### Step 3: Card Capture

**Emotional Intent:**  
User commits to protecting what they have built. The moment feels like a natural continuation of the journey, not a gate.

**System Rules (per V3.0):**
- Card is required before voice processing begins
- 7-day trial begins at card capture
- Trial includes Vault tier only ($12.99/mo after trial)
- No Legacy or Guardian exposure during activation
- Voice processing is triggered only after successful card capture
- ESSENCE does not process voice (~$6 cost) without payment commitment

**Not Yet Decided:** Payment provider, subscription mechanics

**Priority:** Critical

---

#### Step 4: Voice Processing and Vault Reveal

**Emotional Intent:**  
User understands something meaningful has been created. The Voice Vault is introduced for the first time. This is a ceremonial moment.

**System Rules:**
- VoiceProfile transitions from processing → ready
- Voice Vault is named for the first time (First-Use Rule per Chapter 1)
- Vault Reveal is one of four Elevated register moments
- Subscription conversion is framed as sealing the Vault for long-term protection
- User is in active 7-day trial

**Not Yet Decided:** Animation framework, rendering technology, performance optimizations

**Priority:** High

---

#### Step 5: First Playback

**Emotional Intent:**  
User hears their preserved voice for the first time. Recognition, validation, emotional proof.

**System Rules:**
- System generates a neutral playback sample from VoiceProfile
- No Message object is created — this is demonstration of continuity
- Playback must occur before first message creation (immutable rule per Chapter 2)

**Not Yet Decided:** Playback UI specifics, waveform rendering

**Priority:** High

---

#### Step 6: First Message Creation

**Emotional Intent:**  
User creates a single intentional message using their preserved voice. Expression validates preservation.

**System Rules:**
- Messages are created after voice completion and first playback
- Message creation is guided via template system (Chapter 8)
- A message becomes a saved, immutable artifact
- Message is linked to both VoiceProfile and Recipient
- Counted against tier limits (Vault: 3 lifetime messages)

**Not Yet Decided:** Editing capabilities, versioning, sharing or export

**Priority:** Critical

---

#### Step 7: Memory Shelf and Playback

**Emotional Intent:**  
User can revisit messages as meaningful keepsakes. Stability, permanence, confidence.

**System Rules:**
- Messages persist on the Memory Shelf
- Playback is user-initiated
- Shelf is an organizing surface, not a feed
- Messages are immutable once created

**Not Yet Decided:** Sorting logic, pagination, caching strategy

**Priority:** Medium

---

#### Step 8: Home B and Ongoing Use

**Emotional Intent:**  
The artifact is complete. The user's voice is preserved. They return to a calm, grounded home that empowers creation and reflection.

**System Rules:**
- Home B is the ongoing state for completed users
- Message creation is the primary action
- Archive is accessible
- CCY is available for optional enrichment moments
- Vault status displayed in calm register

**Tier behavior (per V3.0):**
- Vault ($12.99/mo): 3 lifetime messages, no replenishment
- Legacy ($19.99/mo): 5 messages/month, scheduling, templates — introduced after 3 lifetime messages used
- Guardian ($29.99/mo): Up to 5 voice profiles — appears only when multi-voice intent triggered

**Priority:** Critical

---

#### Step 9: Settings and Trust

**Emotional Intent:**  
User understands ownership and control without fear.

**System Rules:**
- User owns their voice and messages
- Transparency is required
- Control surfaces exist separately from creation flows

**Not Yet Decided:** Legal flows, export format, compliance tooling

**Priority:** High

---

#### Step 10: System States and Error Recovery

**Emotional Intent:**  
User remains calm and oriented during waiting or failure.

**System Rules:**
- No silent failures
- No surprising transitions
- System state must always be legible
- All error handling per Chapter 10

**Not Yet Decided:** Retry logic, network architecture, error logging stack

**Priority:** Critical

### 4.3 Journey Summary Table

| Step | Name | Primitive Transition | Monetization Event |
|------|------|---------------------|-------------------|
| 1 | Onboarding | User created | None |
| 2 | Voice Training | VoiceProfile created → TrainingClips added | None |
| 3 | Card Capture | — | Card captured, trial begins |
| 4 | Vault Reveal | VoiceProfile → ready | Vault introduced, seal CTA |
| 5 | First Playback | Playback sample | None |
| 6 | First Message | Message created | Message counted against tier |
| 7 | Memory Shelf | Message persisted | None |
| 8 | Home B | Ongoing use | Behavioral upsell sequencing |
| 9 | Settings | — | None |
| 10 | System States | — | None |

### 4.4 Immutable Journey Rules

1. Card capture must occur before voice processing
2. Voice processing must complete before Vault Reveal
3. Vault Reveal must occur before First Playback
4. First Playback must occur before first message creation
5. No Legacy or Guardian exposure during activation
6. Expansion is behavioral, not comparative — no public pricing grid
7. This sequence cannot be reordered without revising both the emotional arc and the pricing architecture

---

# PART THREE: DESIGN SYSTEM

## CHAPTER 4. DESIGN SYSTEM INTEGRATION

### 4.1 MINERAL & WARMTH Palette

**Complete color specifications appear in:**  
`ESSENCE_MINERAL_WARMTH_Design_Handoff.md`

**Core Colors:**

| Color Name | Hex | Usage |
|------------|-----|-------|
| Background | #FBF8F4 | Screen backgrounds |
| Card | #F5F0EA | Content cards |
| Warm Layer | #EBE4DC | Subtle overlays |
| Honey | #E8DCC8 | Warm accents |
| Primary | #7A8088 | Primary actions |
| Primary Dark | #656B73 | Hover states |
| Text Primary | #1C1A18 | Body text |
| Text Secondary | #6B6B6B | Supporting text |
| Text Tertiary | #ADA9A5 | Subtle text |

### 4.2 Typography System

**Display Font:** Spectral (Serif)  
- Used for: Titles, labels, ceremonial text
- Weights: 400 (Regular), 600 (Semibold)

**Body Font:** Inter (Sans-serif)  
- Used for: Body copy, UI elements, buttons
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

**Type Scale:**

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Display | Spectral | 48px | 600 | 1.1 |
| H1 | Spectral | 36px | 600 | 1.2 |
| H2 | Spectral | 28px | 600 | 1.3 |
| H3 | Inter | 20px | 600 | 1.4 |
| Body | Inter | 16px | 400 | 1.6 |
| Small | Inter | 14px | 400 | 1.5 |
| Caption | Inter | 12px | 500 | 1.4 |

### 4.3 Motion Principles

**Core Principle:**  
"Alive, not animated. Felt, not understood."

**Motion Rules:**
1. Slow down by 10% (relative to typical web)
2. Begin gently, end gently
3. Move as if exhaling
4. Asymmetric timing (never perfectly even)
5. No bounce physics

**Standard Durations:**
- Micro (hover): 200ms
- Small (expand): 400ms
- Medium (transition): 800ms
- Large (screen change): 1200ms

**Standard Easing:**  
`cubic-bezier(0.4, 0.0, 0.2, 1)`

### 4.4 Component Library

**Primary Button:**
- Background: Primary (#7A8088)
- Hover: Primary Dark (#656B73)
- Text: #FFFFFF
- Padding: 16px 32px
- Border radius: 8px
- Font: Inter 16px Medium

**Secondary Button:**
- Background: Transparent
- Border: 2px solid Primary
- Text: Primary
- Hover: Background #F5F0EA
- Padding: 16px 32px
- Border radius: 8px

**Card:**
- Background: Card (#F5F0EA)
- Border radius: 16px
- Padding: 24px
- Subtle shadow: 0 2px 8px rgba(0,0,0,0.04)

**Progress Bar:**
- Track: Warm Layer (#EBE4DC)
- Fill: Primary (#7A8088)
- Height: 8px
- Border radius: 4px

---


## CHAPTER 5. BREATH STONE BEHAVIOR SYSTEM

The emotional anchor of the ESSENCE experience

The Breath Stone is the central visual and emotional element of ESSENCE.
It holds the tone of the entire product and signals:

safety

calm

presence

progress

ceremony

continuity

It should feel like a living object that breathes with the user.

This chapter outlines the full behavior system for every screen and every phase.

### 5.1 Principles of the Breath Stone

The stone must always feel:

organic

soft

warm

ceremonial

natural

responsive

never distracting

It should never feel flashy or mechanical.

The stone is not decoration.
It is a companion.

### 5.2 Stone Components

The stone has four distinct animation layers:

**Core Pulse**
The central breath-like expansion and contraction.

**Glow Layer**
A soft radial light that shifts with emotional tone.

**Surface Shimmer**
A subtle moving texture that appears in specific states.

**Edge Ripple**
Light rings that appear during important ceremonial moments.

These combine to create a feeling of presence and warmth.

### 5.3 Stone Dimensions and Units

All sizes are defined relative to a base unit called Stone Base Size.

Stone Base Size is the default size used on secondary screens.

For consistency across screens:

Stone Base Size: 100 percent

Playback Size: 130 percent

Celebrate Size: 120 percent

Working Size: 110 percent

Idle Size: 100 percent

Recording Size: 135 percent

Amplitude numbers refer to percentage of size change.

Glow percentages refer to opacity of the glow layer.

Cycle time is measured in milliseconds.

### 5.4 State Index

Below is the master list of all stone states:

Idle

Ready

Recording

Working

Celebrate

Playback

Shimmer (ceremonial effect)

Transition Pause (rare)

Infused (after full voice creation)

Guidance (CCY specific)

Each state is detailed below.

### 5.5 Stone State Definitions

**1. Idle State**

**Used for:**
Welcome
How it works
Journey overview
Preparation screens
Home screens when calm

**Size**
100 percent

**Amplitude**
4 percent

**Glow**
8 percent

**Cycle**
6000 ms

**Behavior**
Slow inhale and exhale
Soft warm lighting
Feels calm and centered

**Emotional Meaning**
This is the stone at rest.
Safe, welcoming, gentle.

**2. Ready State**

**Used for:**
Before recording
Message creation steps
Recipient and message type selection

**Size**
110 percent

**Amplitude**
6 percent

**Glow**
14 percent

**Cycle**
5000 ms

**Behavior**
Slightly more attentive
Subtle shimmer possible
Signals readiness to engage

**Emotional Meaning**
The stone is alert and present.

**3. Recording State**

**Used for:**
All 25 voice prompts
All CCY re-entry prompts

**Size**
135 percent

**Amplitude**
8 percent

**Glow**
32 percent

**Cycle**
4500 ms

**Behavior**
Stronger breath rhythm
Warm inner glow
Surface ripple very subtle

**Emotional Meaning**
Capturing something important.
The stone is actively listening.

**4. Working State**

**Used for:**
Model processing
Message generation
Voice shaping
Internal tasks

**Size**
110 percent

**Amplitude**
5 percent

**Glow**
25 percent

**Cycle**
3500 ms

**Behavior**
Steadier, more mechanical rhythm
Glow pulses evenly
Shimmer off

**Emotional Meaning**
The stone is applying care and craft.
It feels intentional and steady.

**5. Celebrate State**

**Used for:**
Stage completions
Moment completions
Voice record complete
Message saved
Meaningful milestones

**Size**
120 percent

**Amplitude**
7 percent

**Glow**
35 percent

**Cycle**
5000 ms

**Behavior**
Soft celebratory ripple
Warmer outer edge
Occasional halo effect

**Emotional Meaning**
A small moment of pride.
A gentle celebration without noise.

**6. Playback State**

**Used for:**
First playback ceremony
Message playback screens

**Size**
130 percent

**Amplitude**
Variable (synced to audio)
Average 10 percent

**Glow**
18 percent
Increases slightly on vocal peaks

**Cycle**
Synced to waveform
No fixed time

**Behavior**
Pulse matches the user's voice pattern
Edge ripple pulses on key phrases
Stone feels alive

**Emotional Meaning**
Your voice is speaking.
The stone becomes a companion to the sound.

**7. Shimmer State**

**Used for:**
Ceremonial transitions
Preservation offer
Voice continuity moments
Occasional guidance screens

**Size**
100 to 110 percent

**Amplitude**
4 percent

**Glow**
12 percent

**Shimmer**
Soft surface shimmer
Subtle texture movement

**Cycle**
5500 ms

**Behavior**
A soft shimmer that signals significance
Never constant, only occasional

**Emotional Meaning**
This moment has quiet importance.
The stone acknowledges meaning.

**8. Transition Pause State**

**Used for:**
Pre playback
Pre offer
Significant emotional transitions

**Size**
100 percent
Centered

**Amplitude**
2 percent

**Glow**
5 percent

**Cycle**
Slow, about 7000 ms

**Behavior**
Almost still
Barely breathing
A true pause

**Emotional Meaning**
This moment deserves quiet.

**9. Infused State (Voice Complete)**

**Used for:**
Home B after all 25 moments
Voice record fully trained
User has a complete artifact

**Size**
115 percent

**Amplitude**
5 percent

**Glow**
20 percent
Warmer tone

**Effects**
Soft internal glow
A sense of "fullness"

**Emotional Meaning**
Your voice record is whole.
The stone holds its depth.

**10. Guidance State (CCY Specific)**

**Used for:**
CCY welcome
CCY progress screens
CCY transitions
CCY encouragement moments

**Size**
110 percent

**Amplitude**
5 percent

**Glow**
18 percent

**Effects**
Light shimmer
Soft pulse with slightly quicker timing

**Cycle**
4200 ms

**Emotional Meaning**
The stone is gently guiding you forward.
Warm encouragement.

### 5.6 Transition Rules

Every change of state must be gentle.

The stone never snaps or jumps.

Transitions should fade over 600 to 1000 ms:

size gently adjusts

glow fades in or out

amplitude shifts smoothly

shimmer fades gently

The stone must never:

flicker

strobe

shake

abruptly reset

appear binary

The experience must feel like breath.

### 5.7 State Map by Journey Phase

Below is the correct state mapping.

**Onboarding**

Idle
Ready

**Microphone check**

Ready

**Recording (all 25 prompts)**

Recording

**Stage completion**

Celebrate

**Processing**

Working

**Preservation offer**

Shimmer

**Playback ceremony**

Transition Pause
Playback
Idle (reflection)

**First message creation**

Ready
Working
Playback

**Home A**

Guidance

**Home B (free tier)**

Infused
Soft shimmer on CTA

**Home B (activated protection)**

Infused
Occasional shimmer

**CCY flow**

Guidance
Recording
Celebrate

### 5.8 Developer Notes

All animations must be GPU optimized

Use CSS transitions where possible

Prefer requestAnimationFrame for pulse sync

Replay waveform must drive amplitude in real time

Glow layer must be separate from main shape

Edge ripple can be SVG or canvas based

All timings adjustable for accessibility settings

### 5.9 Accessibility Considerations

Reduced motion mode: amplitude cut by 50 percent

Timer-free mode: remove countdown visuals

High contrast mode: darker stone outline

Audio synced animations should be optional

The stone should never create visual stress.

### 5.10 Summary

The Breath Stone Behavior System V4.3 is:

emotionally intelligent

visually consistent

universal across the entire product

central to the feeling of ESSENCE

critical for user trust

pacing the entire experience

This completes the full animation and behavior specification.

---


---

# PART FOUR: PRODUCT ARCHITECTURE

## CHAPTER 6. HOME A AND HOME B

The home screens are the main environment where users return after onboarding and every session after. They must feel like the entrance to a personal archive, not a productivity dashboard.

### 6.1 Two Home States

There are two home environments, determined by VoiceProfile completion state.

**Home A** — Voice record is incomplete. User has not finished all 25 prompts.  
**Home B** — Voice record is complete. VoiceProfile status is ready.

Each home state serves a different emotional need and exposes different functionality.

### 6.2 Home A — Purpose and Goals

Home A is for users still building their voice record.

**Emotional Goal:**  
A warm invitation to continue. The user should feel like they are tending something, not checking off a list. No urgency. No pressure.

**Core Elements:**
- Breath Stone in guidance state
- Progress indication (moments completed, stages reached)
- Primary action: continue the voice journey
- Secondary action: view progress

**What Home A Must Not Include:**
- Message creation
- Message archive
- Preservation or protection offers
- Any feature that implies the voice is ready before it is

**Tone:** Soft, supportive, patient. Nothing implies speed or deadlines.

### 6.3 Home B — Purpose and Goals

Home B appears after the user completes all 25 moments, voice processing finishes, and the VoiceProfile reaches ready status.

**Emotional Goal:**  
The artifact is complete. The user's voice is preserved. They are empowered to use it. Home B should feel like the view after finishing something meaningful — grounded, whole, and quietly proud.

**Core Elements:**
- Breath Stone in infused state (warm, stable, radiant)
- Voice Vault status indicator (per Chapter 1, Section 1.6 — calm register, once per screen max)
- Primary action: create a message
- Secondary action: add more moments (optional CCY)
- Tertiary action: access saved messages / archive
- Message archive preview (recent messages)

**Action Priority:**  
Message creation is the heart of the Home B experience. It must always be the most prominent action.

**Vault Status Display (per V3.0 pricing architecture):**
- Trial user: Vault status with trial days remaining
- Protected user ($12.99/mo): "Voice Vault • Protected" — calm, factual, no selling
- Lapsed user: Vault status reflects lapsed state — warm, never punitive

**Tone:** Proud, supportive, tender. The interface should feel more grounded and complete than Home A.

### 6.4 Transition from Home A to Home B

This is a meaningful moment. It must not be a simple page reload.

**Requirements:**
- The Breath Stone must visually shift from guidance state to infused state
- Progress indicators must resolve to a completed state
- The transition should feel like stepping into a new chapter

**Transition occurs after:** Voice journey completion → card capture → voice processing → Vault Reveal → First Playback → first message creation → Home B.

This sequence is fixed per Chapter 2's emotional arc and V3.0 activation architecture.

### 6.5 Home Logic Rules

**Home A Rules:**
- User has fewer than 25 completed moments
- All actions restricted to continuing the voice journey
- Cannot create messages
- Cannot trigger playback
- No preservation offers
- No archive access

**Home B Rules:**
- User has all 25 moments and VoiceProfile status is ready
- Message creation available (subject to tier limits per V3.0)
- Archive visible
- CCY optional (for adding enrichment moments)
- Vault status displayed in calm register

**Immutable Rule:** Home B must not appear early under any circumstance. State detection is based on VoiceProfile status, not prompt count alone.

---


## CHAPTER 7. CONTINUE CAPTURING YOUR VOICE (CCY)

CCY is the guided return flow for users who have not yet completed all 25 voice moments. It appears every time a user returns to the app before their VoiceProfile reaches ready status.

### 7.1 Purpose

CCY exists to orient returning users, guide them to their next moment, reinforce that each moment strengthens the voice record, and maintain emotional continuity with the onboarding arc. It must feel like soft guidance, not a checklist.

### 7.2 Entry Points

A user enters CCY when:
- They completed initial onboarding but have fewer than 25 prompts
- They tap the primary action on Home A
- They left mid-prompt and returned
- They closed the app and returned later
- They open a push notification inviting them to continue

Each entry resumes exactly where the user left off. No progress is lost.

### 7.3 Flow Structure

CCY is a repeating loop of four micro-steps:

1. **Reentry Orientation** — Shows where they left off and what comes next. Reassurance and grounding.
2. **Warm Guidance** — A brief transitional moment that sets emotional tone before recording. Reduces the feeling of a task.
3. **Prompt Recording** — The guided recording interface for the next moment. Unhurried, ceremonial.
4. **Micro Celebration** — Simple reinforcement of progress after each completed moment. A small win, not a score.

This loop repeats until all 25 prompts are captured. At stage boundaries (end of Stage 1, 2, 3), a slightly elevated milestone moment replaces the standard micro celebration.

### 7.4 Exit Logic

Users can exit CCY at any point: after reentry orientation, after any prompt, after any celebration. Exit always returns the user to Home A with updated progress. The user must never feel locked in.

### 7.5 Completion and Transition

Once the user completes prompt 25:
- CCY ends permanently
- Voice processing is triggered (card already captured per V3.0 activation architecture)
- Vault Reveal occurs
- First Playback follows
- User transitions to Home B

CCY must never appear again once all 25 moments are complete.

### 7.6 Immutable Rules

1. Must resume exactly where the user left off
2. Partial recordings are saved only after the user reviews and approves
3. Progress must sync with Home A indicators
4. Prompt scripts must be rendered from a single source of truth
5. No message creation, archive access, or preservation offers during CCY
6. Emotional tone is always soft, patient, and protective — never urgent

---


---

## CHAPTER 8. MESSAGE TEMPLATES AND PERSONALIZATION SYSTEM

The template system defines how ESSENCE generates messages using the user's preserved voice. Templates must feel human, warm, and natural — never mechanical or overly AI-generated.

### 8.1 Purpose

The template system exists to help users express warmth without needing to write, remove creative pressure, produce messages that feel like natural extensions of the user, and adapt to relationships, intentions, and emotional contexts. It must maintain ESSENCE's emotional tone across all message types and scale into future categories.

### 8.2 Template Structure

Every message follows a consistent four-part structure:

1. **Opening Tone Line** — Sets warmth and emotional posture. Short and simple.
2. **Intention Core** — Carries the emotional weight of the selected category.
3. **Personalized Insert** (optional) — Incorporates the user's custom note, naturally woven in. Quietly omitted if the user wrote nothing.
4. **Closing Line** — A gentle, simple ending that sounds like something the user could realistically say.

### 8.3 Message Categories

ESSENCE launches with seven primary categories. Each includes multiple template variants for variety.

| Category | Emotional Goal |
|----------|---------------|
| Birthday | Warm, celebratory, never cheesy |
| Encouragement | Supportive, grounding, hopeful |
| Daily Reminder | Gentle, familiar |
| A Message for the Future | Continuity, care across time |
| Comfort | Tender reassurance without assuming details |
| Holiday | Seasonal warmth, no religious or cultural assumptions |
| Just Checking In | Light, friendly, low pressure |

Future categories may include: life advice, memory anchors, gratitude reflections, guided breathing, milestone messages (graduation, wedding), and others. The system is designed to scale.

### 8.4 Personalization Rules

**User Notes:**
- Appear only once per message
- Must not dominate the message
- Must not repeat the user's exact text — reinterpret naturally
- Must maintain emotional tone
- Must not introduce assumptions

**Relationship Influence:**  
Recipient relationship category (daughter, friend, partner, parent, grandchild, other) influences tone, warmth level, and closeness. The system allows natural variation without stereotypes.

### 8.5 Voice Synthesis Constraints

Templates must support stable AI voice generation:
- No tongue twisters
- No rapid shifts in tone
- No fast lists or long compound sentences
- No complex punctuation
- Short sentences, clear pauses, simple vocabulary
- Conversational language — warmth without poetic flourish
- Always assume the listener may be older

### 8.6 Length and Format Constraints

- Messages: 10–30 seconds when spoken at natural speech speed
- Per V3.0 pricing architecture: 1,200 character cap at Legacy tier
- Single paragraph, stable pacing
- Must be comfortable to listen to

### 8.7 Generation Architecture (V1)

The V1 generation pipeline is locked to a hybrid model that protects template consistency while allowing genuine personalization. The architecture below is the binding contract for Step 5 (Message Creation) and downstream system states.

**8.7.1 Text Generation Method — Hybrid (templates + LLM-handled personalized insert)**

Templates are deterministic and carry the structural and tonal weight of every message. Three of the four template parts (Opening Tone Line, Intention Core, Closing Line) come straight from the template JSON without modification. Only the Personalized Insert is touched by an LLM, and only when the user provides a personal note.

Generation logic:

```
if (userNote) {
  insert = await generateInsert(userNote, templateContext, relationship)
} else {
  insert = template.defaultInsert
}
finalText = assembleTemplate(template, insert)
```

This honors the "reinterpret naturally, do not echo verbatim" rule from 8.4 while constraining LLM creative work to a single slot. Tone consistency is guaranteed by the surrounding template structure.

LLM provider: Anthropic Claude (Haiku for cost, Sonnet if quality requires). Provider is swappable without changing the contract. System prompt frames the LLM as writing a single short segment of natural spoken language (under 40 words, simple punctuation, first-person voice, no echoing of literal phrasing). Prompt is iterated against real generations after the first 50 production calls.

**8.7.2 Audio Generation Timing — On every preview, capped**

Audio is generated at the same time as text. When the user lands on the Preview screen, both text and audio are ready. The user hears the message immediately on first preview.

This protects the first-listen moment, which is the product's primary emotional payoff and the single strongest driver of retention at the Vault tier. Burying first-listen behind a Save commitment is rejected as a V1 path.

Regeneration cap: **3 regenerations per message**. The cap is configurable via environment variable, not hardcoded. After the cap is reached, the regenerate CTA softens to language inviting the user to save, edit their note, or discard. The cap state is a soft moment, not a hard wall.

**8.7.3 Regeneration Scope — New template variant, same inputs**

When the user taps Regenerate, the system selects a different template variant from within the same category, holding recipient and personal note constant. The LLM re-runs the personalized insert against the new template context. Both text and audio are regenerated.

Variant pool starts at 2–3 variants per category. Variant pool expansion is content work, not engineering work, and is tuned post-launch based on cap-hit data.

"Edit your note" remains available as a separate, secondary UX action on the Preview screen — it is not the primary regenerate behavior.

**8.7.4 Service Boundaries**

Text generation and audio generation are two separate, swappable services with clean contracts:

```
generateMessageText(template, recipient, note) → string
generateAudio(text, voiceProfile) → audioUrl
```

Internals (LLM provider, audio provider, prompt strategy, voice settings) can change without rewriting the flow.

**8.7.5 Generation Logging**

Every generation attempt logs full inputs and outputs. This is V1's primary data asset and is impossible to backfill. Per generation, the system captures:

- Template ID + variant
- Recipient ID + relationship
- User note (if present)
- LLM prompt sent
- LLM raw response
- Final assembled text
- Audio generation success/failure + URL
- Regeneration count for the session
- Timestamp

### 8.8 V1 Scope — Personal Note Input

The V1 personal note step (A4 in the Step 5 screen inventory) presents a **single optional input field** with a category-specific prompt and a **200-character cap**.

If the field is filled, generation routes through the hybrid LLM path. If blank, generation routes through the pure template path. Skip and Continue CTAs are equally weighted — there is no friction for users who want a pure template message.

This cut is deliberate. Pure templates without personal input create a "Hallmark card in your voice" risk that weakens the retention bet at $12.99/month. Full free-form input is a v2 feature. One optional line is the minimum viable personalization that generates the data signal needed to validate the personalization hypothesis.

**Deferred to v2 (legitimate waitlist features):**

- Free-form long input (multi-paragraph notes)
- Custom user-defined categories
- Long-form messages (over 30 seconds, story-style)
- Multi-recipient messages
- Editing or evolving saved messages post-save (also blocked by immutability)
- Scheduled future delivery
- Guardian tier features (existing v2 plan per Chapter 11)

### 8.9 Cost Basis (V1)

Per saved message, worst case (3 regenerations):

| Cost | Amount |
|------|--------|
| LLM (Claude Haiku, hybrid insert only) | ~$0.001 × 3 = ~$0.003 |
| ElevenLabs audio (~30 sec, ~500 chars) | ~$0.15 × 3 = ~$0.45 |
| Storage | negligible |
| **Worst case total** | **~$0.45 per saved message** |

Per saved message, typical (1 generation, no regeneration):

| Cost | Amount |
|------|--------|
| LLM | ~$0.001 |
| ElevenLabs | ~$0.15 |
| **Typical total** | **~$0.15 per saved message** |

At 20 messages/month with worst-case regeneration, COGS is ~$9 against $12.99 Vault revenue. Tight but workable. Typical usage at ~$3–5 leaves healthy margin. ElevenLabs current pricing must be verified before launch; the regeneration cap is the primary lever if rates shift.

### 8.10 Immutable Rules

1. All templates must follow the four-part structure
2. Templates are stored in structured format (JSON) with relationship variants referenced by tags
3. Personal note logic applied through placeholder injection (hybrid LLM path per 8.7.1)
4. All messages validated for length before generation
5. Message generation must log full inputs and outputs per 8.7.5
6. Audio generation must occur on first preview, not deferred to save (per 8.7.2)
7. Regeneration is capped (configurable, default 3) and cap state must be soft, never punitive
8. Text and audio generation must remain as separate, swappable services
9. Tone must always be warm, grounded, simple, and emotionally honest — never dramatic, clinical, or overly poetic
10. No silent regeneration — user always knows when a new generation is occurring

---


## CHAPTER 9. MESSAGE ARCHIVE AND CONTINUITY HUB

The Message Archive is the emotional library of ESSENCE. It is not a traditional inbox or file system. It is a gentle collection of moments the user created with their preserved voice. It must feel like a keepsake drawer — calm reflection, not overwhelm.

### 9.1 Purpose

The archive exists to store all saved messages, provide a peaceful space for replay and revisiting, reinforce the value of long-term preservation, and serve as the home for continuity and ongoing care features.

### 9.2 Availability

The archive is accessible only on Home B — after all 25 prompts are complete, the VoiceProfile is ready, and the user has transitioned to Home B. Home A users must not see any archive or messaging features.

### 9.3 Core Elements

**Message List:**  
Each saved message displays as a card showing: recipient name, message category, preview text, duration, and creation date. Default sort is most recent first. Optional filtering by recipient, category, or date.

**Message Detail:**  
Tapping a message opens the full experience: playback with waveform, full transcript, and actions (play, regenerate, duplicate, delete). Messages are immutable per Chapter 2's primitive model — no editing of delivered messages.

**Empty State:**  
When no messages exist yet, the archive shows a warm invitation to create the first message. No pressure.

### 9.4 Tier Behavior in Archive

Per V3.0 pricing architecture:

| State | Archive Behavior |
|-------|-----------------|
| **Trial** | Messages created during trial are visible. Message count reflects tier limits. |
| **Vault ($12.99/mo)** | 3 lifetime messages. Archive shows count used. After 3 used, Legacy upsell appears organically. |
| **Legacy ($19.99/mo)** | 5 messages per month. Full archive access. Scheduling and templates available. |
| **Guardian ($29.99/mo)** | Multi-profile archive. Shared archive access across voice profiles. |
| **Lapsed** | Existing messages remain visible (read-only). No new message creation. Warm reactivation prompt. |

Tier indicators must feel like quiet stewardship, never a paywall.

### 9.5 Continuity Hub Features

The archive is also the natural home for ongoing engagement features:
- Gentle reminders to add enrichment moments
- Voice care prompts (optional, never intrusive)
- Seasonal template introductions (future)
- Reflection prompts encouraging replay of older messages

All optional. Never intrusive.

### 9.6 Immutable Rules

1. Archive must sync locally and server-side
2. Message cards must be lightweight to load
3. Delete action must require soft confirmation
4. Saved message order must be stable
5. Archive must always reflect current state
6. The archive must feel emotional, safe, and warm — never like a productivity tool

---

---

# PART FIVE: MONETIZATION

## CHAPTER 11. PRICING ARCHITECTURE SUMMARY

This chapter summarizes the structural pricing rules that affect product behavior. It is not the full pricing document. The canonical source of truth for all pricing is **ESSENCE Pricing Architecture V3.0**. This summary exists so that designers and developers can build correctly without cross-referencing a separate document.

### 11.1 Core Monetization Philosophy

ESSENCE is preservation infrastructure, not a messaging utility.

The monetization sequence is: **Preparation → Responsibility → Continuity**

Key principles:
- Card required before voice processing
- 7-day trial included at card capture
- Voice Vault must independently carry customer acquisition cost (CAC)
- No unlimited message generation
- No free tier
- Expansion is behavioral, not comparative — no public pricing comparison grid

### 11.2 Activation Sequence

Voice Training → Card Capture → 7-Day Trial → Voice Processing → Vault Reveal

- Trial includes Vault tier only
- No Legacy or Guardian exposure during activation
- Voice is processed only after card capture (~$6 per-user voice creation cost)

### 11.3 Tier Structure

Three tiers. Each unlocked by behavioral signals, not comparison shopping.

**Tier 1 — Voice Vault (Preparation)**

| | |
|---|---|
| Monthly | $12.99 |
| Annual | $119 |
| Includes | 1 preserved voice profile, 3 lifetime messages, cold storage stewardship, archive access |
| Message replenishment | None |
| Role | Primary conversion product. Must carry CAC. |

**Tier 2 — Legacy (Responsibility)**

| | |
|---|---|
| Monthly | $19.99 |
| Annual | $179 |
| Includes | Everything in Vault + 5 messages/month, 1,200 character cap, scheduling, occasion reminders |
| Trigger | Introduced after 3 lifetime messages used |

**Tier 3 — Guardian (Continuity)**

| | |
|---|---|
| Monthly | $29.99 |
| Annual | $269 |
| Includes | Everything in Legacy + up to 5 voice profiles, 5 messages per profile/month, shared archive access |
| Trigger | Appears only when multi-voice intent is detected |

### 11.4 Behavioral Upsell Sequencing

| Moment | Action |
|--------|--------|
| Activation | Vault (via trial) |
| Message 1 created | No upsell |
| Message 2 created | Soft responsibility cue |
| Message 3 created (lifetime limit reached) | Legacy expansion introduced |
| Multi-profile attempt | Guardian revealed |

Upsells are contextual and organic. They appear at the moment of demonstrated need, never as a comparison grid.

### 11.5 Cost Structure

| Cost | Amount |
|------|--------|
| Voice creation (one-time) | ~$6 per user |
| Ongoing Vault cost | ~$1.50–2.00/month |
| Legacy cost (5 messages/month) | ~$3–4/month |

**Contribution margin targets:**
- Vault: ≥$10 margin/month
- Legacy: ≥$14 margin/month
- Guardian: ≥$20 margin/month
- Target gross margin: ≥70%

### 11.6 Acquisition Targets

| Metric | Target |
|--------|--------|
| Blended CAC | ~$35–45 |
| CAC payback | ≤4 months |
| Monthly churn | ≤7% |
| Vault conversion | 40–50% |
| Legacy upgrade | 20–30% |
| Guardian adoption | 5–10% |
| Blended ARPU | $18–22 |

### 11.7 Tier Discipline Rules

1. No unlimited message generation
2. No AI cost expansion without pricing review
3. No additional lifetime messages in Vault
4. No new tier without margin simulation
5. Vault must independently recover CAC

### 11.8 What This Means for Product

- **Home B:** Vault status indicator reflects Trial, Protected, or Lapsed (Chapter 6)
- **Archive:** Message count and tier limits visible per tier (Chapter 9)
- **CCY:** No monetization surfaces during voice training (Chapter 7)
- **Templates:** Character cap (1,200) applies at Legacy tier (Chapter 8)
- **Error handling:** Lapsed and payment-failed states must be warm, never punitive (Chapter 12)
- **Vault Reveal:** Elevated register, one of four ceremonial moments (Chapter 1)

---

# PART SIX: OPERATIONAL


## CHAPTER 12. EDGE CASES AND ERROR HANDLING

ESSENCE is deeply emotional and ceremonial. Technical friction must never break the atmosphere. Even when something fails, the user must feel that ESSENCE is caring for their voice and guiding them gently.

### 12.1 Core Principles

Every error state must follow these principles:
- Warm tone, clear instruction
- No technical blame or dramatic language
- Soft reassurance and easy recovery
- Minimal user anxiety
- Progress is always preserved

**Language Rules:**
- Never use: "Error," "Failed," "Something went wrong," "Critical issue," "System malfunction"
- Never mention: "version," "patch," or "update number"
- Always use soft, steady alternatives that maintain the ESSENCE tone

### 12.2 Error Categories

The following areas require graceful error handling. Specific copy and UI for each will be defined in prototypes, but the structural requirements are fixed.

**Recording Errors** (onboarding and CCY):
- Low microphone volume
- Background noise detected
- Microphone disconnect mid-recording
- Microphone permission denied (including persistent denial)
- Partial recordings (user stops mid-prompt)
- Upload or save delays

**Voice Processing Errors:**
- Processing takes longer than expected
- Processing fails on first attempt (may require additional prompts)
- Repeat processing failures (escalate to support — framed as care, not escalation)

**Playback Errors:**
- Audio fails to play
- Waveform fails to load (audio may still be available)

**Message Generation Errors:**
- Generation delayed
- Generation failed
- Repeat generation failures (after 3 attempts, offer alternative path)

**Message Saving Errors:**
- Save delayed
- Save fails

**Archive Errors:**
- Archive unable to load
- Individual message cannot open

**Subscription and Protection Errors (per V3.0 pricing architecture):**
- Payment method failed
- Subscription lapsed (trial ended without conversion, or cancelled)
- User voluntarily ends protection

**Session and Return Errors:**
- Interrupted CCY flow (app close, lost internet) — resume where left off
- Return after extended inactivity (3+ months) — warm reentry, reinforce continuity
- App updates requiring refresh — never mention version numbers

### 12.3 Subscription State Error Behavior

Per V3.0 pricing architecture (no free tier):

| Situation | Tone | Requirement |
|-----------|------|-------------|
| Payment failed | Warm, factual | Preserved voice remains safe. Prompt to update payment details. |
| Trial ends without conversion | Dignified | Vault transitions to lapsed. No dramatic moment. No shaming. |
| User cancels protection | Neutral, warm | Existing messages remain accessible (read-only). New creation paused. Door always open to return. |
| Lapsed 30+ days | Gentle | Warm reactivation prompt. Never punitive. |

### 12.4 Accessibility Requirements

All error handling must support:
- Screen readers
- Large tap targets
- Slow reading speeds
- Short, clear sentences
- Friendly, non-alarming tone

Older users respond strongly to gentle clarity.

### 12.5 Immutable Rules

1. All error states must be recoverable — no dead ends
2. All errors must save progress automatically
3. CCY must resume correctly after any interruption
4. Playback must retry gracefully
5. Archive must not break if message metadata fails
6. API retries must be silent and invisible to the user
7. All errors logged with context for engineering
8. Error tone must always match ESSENCE's emotional register: soft, safe, steady, non-technical, emotionally protective

---


---

## APPENDIX A: GLOSSARY

**Voice Record:** The preserved AI voice model created from user's recordings

**Voice Continuity:** The quality, stability, and depth of the voice record

**Voice Moments:** Individual prompt responses during training

**Keepsake:** Metaphor for the preserved voice (like a family heirloom)

**Artifact:** Metaphor emphasizing the crafted, tangible feel of the voice

**Stewardship:** ESSENCE's care and protection of user voice records

**Breath Stone:** The core visual element that breathes and responds

**Soft Preservation Offer:** Non-pushy monetization moment (after playback)

**CCY V3:** Continue Capturing Your Voice - the in-progress journey

**MINERAL & WARMTH:** The design system color palette

---


## APPENDIX B: QUICK REFERENCE

### File Locations
- Design System: `breath_stone_design_system_FINAL.html`
- 4-Screen Prototype: `essence-complete-4-screen-prototype.html`
- Design Handoff: `ESSENCE_MINERAL_WARMTH_Design_Handoff.md`
- Onboarding Prototype: `essence-onboarding-v3-optimized.html`

### Key Documents
- Executive Handoff: `ESSENCE__Voice_Legacy_Platform__Executive_Handoff.pdf`
- Go-to-Market Strategy: `ESSENCE_GotoMarket_Strategy_Framework.pdf`

### Contact
- Founder: Oremi
- Project Status: 85-90% technically complete
- Budget: $10K
- Timeline: Ready for beta launch


---

*This document is the single source of truth for ESSENCE product specification. All development, design, and content decisions should reference this document alongside the canonical Pricing Architecture V3.0.*
