'use client';

import { useState, useEffect } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { PageTransition, PrimaryButton, SecondaryButton } from '@/components/ui';

interface OnboardingScreenProps {
  /**
   * Called when the user taps "Begin voice training" on Step 5.
   * The caller is responsible for persisting completion and navigating
   * away (typically to /app/record). The screen itself never touches
   * Supabase or /api/*.
   */
  onComplete: () => Promise<void>;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  async function handleComplete() {
    setIsSubmitting(true);
    setStep(6); // show preparing screen immediately
    try {
      await onComplete();
      // The caller is responsible for navigating away. If we're still
      // mounted after it resolves, stay on Step 6 — navigation is imminent.
    } catch (err) {
      // Log for the dev sandbox and real runs alike. Real callers should
      // still navigate away (e.g. to /app/record) so the user isn't stuck.
      console.error('[OnboardingScreen] onComplete failed:', err);
    }
  }

  if (step === 1)
    return (
      <PageTransition>
        <OnboardingStep1 onBegin={() => setStep(2)} onHowItWorks={() => setStep(3)} />
      </PageTransition>
    );

  if (step === 2)
    return (
      <PageTransition>
        <OnboardingStep2 onContinue={() => setStep(4)} />
      </PageTransition>
    );

  if (step === 3)
    return (
      <PageTransition>
        <OnboardingStep3
          openAccordion={openAccordion}
          onToggleAccordion={(i) =>
            setOpenAccordion((prev) => (prev === i ? null : i))
          }
          onBegin={() => setStep(2)}
          onBack={() => setStep(1)}
        />
      </PageTransition>
    );

  if (step === 4)
    return (
      <PageTransition>
        <OnboardingStep4 onContinue={() => setStep(5)} onBack={() => setStep(2)} />
      </PageTransition>
    );

  if (step === 5)
    return (
      <PageTransition>
        <OnboardingStep5
          onBegin={handleComplete}
          onBack={() => setStep(4)}
          isLoading={isSubmitting}
        />
      </PageTransition>
    );

  return (
    <PageTransition>
      <OnboardingStep6 />
    </PageTransition>
  );
}

export default OnboardingScreen;

// ─── STEP 1 ─────────────────────────────────────────────────

function OnboardingStep1({
  onBegin,
  onHowItWorks,
}: {
  onBegin: () => void;
  onHowItWorks: () => void;
}) {
  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">ESSENCE</div>
      <h1 className="onboarding-title">Your voice is something only you can give.</h1>
      <p className="onboarding-subtitle">
        ESSENCE helps you save it so it can stay with the people you love.
      </p>

      <div className="onboarding-stone">
        <BreathStone state="idle" size={200} />
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>
        <SecondaryButton onClick={onHowItWorks}>How it works</SecondaryButton>
      </div>
    </div>
  );
}

// ─── STEP 2 ─────────────────────────────────────────────────

function OnboardingStep2({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="onboarding-step">
      <h1 className="onboarding-title">We will guide you through 25 moments.</h1>
      <p className="onboarding-subtitle">
        Each one captures a different part of your voice.
      </p>

      <div className="onboarding-stone">
        <BreathStone state="idle" size={200} />
      </div>

      <div className="onboarding-body">
        <p>This takes about 11 to 14 minutes.</p>
        <p>You can pause and return anytime.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

// ─── STEP 3 ─────────────────────────────────────────────────

function OnboardingStep3({
  openAccordion,
  onToggleAccordion,
  onBegin,
  onBack,
}: {
  openAccordion: number | null;
  onToggleAccordion: (i: number) => void;
  onBegin: () => void;
  onBack: () => void;
}) {
  const items = [
    {
      label: 'Capture your voice',
      body: 'You will shape 25 voice moments. Each prompt captures a different quality of how you speak.',
    },
    {
      label: 'Create messages',
      body: 'Once complete, your preserved voice can speak new messages anytime you wish.',
    },
    {
      label: 'Share with loved ones',
      body: 'Send messages that sound like you, created for moments that matter.',
    },
  ];

  return (
    <div className="onboarding-step">
      <h1 className="onboarding-title">How ESSENCE works</h1>

      <div className="onboarding-stone">
        <BreathStone state="idle" size={160} />
      </div>

      <div className="onboarding-accordions">
        {items.map((item, i) => (
          <div key={i} className="onboarding-accordion">
            <button
              className="onboarding-accordion__trigger"
              onClick={() => onToggleAccordion(i)}
              aria-expanded={openAccordion === i}
              type="button"
            >
              <span>{item.label}</span>
              <span className="onboarding-accordion__icon" aria-hidden="true">
                {openAccordion === i ? '−' : '+'}
              </span>
            </button>
            <div
              className={`onboarding-accordion__body ${openAccordion === i ? 'onboarding-accordion__body--open' : ''}`}
            >
              <p>{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onBegin}>Begin shaping your voice</PrimaryButton>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
      </div>
    </div>
  );
}

// ─── STEP 4 — SETTLING ──────────────────────────────────────

function OnboardingStep4({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const [linesVisible, setLinesVisible] = useState([false, false, false]);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setLinesVisible((p) => [true, p[1], p[2]]), 800),
      setTimeout(() => setLinesVisible((p) => [p[0], true, p[2]]), 1600),
      setTimeout(() => setLinesVisible((p) => [p[0], p[1], true]), 2400),
      setTimeout(() => setCtaVisible(true), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const lines = [
    { text: 'Find a quiet place. Sit comfortably. Relax your shoulders.', italic: false },
    { text: 'Take one slow breath in and let everything settle.', italic: false },
    {
      text: 'Speak in your natural tone, the way you would with someone you trust.',
      italic: true,
    },
  ];

  return (
    <div className="onboarding-step onboarding-step--centered">
      <div className="onboarding-eyebrow">VOICE PREPARATION</div>

      <div className="onboarding-stone">
        <BreathStone state="guidance" size={180} />
      </div>

      <div className="onboarding-settling-lines">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`onboarding-settling-line ${linesVisible[i] ? 'onboarding-settling-line--visible' : ''} ${line.italic ? 'onboarding-settling-line--italic' : ''}`}
          >
            {line.text}
          </p>
        ))}
      </div>

      <div
        className={`onboarding-ctas ${ctaVisible ? 'onboarding-ctas--visible' : 'onboarding-ctas--hidden'}`}
      >
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        <SecondaryButton onClick={onBack}>Back</SecondaryButton>
      </div>
    </div>
  );
}

// ─── STEP 5 — CHECKLIST ─────────────────────────────────────

function OnboardingStep5({
  onBegin,
  onBack,
  isLoading,
}: {
  onBegin: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const [itemsVisible, setItemsVisible] = useState([false, false, false]);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setItemsVisible((p) => [true, p[1], p[2]]), 300),
      setTimeout(() => setItemsVisible((p) => [p[0], true, p[2]]), 540),
      setTimeout(() => setItemsVisible((p) => [p[0], p[1], true]), 780),
      setTimeout(() => setCtaVisible(true), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const items = [
    { label: 'Distance', body: 'Hold your phone or mic six to eight inches from your mouth.' },
    { label: 'Environment', body: 'Pause if unexpected noise happens.' },
    { label: 'Presence', body: 'Let your voice flow without pressure.' },
  ];

  return (
    <div className="onboarding-step">
      <div className="onboarding-eyebrow">VOICE PREPARATION</div>

      <div className="onboarding-stone">
        <BreathStone state="guidance" size={160} />
      </div>

      <div className="onboarding-checklist-card">
        <div className="onboarding-checklist-header">Before you begin:</div>
        {items.map((item, i) => (
          <div
            key={i}
            className={`onboarding-checklist-item ${itemsVisible[i] ? 'onboarding-checklist-item--visible' : ''}`}
          >
            <div className="onboarding-checklist-label">{item.label}</div>
            <div className="onboarding-checklist-body">{item.body}</div>
          </div>
        ))}
      </div>

      <div
        className={`onboarding-ctas ${ctaVisible ? 'onboarding-ctas--visible' : 'onboarding-ctas--hidden'}`}
      >
        <PrimaryButton onClick={onBegin} isLoading={isLoading}>
          Begin voice training
        </PrimaryButton>
        <SecondaryButton onClick={onBack} disabled={isLoading}>
          Back
        </SecondaryButton>
      </div>
    </div>
  );
}

// ─── STEP 6 — PREPARING ─────────────────────────────────────

function OnboardingStep6() {
  return (
    <div className="onboarding-step onboarding-step--centered">
      <div className="onboarding-eyebrow">PREPARING</div>
      <h1 className="onboarding-title">Preparing your voice profile...</h1>
      <p className="onboarding-subtitle">Capturing tone, clarity, and room sound.</p>

      <div className="onboarding-stone">
        <BreathStone state="working" size={200} />
      </div>

      <p className="onboarding-microcopy">This only takes a moment.</p>
    </div>
  );
}
