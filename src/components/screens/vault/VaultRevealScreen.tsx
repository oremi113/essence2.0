'use client';

import { BronzeVault } from '@/components/vault/BronzeVault';

interface VaultRevealScreenProps {
  userName?: string;
  onAdvance: () => void;
}

/**
 * The Reveal — the post-payment payoff, and the last beat before the First
 * Breath ceremony (first playback).
 *
 * The forward affordance is a real CTA, not the prototype's chevron. The
 * prototype (`prototypes/old-monetization-trigger.html` §SCREEN 4) is a
 * `scroll-snap-type: y mandatory` deck, so a downward chevron there literally
 * meant "scroll to the next screen". Production made this a standalone route
 * that advances on tap — the chevron survived the port and ended up naming a
 * gesture that does nothing, drawn in `--color-text-tertiary` (a *disabled*
 * token) at 1.34:1 against this ceremonial ground. Invisible, and pointing at
 * the wrong interaction.
 *
 * "Hear your voice" is the Copy Guide's model primary verb for exactly this
 * moment (§7 + §5 "specific verbs"), and it names what actually comes next.
 *
 * Tapping anywhere still advances — the ceremony shouldn't punish an
 * exploratory tap — but the button carries the semantics, the focus ring, and
 * the accessible name.
 */
export function VaultRevealScreen({ onAdvance }: VaultRevealScreenProps) {
  return (
    <section className="vault-screen vault-screen--reveal" onClick={onAdvance}>
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
      {/*
        Held back ~3.4s so the reveal lands before it asks for anything — the
        Copy Guide's "hold the peak before the next line" rule, and the same
        beat the prototype gave its cue (3500ms). The delay is CSS-only
        (opacity + transform), so it costs nothing on a throttled phone and
        needs no timer to clean up. The button is present and operable the
        whole time; only its paint is delayed.
      */}
      <button
        type="button"
        className="vault-reveal__cta"
        onClick={(e) => {
          e.stopPropagation(); // the section is also a tap target — don't advance twice
          onAdvance();
        }}
      >
        Hear your voice
      </button>
    </section>
  );
}
