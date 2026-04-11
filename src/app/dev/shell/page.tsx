import {
  ScreenHeader,
  PageTransition,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui';

export default function ShellGalleryPage() {
  return (
    <PageTransition>
      <ScreenHeader
        eyebrow="Stage 1 of 3"
        title="Your voice holds more than you realize."
        subtitle="This is where sessions begin."
        backLabel="Home"
        backHref="/home"
      />

      <div
        style={{
          marginTop: 32,
          padding: 24,
          background: 'var(--color-surface-card)',
          borderRadius: 16,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Shell gallery. Background should be cream, not white. Title in Spectral.
          Back button visible above.
        </p>
      </div>

      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryButton>Continue</PrimaryButton>
        <PrimaryButton isLoading>Loading</PrimaryButton>
        <PrimaryButton disabled>Disabled</PrimaryButton>
        <SecondaryButton>Go back</SecondaryButton>
      </div>
    </PageTransition>
  );
}
