/**
 * PrivacyPolicyScreen — /privacy.
 *
 * A thin content shell: it holds the placeholder Privacy Policy copy and hands
 * it to the shared LegalDocument renderer. No data-fetching, no side effects —
 * the page.tsx renders it directly.
 *
 * ⚠️ PLACEHOLDER COPY — flagged for owner. The sections below are a plausible,
 * on-brand draft written to the ESSENCE privacy voice (see the onboarding
 * PrivacyPromiseModal), NOT counsel-reviewed legal text. The owner replaces the
 * body and sets a real effective date before launch, then flips `placeholder`
 * off in LegalDocument. Tracked in docs/FOLLOW_UPS.md.
 */

import { ROUTES } from '@/lib/routes';
import { LegalDocument } from './LegalDocument';
import type { LegalSection } from './LegalDocument.types';

const SECTIONS: LegalSection[] = [
  {
    heading: 'What we collect',
    paragraphs: [
      'To create your account and keep your recordings safe, we collect your email address, the voice recordings and messages you choose to make, and basic technical information (such as device type and app activity) needed to run the service.',
      'We do not ask for more than the service requires, and we never listen to your recordings for any purpose other than delivering them to you and the people you choose.',
    ],
  },
  {
    heading: 'How we use your information',
    paragraphs: [
      'We use your information to give you access to your account, to store and deliver your recordings, to process your subscription, and to send you service messages such as receipts and important account notices.',
      'We do not build advertising profiles, and we do not sell or rent your personal information to anyone.',
    ],
  },
  {
    heading: 'What we will never do',
    paragraphs: [
      'We will never sell your voice data — not to advertisers, not to researchers, not to anyone.',
      'We will never use your recordings to train AI models, ours or anyone else’s.',
      'Not even our team can listen to your private recordings. They exist for you and the people you choose.',
    ],
  },
  {
    heading: 'How your recordings are stored',
    paragraphs: [
      'Your recordings are encrypted in transit and at rest. They are stored with our infrastructure providers solely to make them available to you and your chosen recipients.',
    ],
  },
  {
    heading: 'Service providers',
    paragraphs: [
      'We rely on a small number of trusted providers to operate ESSENCE — for example, secure storage and authentication, and payment processing through Stripe. These providers handle data only on our instructions and only to provide their service.',
    ],
  },
  {
    heading: 'Your choices and deletion',
    paragraphs: [
      'You can access your recordings at any time, and you can delete your account whenever you wish. When you delete your account, your voice recordings are permanently removed from our servers within 48 hours.',
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      'ESSENCE is intended for adults. It is not directed to children, and we do not knowingly collect information from anyone under the age required by law in their region.',
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      'If we make a meaningful change to how we handle your information, we will let you know and update the effective date above before the change takes effect.',
    ],
  },
  {
    heading: 'Contact us',
    paragraphs: [
      'Questions about your privacy? Reach us at the contact address ESSENCE publishes before launch. We read every message.',
    ],
  },
];

export function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effectiveLabel="Effective date — pending"
      intro="Your voice belongs to you. This policy explains, in plain language, what we collect, how we protect it, and the promises we will never break."
      sections={SECTIONS}
      backLabel="Back"
      related={{ label: 'Read our Terms of Service', href: ROUTES.terms }}
      placeholder
    />
  );
}

export default PrivacyPolicyScreen;
