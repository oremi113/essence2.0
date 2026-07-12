'use client';

import { BronzeVault } from '@/components/vault/BronzeVault';

interface VaultRevealScreenProps {
  userName?: string;
  onAdvance: () => void;
}

export function VaultRevealScreen({ onAdvance }: VaultRevealScreenProps) {
  return (
    <section
      className="vault-screen vault-screen--reveal"
      onClick={onAdvance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onAdvance();
      }}
    >
      <div className="vault-screen__texture" aria-hidden="true" />
      <div className="vault-screen__inner">
        <div className="vault-reveal__object">
          <BronzeVault mode="open" size={320} />
        </div>
        <h1 className="vault-reveal__headline">Your Voice Vault</h1>
        <p className="vault-reveal__subline">This is where your voice is preserved.</p>
        <div className="vault-reveal__breath" aria-hidden="true" />
        <p className="vault-reveal__hold">For now, it&rsquo;s being kept with care.</p>
      </div>
      <div className="vault-reveal__scroll-cue" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
