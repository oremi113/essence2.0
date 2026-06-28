// Step 3 — mock rail states (Pass 1). One row of the §3 prop shape per rail
// state, fed to the screens from the /dev sandboxes. These are the canonical
// 18 states (12 CardCapture + 6 Processing) from handoff §4. Mock pricing per
// §4: annual $119, monthlyEquivalent ~$10, monthly $12.99, trialDays 7.

import type { ProcessingEntry, Step3Props } from './types';

const PRICING: Step3Props['pricing'] = {
  plan: 'annual',
  annualPrice: '$119',
  monthlyPrice: '$12.99',
  monthlyEquivalent: '$10',
  trialDays: 7,
};

const SAMPLE_LABEL = 'Hear what a preserved voice sounds like. An example, from another family.';
const CLIP_URL = '/mock/generic-elder.mp3';

// Neutral baseline: pre-seal paywall, ember cool, nothing in flight.
function base(component: Step3Props['component']): Step3Props {
  return {
    pricing: { ...PRICING },
    sample: { status: 'idle', clipUrl: CLIP_URL, label: SAMPLE_LABEL },
    vault: { phase: 'establish', emberPresent: true, emberState: 'cool' },
    checkout: { status: 'idle' },
    generation: { status: 'idle', elapsedMs: 0, budgetMs: 120000 },
    notify: { armed: false, channel: 'email' },
    park: { active: false, recordingId: 'rec_mock' },
    a11y: { reducedMotion: false },
    proof: null,
    component,
  };
}

export interface CardCaptureMock {
  id: string;
  label: string;
  description: string;
  props: Step3Props;
  isolate?: 'loss-frame';
}

export interface ProcessingMock {
  id: string;
  label: string;
  description: string;
  props: Step3Props;
  entry?: ProcessingEntry;
}

// ── CardCapture · 12 states ──────────────────────────────────────────────────
export const CARD_CAPTURE_STATES: CardCaptureMock[] = [
  {
    id: 'sample-skipped',
    label: 'sample-skipped',
    description: 'Landing view. Sample idle, no after-copy.',
    props: base('CardCapture'),
  },
  {
    id: 'sample-played',
    label: 'sample-played',
    description: 'Sample played — after-copy revealed.',
    props: { ...base('CardCapture'), sample: { status: 'played', clipUrl: CLIP_URL, label: SAMPLE_LABEL } },
  },
  {
    id: 'loss-frame-isolated',
    label: 'loss-frame',
    description: 'The turn, tuned alone (Beat 2 hidden). Sandbox isolation view.',
    props: base('CardCapture'),
    isolate: 'loss-frame',
  },
  {
    id: 'default-annual',
    label: 'default-annual',
    description: 'Annual plan selected (default).',
    props: { ...base('CardCapture'), pricing: { ...PRICING, plan: 'annual' } },
  },
  {
    id: 'monthly-selected',
    label: 'monthly-selected',
    description: 'Monthly plan selected — price line swaps to $12.99.',
    props: { ...base('CardCapture'), pricing: { ...PRICING, plan: 'monthly' } },
  },
  {
    id: 'checkout-submitting',
    label: 'submitting',
    description: 'CTA busy and locked, submit in flight.',
    props: { ...base('CardCapture'), checkout: { status: 'submitting' } },
  },
  {
    id: 'confirm-pending',
    label: 'confirm-pending',
    description: 'Confirm-hold. Unsealed, listening, ember cool.',
    props: {
      ...base('CardCapture'),
      vault: { phase: 'confirm-hold', emberPresent: true, emberState: 'cool' },
      checkout: { status: 'confirm-pending' },
    },
  },
  {
    id: 'confirm-timeout',
    label: 'confirm-timeout',
    description: 'Timeout. "Check again" only — no re-pay control (§RETRY-BY-KNOWLEDGE).',
    props: {
      ...base('CardCapture'),
      vault: { phase: 'confirm-hold', emberPresent: true, emberState: 'cool' },
      checkout: { status: 'timeout' },
      notify: { armed: false, channel: 'email' },
    },
  },
  {
    id: 'checkout-error',
    label: 'checkout-error',
    description: 'Definite decline (no charge). Banner + "Try again". Never sealed.',
    props: {
      ...base('CardCapture'),
      checkout: { status: 'error', errorKind: 'declined' },
    },
  },
  {
    id: 'post-commit-confirmation',
    label: 'post-commit (seal)',
    description: 'Sealed. Ignited ember, shimmer faint. "Sealed. Your voice is on its way."',
    props: {
      ...base('CardCapture'),
      vault: { phase: 'sealed', emberPresent: true, emberState: 'ignited' },
      checkout: { status: 'confirmed' },
    },
  },
  {
    id: 'not-now-parked',
    label: 'not-now-parked',
    description: 'Parked. Voice held, place kept, reminder promised.',
    props: {
      ...base('CardCapture'),
      park: { active: true, recordingId: 'rec_mock' },
    },
  },
  {
    id: 'reduced-motion',
    label: 'reduced-motion',
    description: 'Seal RM settled frame. Sealed, ember static (no motion).',
    props: {
      ...base('CardCapture'),
      vault: { phase: 'sealed', emberPresent: true, emberState: 'ignited' },
      checkout: { status: 'confirmed' },
      a11y: { reducedMotion: true },
    },
  },
];

// ── Processing · 6 states ────────────────────────────────────────────────────
// Always sealed + ignited; single entry, forward-only.
function processingBase(): Step3Props {
  return {
    ...base('Processing'),
    vault: { phase: 'sealed', emberPresent: true, emberState: 'ignited' },
    checkout: { status: 'confirmed' },
    generation: { status: 'processing', elapsedMs: 8000, budgetMs: 120000 },
  };
}

export const PROCESSING_STATES: ProcessingMock[] = [
  {
    id: 'processing-normal',
    label: 'normal',
    description: '0–60s wait. "Preparing your voice." Shimmer faint.',
    props: processingBase(),
    entry: 'seal',
  },
  {
    id: 'processing-extended',
    label: 'extended',
    description: '60–120s softening. Absorbs slow-gen AND silent retry. Shimmer active.',
    props: { ...processingBase(), generation: { status: 'processing', elapsedMs: 75000, budgetMs: 120000 } },
    entry: 'seal',
  },
  {
    id: 'processing-notify-handoff',
    label: 'notify-handoff',
    description: 'Budget elapsed. Keep-open-or-notify offer. Failure invisible to user.',
    props: { ...processingBase(), generation: { status: 'failed', elapsedMs: 120000, budgetMs: 120000 } },
    entry: 'seal',
  },
  {
    id: 'notify-landing',
    label: 'notify-landing',
    description: 'Cold start from email. Context restored badge, never blank or paywall.',
    props: processingBase(),
    entry: 'notify-deeplink',
  },
  {
    id: 'post-seal-support',
    label: 'post-seal-support',
    description: 'True-failure tail. Seal holds, SLA promise, notify armed. Shimmer faint.',
    props: { ...processingBase(), generation: { status: 'unrecoverable', elapsedMs: 120000, budgetMs: 120000 } },
    entry: 'seal',
  },
  {
    id: 'reduced-motion',
    label: 'reduced-motion',
    description: 'Processing RM resting frame. Shimmer static rest (no loop).',
    props: { ...processingBase(), a11y: { reducedMotion: true } },
    entry: 'seal',
  },
];
