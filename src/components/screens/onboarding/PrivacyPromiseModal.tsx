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
            {/* Copy is the canonical truth-pass from
                docs/legal/ESSENCE_Compliance_Implementation_Pack.md Part 2 —
                every claim below is true against the code (see the
                2026-07-12 legal-questionnaire findings). Do not restore
                "end-to-end encryption", "not even our team can access", or an
                unqualified "48 hours" purge; none of those are true. */}
            <p className="privacy-modal__intro">
              Your recordings are encrypted in transit and at rest, and only
              your account can reach them. We don&rsquo;t listen to them, and
              nothing in ESSENCE plays your voice to anyone but you.
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
                  We turned model training off at our voice provider before ESSENCE opened.
                </p>
              </li>
              <li className="privacy-modal__promise">
                <p className="privacy-modal__commitment">
                  If you delete your account, your voice and recordings are{' '}
                  <span className="privacy-modal__emphasis">permanently gone</span>.
                </p>
                <p className="privacy-modal__proof">
                  We erase them right away and tell our voice provider to delete
                  your voice model. Routine backups clear within about a week.
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
