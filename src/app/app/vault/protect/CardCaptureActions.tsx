'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CardCapture } from '@/components/screens/step3/CardCapture';
import type { BillingPlan, Step3Props } from '@/components/screens/step3/types';
import { VAULT_PRICING } from '@/lib/vault';
import { ROUTES } from '@/lib/routes';
import { useCheckout } from '@/lib/stripe/useCheckout';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';

// Client actions wrapper for Card Capture (spine-wiring S1). Owns the callbacks
// and derives the pure §3 prop shape the screen renders from — no fetch, no
// Supabase (CLAUDE.md three-layer rule; data/auth live in page.tsx).
//
// S1 exercises only the paywall + park regions of CardCapture. The confirm-hold
// and seal-ceremony regions (checkout 'confirm-pending' / 'confirmed') are driven
// by the Stripe return flow, wired in S2 — this wrapper never produces those
// statuses.

// The sample plays a warm "example voice" (Carol — ElevenLabs en-US, an older
// American-English read) so the user hears what a preserved voice sounds like
// before committing. Static asset in public/; the commit path doesn't depend on
// it. Licensing: professional-tier library voice — confirm usage rights before
// launch (FOLLOW_UPS #82).
const SAMPLE_LABEL = 'Hear what a preserved voice sounds like. An example, from another family.';
const SAMPLE_CLIP_URL = '/samples/carol-preserved-voice.mp3';

// $119/yr ÷ 12 ≈ $9.92 → "$10". Derived from VAULT_PRICING so it can't drift.
const MONTHLY_EQUIVALENT = `$${Math.round(VAULT_PRICING.annual.priceCents / 12 / 100)}`;
const TRIAL_DAYS = 7;

type CheckoutUi = 'idle' | 'submitting' | 'error';

function readPlan(params: URLSearchParams): BillingPlan {
  return params.get('plan') === 'monthly' ? 'monthly' : 'annual';
}

export function CardCaptureActions({ recordingId }: { recordingId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = readPlan(new URLSearchParams(searchParams.toString()));
  const startCheckout = useCheckout('card-capture');

  const [checkoutUi, setCheckoutUi] = useState<CheckoutUi>('idle');
  const [samplePlayed, setSamplePlayed] = useState(false);
  const [parked, setParked] = useState(false);
  const reducedMotion = useReducedMotion();

  // The sample clip plays on demand (a user gesture → no autoplay problem).
  // Lazily created; paused on unmount so it never bleeds into the next screen.
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    return () => {
      sampleAudioRef.current?.pause();
      sampleAudioRef.current = null;
    };
  }, []);

  const handlePlaySample = useCallback(() => {
    setSamplePlayed(true);
    if (!sampleAudioRef.current) {
      sampleAudioRef.current = new Audio(SAMPLE_CLIP_URL);
    }
    const audio = sampleAudioRef.current;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // A blocked/failed play still reveals the after-copy — no dead end.
    });
  }, []);

  const handleSelectPlan = useCallback(
    (next: BillingPlan) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('plan', next);
      router.replace(`${ROUTES.vaultProtect}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleKeep = useCallback(async () => {
    if (checkoutUi === 'submitting') return;
    setCheckoutUi('submitting');
    const handled = await startCheckout(plan);
    // handled → navigating away (this component unmounts). Otherwise the request
    // failed with no charge — surface the recoverable decline (Step 10: no dead
    // spinners). The screen shows the banner + a "Try again" CTA.
    if (!handled) setCheckoutUi('error');
  }, [checkoutUi, startCheckout, plan]);

  const checkout: Step3Props['checkout'] =
    checkoutUi === 'submitting'
      ? { status: 'submitting' }
      : checkoutUi === 'error'
        ? { status: 'error', errorKind: 'declined' }
        : { status: 'idle' };

  const props: Step3Props = {
    pricing: {
      plan,
      annualPrice: VAULT_PRICING.annual.displayPrice,
      monthlyPrice: VAULT_PRICING.monthly.displayPrice,
      monthlyEquivalent: MONTHLY_EQUIVALENT,
      trialDays: TRIAL_DAYS,
    },
    sample: { status: samplePlayed ? 'played' : 'idle', clipUrl: SAMPLE_CLIP_URL, label: SAMPLE_LABEL },
    vault: { phase: 'establish', emberPresent: true, emberState: 'cool' },
    checkout,
    generation: { status: 'idle', elapsedMs: 0, budgetMs: 120000 },
    notify: { armed: false, channel: 'email' },
    park: { active: parked, recordingId },
    a11y: { reducedMotion },
    proof: null,
    component: 'CardCapture',
  };

  return (
    <CardCapture
      {...props}
      onBack={() => router.push(ROUTES.record)}
      onPlaySample={handlePlaySample}
      onSelectPlan={handleSelectPlan}
      onKeep={handleKeep}
      onNotNow={() => setParked(true)}
      onResume={() => setParked(false)}
    />
  );
}
