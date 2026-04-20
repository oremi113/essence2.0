'use client';

import { useState } from 'react';
import { SealAnimation } from '@/components/vault/SealAnimation';

interface VaultSealedScreenProps {
  onCreateMessage: () => void;
  onGoHome: () => void;
}

export function VaultSealedScreen({
  onCreateMessage,
  onGoHome,
}: VaultSealedScreenProps) {
  const [animationComplete, setAnimationComplete] = useState(false);

  return (
    <section className="vault-screen vault-screen--sealed">
      <div className="vault-screen__inner">
        <div className="vault-sealed__object">
          <SealAnimation
            mode="animate"
            size={320}
            onComplete={() => setAnimationComplete(true)}
          />
        </div>
        <div
          className={`vault-sealed__content${
            animationComplete ? ' vault-sealed__content--visible' : ''
          }`}
        >
          <h1 className="vault-sealed__headline">Your voice is protected.</h1>
          <p className="vault-sealed__subhead">
            Your Voice Vault is sealed. Your preserved voice is protected.
          </p>
          <p className="vault-sealed__body">
            Take your time. When you&rsquo;re ready, you can create a message for
            someone you love. Your voice will be there.
          </p>
          <div className="vault-sealed__cta-group">
            <button type="button" className="vault-cta" onClick={onCreateMessage}>
              Create a message
            </button>
            <button type="button" className="vault-dismiss" onClick={onGoHome}>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
