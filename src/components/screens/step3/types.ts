// Step 3 — Card Capture + Processing · shared prop shape (handoff §3).
//
// Pure, props-driven screens. The §3 prop shape is the data contract; the
// page.tsx (production) or the dev sandbox (Pass 1) supplies one row of this
// per rail state. Screens never import Supabase and never fetch — they render
// from these props alone.

export type SampleStatus = 'idle' | 'played' | 'skipped';
export type BillingPlan = 'annual' | 'monthly';
export type VaultPhase = 'establish' | 'confirm-hold' | 'sealed';
export type EmberState = 'cool' | 'ignited'; // ignited is static (held glow, no pulse)

// checkout.status carries the confirm-hold state machine's surface values.
// 'confirmed' is the ONLY value that may render a seal (§SEAL-INTEGRITY).
export type CheckoutStatus =
  | 'idle'
  | 'submitting'
  | 'confirm-pending'
  | 'timeout'
  | 'error'
  | 'confirmed';

export type GenerationStatus = 'idle' | 'processing' | 'failed' | 'unrecoverable';

export interface Pricing {
  plan: BillingPlan;
  annualPrice: string;
  monthlyPrice: string;
  monthlyEquivalent: string;
  trialDays: number;
}

export interface Sample {
  status: SampleStatus;
  clipUrl: string;
  label: string;
}

export interface VaultData {
  phase: VaultPhase;
  emberPresent: true;
  emberState: EmberState;
}

export interface Checkout {
  status: CheckoutStatus;
  errorKind?: 'declined';
}

export interface Generation {
  status: GenerationStatus;
  elapsedMs: number;
  budgetMs: number;
}

export interface Notify {
  armed: boolean;
  channel: 'email';
}

export interface Park {
  active: boolean;
  recordingId: string;
}

export interface A11y {
  reducedMotion: boolean;
}

// The full §3 prop shape, shared by both screens. Each screen reads the slices
// it owns; `component` is a seam tag (handoff §SEAM), not a runtime branch.
export interface Step3Props {
  pricing: Pricing;
  sample: Sample;
  vault: VaultData;
  checkout: Checkout;
  generation: Generation;
  notify: Notify;
  park: Park;
  a11y: A11y;
  proof: null; // zero-height slot, present so layout does not shift when populated later
  component: 'CardCapture' | 'Processing';
}

// Processing is the only screen reached two ways (handoff §4 "entry" column):
// 'seal' = forward from the seal, 'notify-deeplink' = cold start from an email.
// It is a routing dimension, not §3 data, so it rides as its own prop.
export type ProcessingEntry = 'seal' | 'notify-deeplink';
