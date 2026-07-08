/**
 * TermsScreen — /terms.
 *
 * Thin content shell over the shared LegalDocument renderer, holding the
 * placeholder Terms of Service copy. No data-fetching, no side effects.
 *
 * ⚠️ PLACEHOLDER COPY — flagged for owner. On-brand draft written to the
 * ESSENCE voice, NOT counsel-reviewed legal text. The owner replaces the body
 * and sets a real effective date before launch, then flips `placeholder` off in
 * LegalDocument. Tracked in docs/FOLLOW_UPS.md.
 */

import { ROUTES } from '@/lib/routes';
import { LegalDocument } from './LegalDocument';
import type { LegalSection } from './LegalDocument.types';

const SECTIONS: LegalSection[] = [
  {
    heading: 'Agreement to these terms',
    paragraphs: [
      'These terms are an agreement between you and ESSENCE. By creating an account or using the service, you agree to them. If you do not agree, please do not use ESSENCE.',
    ],
  },
  {
    heading: 'Your account',
    paragraphs: [
      'You are responsible for your account and for keeping access to your email secure, since we sign you in with a secure link rather than a password. Please let us know promptly if you believe someone else has accessed your account.',
    ],
  },
  {
    heading: 'Subscriptions and billing',
    paragraphs: [
      'Some features require a paid subscription. Payments are processed securely through Stripe. Your plan renews automatically at the end of each billing period unless you cancel beforehand.',
      'You can cancel at any time from your account. When you cancel, you keep access until the end of the period you have already paid for. Refund eligibility is described at the point of purchase and follows applicable law.',
    ],
  },
  {
    heading: 'Your recordings and content',
    paragraphs: [
      'Your recordings and messages are yours. You keep ownership of everything you create. You grant ESSENCE only the limited permission needed to store your content and deliver it to the recipients you choose.',
      'You are responsible for the content you record and for having the right to share it with the people you name.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: [
      'Please use ESSENCE only for its intended purpose. Do not use it to break the law, to harm or harass others, or to interfere with the security or operation of the service.',
    ],
  },
  {
    heading: 'The Vault and message delivery',
    paragraphs: [
      'ESSENCE is designed to safeguard your recordings and deliver the messages you choose. While we work hard to keep the service reliable and your content safe, no digital service can promise perfect, uninterrupted availability, and specific delivery arrangements are described where you set them up.',
    ],
  },
  {
    heading: 'Ending your use',
    paragraphs: [
      'You may stop using ESSENCE and delete your account at any time. We may suspend or end access if these terms are seriously or repeatedly broken, and we will act reasonably and give notice where we can.',
    ],
  },
  {
    heading: 'Service “as is” and liability',
    paragraphs: [
      'ESSENCE is provided as a service that we improve over time. To the extent permitted by law, we limit our liability as described in the final terms. Nothing here removes rights that the law guarantees you.',
    ],
  },
  {
    heading: 'Changes to these terms',
    paragraphs: [
      'If we make a meaningful change to these terms, we will let you know and update the effective date above before the change takes effect.',
    ],
  },
  {
    heading: 'Contact us',
    paragraphs: [
      'Questions about these terms? Reach us at the contact address ESSENCE publishes before launch.',
    ],
  },
];

export function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      effectiveLabel="Effective date — pending"
      intro="These terms explain the agreement between you and ESSENCE when you use the service. We have kept them as plain as we can."
      sections={SECTIONS}
      backLabel="Back"
      related={{ label: 'Read our Privacy Policy', href: ROUTES.privacy }}
      placeholder
    />
  );
}

export default TermsScreen;
