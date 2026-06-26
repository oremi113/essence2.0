'use client';

/**
 * Home B — the completed-user hub (MASTER_SPEC §6.3, §4.2 Step 8).
 *
 * Production implementation of prototypes/essence-step8-home-b.html. Pure and
 * props-driven per CLAUDE.md: the screen owns layout, the arrival choreography,
 * and the vault-status register; every action bubbles out via callbacks (the
 * page owns navigation + data). Mirrors the prototype's copy, timing, motion.
 *
 * The stone is the shared canvas BreathStone in its `infused` state — the
 * completed, radiant form — not a forked CSS stone (FOLLOW_UPS #35). The
 * one-time "first arrival" beat is inline (warm ground settle + heavier
 * stagger + first-arrival line), never a blocking overlay (§6.4 handoff).
 */

import { useEffect, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { CATEGORY_LABEL } from '@/components/screens/shelf/types';
import type { HomeBScreenProps } from './HomeBScreen.types';
import { HOME_B_CSS } from './HomeBScreen.css';

const STONE_SIZE = 200;
const DEFAULT_MAX_SAVED = 3;

/**
 * Recent-hint date for the preview rows: "Today" / "Yesterday" / "3 days ago"
 * / "Last week" / "2 weeks ago", falling back to an absolute "Apr 23" for
 * anything older. Glance-able recency — distinct from the shelf's permanence
 * framing ("Kept on Apr 23, 2026"); the prototype drops duration here, since
 * length lives on the shelf next to playback.
 */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function avatarInitial(name: string | null): string {
  return name?.trim()?.charAt(0).toUpperCase() || '·';
}

function GearIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeBScreen({
  vaultState,
  messages,
  loadState,
  listError,
  onRetry,
  firstArrival = false,
  maxSaved = DEFAULT_MAX_SAVED,
  onCreate,
  onRestore,
  onOpenShelf,
  onOpenMessage,
  onWaitlist,
  onSettings,
  reducedMotionOverride,
}: HomeBScreenProps) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  // First-arrival ground settle: opens on the warm ceremonial ground, eases to
  // cream once the content is shown. Snaps straight to neutral under reduced
  // motion (the CSS transition is disabled there anyway).
  const [ground, setGround] = useState<'rich' | 'neutral'>(
    firstArrival && !reducedMotion ? 'rich' : 'neutral',
  );
  useEffect(() => {
    if (firstArrival && !reducedMotion && loadState === 'ready' && ground === 'rich') {
      const id = requestAnimationFrame(() => setGround('neutral'));
      return () => cancelAnimationFrame(id);
    }
  }, [firstArrival, reducedMotion, loadState, ground]);

  const cap = maxSaved;
  const preview = messages.slice(0, cap);
  const full = messages.length >= cap;

  // CTA precedence: at 3/3 the path is the waitlist (no create); otherwise a
  // lapsed vault gates creation behind restore; otherwise create. Trial (free
  // tier) gets the soft shimmer sweep.
  const ctaMode: 'create' | 'restore' | 'none' = full
    ? 'none'
    : vaultState === 'lapsed'
      ? 'restore'
      : 'create';
  const shimmer = ctaMode === 'create' && vaultState === 'trial';

  const rootClass = [
    'homeb',
    reducedMotion ? '' : 'is-playing',
    firstArrival && !reducedMotion ? 'is-heavy' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} data-ground={ground}>
      <style>{HOME_B_CSS}</style>

      {loadState === 'loading' && (
        <div className="homeb__system homeb__system--loading" aria-busy="true" aria-label="Loading your home">
          <div className="homeb__sk homeb__sk-stone" />
          <div className="homeb__sk homeb__sk-pill" />
          <div className="homeb__sk homeb__sk-cta" />
          <div className="homeb__sk-rows">
            <div className="homeb__sk homeb__sk-row" />
            <div className="homeb__sk homeb__sk-row" />
          </div>
        </div>
      )}

      {loadState === 'error' && (
        <div className="homeb__system homeb__system--error" role="alert">
          <div className="homeb__err-title">Your messages are safe</div>
          <div className="homeb__err-body">
            {listError ?? 'This didn’t load just now. Try again in a moment.'}
          </div>
          <button type="button" className="homeb__retry" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {loadState === 'ready' && (
        <>
          <div className="homeb__topbar arr">
            <button
              type="button"
              className="homeb__settings"
              onClick={onSettings}
              aria-label="Settings"
            >
              <GearIcon />
            </button>
          </div>

          <div className="homeb__stone-section arr">
            <div className="homeb__stone-wrap" aria-hidden="true">
              <BreathStone state="infused" size={STONE_SIZE} reducedMotion={reducedMotion} />
            </div>
          </div>

          <div className="homeb__status-wrap arr arr1">
            {vaultState === 'lapsed' ? (
              <div className="homeb__pill homeb__pill--lapsed">
                <span className="homeb__pill-main">Your messages are safe</span>
                <span className="homeb__pill-sub">Voice Vault · Paused</span>
              </div>
            ) : (
              <div className={`homeb__pill homeb__pill--${vaultState}`}>
                <span className="homeb__pill-dot" />
                <span>Voice Vault · {vaultState === 'trial' ? 'Trial' : 'Protected'}</span>
              </div>
            )}
          </div>

          {firstArrival && (
            <div className="homeb__first-line arr arr2">
              Your voice is kept. This is home now.
            </div>
          )}

          {ctaMode !== 'none' && (
            <div className="homeb__cta-wrap arr arr3">
              <button
                type="button"
                className={`homeb__cta${shimmer ? ' homeb__cta--shimmer' : ''}`}
                onClick={ctaMode === 'restore' ? onRestore : onCreate}
              >
                {ctaMode === 'restore' ? 'Bring it back' : 'Create a message'}
              </button>
            </div>
          )}

          <div className="homeb__archive arr arr4">
            <div className="homeb__archive-head">Your messages</div>

            <div className="homeb__rows">
              {preview.map((m) => {
                const meta = `${CATEGORY_LABEL[m.category]} · ${formatRelativeDate(m.createdAt)}`;
                const recipient = m.recipientName ?? 'Someone';
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="homeb__row"
                    onClick={() => onOpenMessage(m.id)}
                    aria-label={`Message for ${recipient}, ${meta}`}
                  >
                    <span className="homeb__avatar" aria-hidden="true">
                      {avatarInitial(m.recipientName)}
                    </span>
                    <span className="homeb__row-body">
                      <span className="homeb__row-recipient">{recipient}</span>
                      <span className="homeb__row-meta">{meta}</span>
                    </span>
                    <span className="homeb__chevron" aria-hidden="true">
                      {'›'}
                    </span>
                  </button>
                );
              })}
            </div>

            {full && (
              <div className="homeb__complete">
                <div className="homeb__complete-line">
                  Three, kept. Everything you set out to make is here.
                </div>
                <button type="button" className="homeb__waitlist" onClick={onWaitlist}>
                  Hear about what comes next
                </button>
              </div>
            )}

            <div className="homeb__shelf-link-wrap">
              <button type="button" className="homeb__shelf-link" onClick={onOpenShelf}>
                Open your Memory Shelf
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
