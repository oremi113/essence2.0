/**
 * Privacy Promise — bottom-sheet modal opened from Screen 4's
 * "Read our privacy promise" link. Deliberately NOT a new route or a
 * full screen: overlays onboarding so wizard state is preserved. Close
 * via X button, backdrop tap, or Escape key.
 */
'use client';

import { useEffect } from 'react';
import { CloseIcon, ShieldIcon } from '@/components/icons';

export function PrivacyPromiseModal({ onClose }: { onClose: () => void }) {
  // Close on Escape. Lock background scroll so the onboarding flow
  // behind the sheet doesn't move while the user reads.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="privacy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <button
        type="button"
        className="privacy-modal__backdrop"
        onClick={onClose}
        aria-label="Close privacy promise"
      />
      <div className="privacy-modal__sheet">
        <div className="privacy-modal__handle" aria-hidden="true" />

        <button
          type="button"
          className="privacy-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <CloseIcon size={18} />
        </button>

        <div className="privacy-modal__content">
          <ShieldIcon className="privacy-modal__shield" size={16} />
          <div className="privacy-modal__eyebrow">OUR PRIVACY PROMISE</div>
          <h2 id="privacy-title" className="privacy-modal__title">
            Your voice belongs to you. Full stop.
          </h2>

          <div className="privacy-modal__body">
            {/* Copy trimmed 2026-07-12 to match implementation (no client-side/E2E
                encryption; deletion timing depends on the confirmed vendor backup
                window) — pending counsel sign-off. See
                docs/follow-ups/2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext.md
                and 2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone.md */}
            <p className="privacy-modal__intro">
              Your recordings are encrypted in transit and at rest, and tied to
              your account alone. Our team doesn&rsquo;t listen to them.
            </p>

            <ul className="privacy-modal__promises">
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  We will <span className="privacy-modal__emphasis">never</span> sell your voice data.
                </p>
                <p className="privacy-modal__proof">
                  Not to advertisers. Not to researchers. Not to anyone.
                </p>
              </li>
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  We will <span className="privacy-modal__emphasis">never</span> use your recordings to train AI models.
                </p>
                <p className="privacy-modal__proof">
                  Not to build a product. Not to sell you anything.
                </p>
              </li>
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  If you delete your account, your voice and recordings are{' '}
                  <span className="privacy-modal__emphasis">permanently gone</span>.
                </p>
              </li>
            </ul>

            <p className="privacy-modal__signature">
              ESSENCE was built by people who lost someone.
              <br />
              We know what this holds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
