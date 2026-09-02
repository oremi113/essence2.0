'use client';

/**
 * Settings & Trust — the control + reassurance surface (Step 9).
 *
 * Production implementation of prototypes/essence-step9-settings-trust.html.
 * Pure and props-driven per CLAUDE.md: the screen owns layout, the confirmation
 * -sheet experience (dialog semantics, focus trap, Esc, the delete two-beat, the
 * email "link sent" beat), the light section arrival, and the calm state
 * register; every side effect bubbles out via callbacks (the page owns Supabase
 * / Stripe / routing). Mirrors the prototype’s copy, layout, grouping, state
 * expression, and motion — no new grammar.
 *
 * Copy locks (prototype header): trial ends as a DATE FACT, never a countdown;
 * the restore verb is "Bring it back"; "Voice Vault" appears once per screen (the
 * status pill carries it); the Sign-in row is display-only (magic-link → no
 * password). Risky controls never use loud red and lead with the KEEP action.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import type {
  NotificationKey,
  NotificationSettings,
  SettingsScreenProps,
  SubscriptionData,
} from './SettingsScreen.types';
import { SETTINGS_CSS } from './SettingsScreen.css';
import { LegalFooter } from '@/components/ui/LegalFooter';

type Overlay = 'none' | 'cancel' | 'photo' | 'email' | 'delete';
type Terminal = null | 'closed' | 'failed';
type EmailPhase = 'form' | 'sending' | 'sent';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "$12.99" for 1299, "$119" for 11900 (drop a whole-dollar’s trailing .00). */
function formatMoney(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

/** "June 14" (near dates) or "June 14, 2027" (annual renewal carries the year). */
function formatDate(iso: string | null, withYear = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Format in UTC: these are calendar-date FACTS ("ends June 14"), so a
  // date-only value (2026-06-14 → UTC midnight) must not slip to the previous
  // day when the viewer sits behind UTC.
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

type PlanVariant =
  | 'trial'
  | 'active-monthly'
  | 'active-annual'
  | 'past_due'
  | 'lapsed'
  | 'cancelled';

function planVariant(sub: SubscriptionData): PlanVariant {
  switch (sub.status) {
    case 'active':
      return sub.plan === 'annual' ? 'active-annual' : 'active-monthly';
    case 'past_due':
      return 'past_due';
    case 'lapsed':
      return 'lapsed';
    case 'cancelled':
      return 'cancelled';
    case 'trial':
    default:
      return 'trial';
  }
}

function avatarInitial(email: string): string {
  return email.trim().charAt(0).toUpperCase() || '·';
}

function BackIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/** Small closed padlock for the slim trust residual — quiet "safe, and yours". */
function LockIcon() {
  return (
    <svg
      className="set__trust-lock"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function FOCUSABLE(scope: HTMLElement): HTMLElement[] {
  return Array.from(
    scope.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
}

export function SettingsScreen(props: SettingsScreenProps) {
  const {
    email,
    photoUrl,
    subscription,
    notifications,
    loadState,
    loadError,
    cardUpdatedNotice = false,
    trustBandSeen = false,
    onBack,
    onRetry,
    onTrustBandSeen,
    onUpdateCard,
    onCancelSubscription,
    onResume,
    onDismissCardNotice,
    onToggleNotification,
    onChangeEmail,
    onRemovePhoto,
    onAddPhoto,
    onSignOut,
    onDeleteAccount,
    onReturnToSignIn,
    deleteEnabled = true,
    reducedMotionOverride,
  } = props;

  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  const rootRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const uid = useId();

  // ── overlay + flow state (presentation, screen-internal) ──────────────────
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteText, setDeleteText] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [terminal, setTerminal] = useState<Terminal>(null);

  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [emailValue, setEmailValue] = useState('');
  const [emailPhase, setEmailPhase] = useState<EmailPhase>('form');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState('');

  // Optimistic switch state, seeded from props; the change bubbles out.
  const [notif, setNotif] = useState<NotificationSettings>(notifications);
  useEffect(() => setNotif(notifications), [notifications]);

  // Trust band: full on first visit, slim on every return. Latch it exactly once
  // when the full band actually renders (content ready, no terminal) — the band
  // stays full for THIS visit; the page persists so the next load is slim.
  const trustSeenFired = useRef(false);
  useEffect(() => {
    if (trustBandSeen || trustSeenFired.current) return;
    if (loadState !== 'ready' || terminal !== null) return;
    trustSeenFired.current = true;
    onTrustBandSeen?.();
  }, [trustBandSeen, loadState, terminal, onTrustBandSeen]);

  const deleteReady = deleteText.trim().toLowerCase() === 'delete';

  // ── focus management: move in, trap Tab, Esc closes, return on close ───────
  const closeOverlay = useCallback(() => {
    setOverlay((cur) => {
      if (cur !== 'none' && lastFocused.current) {
        const el = lastFocused.current;
        // Return focus after the state flush so the invoking control exists.
        requestAnimationFrame(() => {
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }
        });
      }
      return 'none';
    });
  }, []);

  const openOverlay = useCallback((name: Exclude<Overlay, 'none'>) => {
    lastFocused.current = document.activeElement as HTMLElement | null;
    setOverlay(name);
  }, []);

  const openDelete = useCallback(
    (step: 1 | 2) => {
      lastFocused.current = document.activeElement as HTMLElement | null;
      setDeleteText('');
      setDeleteStep(step);
      setOverlay('delete');
    },
    [],
  );

  function activeScope(): HTMLElement | null {
    const root = rootRef.current;
    if (!root || overlay === 'none') return null;
    if (overlay === 'delete') {
      return root.querySelector<HTMLElement>(`.set__beat[data-active="true"]`);
    }
    return root.querySelector<HTMLElement>('.set__scrim.is-open .set__sheet');
  }

  // Move focus into the open sheet: prefer an input in the active beat, else the
  // sheet container (tabindex -1) so the dialog title is announced.
  useEffect(() => {
    if (overlay === 'none') return;
    const id = window.setTimeout(() => {
      const scope = activeScope();
      if (!scope) return;
      const input = scope.querySelector<HTMLElement>('input');
      const sheet =
        rootRef.current?.querySelector<HTMLElement>('.set__scrim.is-open .set__sheet') ?? null;
      const target = input ?? sheet;
      if (target) {
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      }
    }, 60);
    return () => window.clearTimeout(id);
    // Re-run when the active surface changes (beat swap, email form→sent).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, deleteStep, emailPhase]);

  useEffect(() => {
    if (overlay === 'none') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
        return;
      }
      if (e.key !== 'Tab') return;
      const scope = activeScope();
      if (!scope) return;
      const f = FOCUSABLE(scope);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || f.indexOf(active) === -1) {
        // Focus is on the sheet container (tabindex -1): the first Tab enters the
        // trap rather than escaping behind it.
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, deleteStep, emailPhase, closeOverlay]);

  // ── action handlers ───────────────────────────────────────────────────────
  function toggleNotif(key: NotificationKey) {
    const next = !notif[key];
    setNotif((n) => ({ ...n, [key]: next }));
    onToggleNotification(key, next);
  }

  async function confirmCancel() {
    setCancelError(null);
    setCancelPending(true);
    const res = await onCancelSubscription();
    setCancelPending(false);
    if (res.ok) {
      closeOverlay();
    } else {
      setCancelError(res.error ?? "That didn’t go through. Your subscription is unchanged. Try again.");
    }
  }

  async function confirmRemovePhoto() {
    setPhotoError(null);
    setPhotoPending(true);
    const res = await onRemovePhoto();
    setPhotoPending(false);
    if (res.ok) {
      closeOverlay();
    } else {
      setPhotoError(res.error ?? "That didn’t go through. Your photo is unchanged. Try again.");
    }
  }

  function openEmail() {
    setEmailValue('');
    setEmailError(null);
    setEmailPhase('form');
    openOverlay('email');
  }

  async function submitEmail() {
    // Guard the Enter-key path: the button is disabled while sending, but the
    // input's keydown isn't, so a fast double-Enter could fire two requests.
    if (emailPhase === 'sending') return;
    const value = emailValue.trim();
    if (!value) {
      setEmailError('Enter the email address you’d like to use.');
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setEmailError('That doesn’t look like an email address. Check it and try again.');
      return;
    }
    if (value.toLowerCase() === email.trim().toLowerCase()) {
      setEmailError('That’s already your email.');
      return;
    }
    setEmailError(null);
    setEmailPhase('sending');
    const res = await onChangeEmail(value);
    if (res.ok) {
      setEmailSentTo(value);
      setEmailPhase('sent');
    } else {
      setEmailPhase('form');
      setEmailError(res.error ?? "We couldn’t send the link just now. Try again in a moment.");
    }
  }

  async function confirmDelete() {
    if (!deleteReady || deletePending) return;
    setDeletePending(true);
    const res = await onDeleteAccount();
    setDeletePending(false);
    // Never render "closed" without an ok result — the page must not resolve ok
    // until the fallible teardown has actually succeeded (FOLLOW_UPS #43/45/66).
    setOverlay('none');
    setDeleteStep(1);
    setDeleteText('');
    setTerminal(res.ok ? 'closed' : 'failed');
  }

  // ── derived view ──────────────────────────────────────────────────────────
  const variant = planVariant(subscription);
  const showContent = terminal === null && loadState === 'ready';
  const contentClass = `set__content${reducedMotion ? '' : ' is-arriving'}`;
  const money = formatMoney(subscription.priceMonthlyCents);
  const annualMoney = formatMoney(subscription.priceAnnualCents);
  const annualMonthly = `$${Math.round(subscription.priceAnnualCents / 12 / 100)}`;
  const cancelKeepUntil = formatDate(
    subscription.paidThroughAt ?? subscription.renewsAt ?? subscription.trialEndsAt,
  );

  const cancelTitleId = `${uid}-cancel`;
  const photoTitleId = `${uid}-photo`;
  const emailTitleId = `${uid}-email`;
  const deleteTitleId = `${uid}-delete-${deleteStep}`;

  return (
    <div className="set" ref={rootRef}>
      <style>{SETTINGS_CSS}</style>

      {/* ── loading ── */}
      {terminal === null && loadState === 'loading' && (
        <div className="set__system" aria-busy="true" aria-label="Loading your settings">
          <div className="set__topbar">
            <span className="set__title" style={{ color: 'var(--color-text-secondary)' }}>
              Settings
            </span>
          </div>
          <div className="set__sk-band" />
          <div className="set__sk">
            <div className="set__sk-pad">
              <div className="set__sk-line" style={{ width: '40%' }} />
              <div className="set__sk-line" style={{ width: '70%' }} />
              <div className="set__sk-line" style={{ width: '55%', marginBottom: 0 }} />
            </div>
          </div>
          <div className="set__sk">
            <div className="set__sk-pad">
              <div className="set__sk-line" style={{ width: '60%' }} />
              <div className="set__sk-line" style={{ width: '48%', marginBottom: 0 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── error ── */}
      {terminal === null && loadState === 'error' && (
        <div className="set__system" role="alert">
          <div className="set__centered">
            <h2>Your messages are safe</h2>
            <p>{loadError ?? "This didn’t load just now. Try again in a moment."}</p>
            <button type="button" className="set__btn set__btn--primary" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── terminal: account closed ── */}
      {terminal === 'closed' && (
        <div className="set__system" role="status">
          <div className="set__centered">
            <h2>Your account is closed</h2>
            <p>Your voice and your messages have been erased. Take good care.</p>
            <button
              type="button"
              className="set__btn set__btn--quiet"
              style={{ maxWidth: 240 }}
              onClick={onReturnToSignIn}
            >
              Return to sign in
            </button>
          </div>
        </div>
      )}

      {/* ── terminal: delete couldn’t finish (partial-failure) ── */}
      {terminal === 'failed' && (
        <div className="set__system" role="alert">
          <div className="set__centered">
            <h2>Your account is still here</h2>
            <p>
              We couldn’t finish closing it just now. Nothing was lost, and everything is just as it
              was. You can try again, or reach us and we’ll take care of it.
            </p>
            <button
              type="button"
              className="set__btn set__btn--primary"
              style={{ maxWidth: 260 }}
              onClick={() => {
                setTerminal(null);
                openDelete(2);
              }}
            >
              Try again
            </button>
            <button
              type="button"
              className="set__btn set__btn--quiet"
              style={{ maxWidth: 240 }}
              onClick={() => setTerminal(null)}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ── main content ── */}
      {showContent && (
        <div className={contentClass}>
          <div className="set__topbar">
            <button type="button" className="set__back" onClick={onBack} aria-label="Back to home">
              <BackIcon />
            </button>
            <span className="set__title">Settings</span>
          </div>

          {cardUpdatedNotice && (
            <div className="set__notice" role="status">
              <span className="set__notice-dot" aria-hidden="true" />
              <span>Your card is updated.</span>
              {onDismissCardNotice && (
                <button
                  type="button"
                  className="set__row-action"
                  style={{ marginLeft: 'auto' }}
                  onClick={onDismissCardNotice}
                  aria-label="Dismiss"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* TRUST BAND (anchor; carries no Vault proper noun). Full on the first
              visit; a slim one-line residual on every return (trustBandSeen). */}
          {trustBandSeen ? (
            <div className="set__trust set__trust--slim">
              <LockIcon />
              <p className="set__trust-sub">Yours to manage, and yours alone.</p>
            </div>
          ) : (
            <div className="set__trust">
              <p className="set__trust-lead">
                Your voice and your messages are yours. They stay safe here, and nothing happens to
                them without you.
              </p>
              <p className="set__trust-sub">Yours to manage, and yours alone.</p>
            </div>
          )}

          {/* PLAN */}
          <section className="set__section" aria-label="Your plan">
            <div className="set__eyebrow">Your plan</div>
            <div className="set__card">{renderPlan()}</div>
          </section>

          {/* NOTIFICATIONS */}
          <section className="set__section" aria-label="Notifications">
            <div className="set__eyebrow">Notifications</div>
            <div className="set__card">
              <div className="set__row">
                <div className="set__row-main">
                  <span className="set__row-label">Trial and renewal reminders</span>
                  <span className="set__row-value">
                    A gentle heads-up before anything is charged
                  </span>
                </div>
                <button
                  type="button"
                  className="set__switch"
                  role="switch"
                  aria-checked={notif.trialReminders}
                  aria-label="Trial and renewal reminders"
                  onClick={() => toggleNotif('trialReminders')}
                />
              </div>
              <div className="set__row">
                <div className="set__row-main">
                  <span className="set__row-label">Payment notices</span>
                  <span className="set__row-value">Only if a payment needs your attention</span>
                </div>
                <button
                  type="button"
                  className="set__switch"
                  role="switch"
                  aria-checked={notif.paymentNotices}
                  aria-label="Payment notices"
                  onClick={() => toggleNotif('paymentNotices')}
                />
              </div>
              <div className="set__row-foot">These are the only emails we send.</div>
            </div>
          </section>

          {/* ACCOUNT */}
          <section className="set__section" aria-label="Account">
            <div className="set__eyebrow">Account</div>
            <div className="set__card">
              <div className="set__row">
                <div className="set__row-main">
                  <span className="set__row-label">Email</span>
                  <span className="set__row-value">{email}</span>
                </div>
                <button type="button" className="set__row-action" onClick={openEmail}>
                  Change
                </button>
              </div>
              <div className="set__row">
                <div className="set__row-main">
                  <span className="set__row-label">Sign-in</span>
                  <span className="set__row-value">
                    We email a secure link each time. No password to remember.
                  </span>
                </div>
              </div>
              <div className="set__row set__photo-row">
                <div className="set__row-main">
                  <span className="set__avatar" aria-hidden="true">
                    {/* Signed, short-lived Supabase Storage URL — a plain <img>
                        avoids adding the bucket host to next/image remotePatterns
                        for a 40px thumbnail. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {photoUrl ? <img src={photoUrl} alt="" /> : avatarInitial(email)}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="set__row-label">Photo</span>
                    <span className="set__row-value">Shown on your home</span>
                  </div>
                </div>
                {photoUrl ? (
                  <button
                    type="button"
                    className="set__row-action"
                    onClick={() => {
                      setPhotoError(null);
                      openOverlay('photo');
                    }}
                  >
                    Remove
                  </button>
                ) : (
                  onAddPhoto && (
                    <button type="button" className="set__row-action" onClick={onAddPhoto}>
                      Add
                    </button>
                  )
                )}
              </div>
            </div>
          </section>

          {/* MANAGE (quiet) */}
          <section className="set__section set__section--manage" aria-label="Manage">
            <div className="set__card">
              <div className="set__row">
                <div className="set__row-main">
                  <span className="set__row-label">Sign out</span>
                </div>
                <button
                  type="button"
                  className="set__row-action set__row-action--signout"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </div>
              {deleteEnabled && (
                <div className="set__row">
                  <div className="set__row-main">
                    <span className="set__row-label">Delete account</span>
                    <span className="set__row-value">Leave and erase everything</span>
                  </div>
                  <button
                    type="button"
                    className="set__row-action set__row-action--delete"
                    onClick={() => openDelete(1)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </section>

          <LegalFooter />
        </div>
      )}

      {/* ═══════════ OVERLAYS / SHEETS (kept mounted for slide transitions) ═══════════ */}

      {/* cancel */}
      <div
        className={`set__scrim${overlay === 'cancel' ? ' is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOverlay();
        }}
      >
        <div
          className="set__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={cancelTitleId}
          tabIndex={-1}
        >
          <h3 id={cancelTitleId}>Cancel your subscription?</h3>
          <p className="reassure">
            {cancelKeepUntil
              ? `Your messages stay safe. You’ll keep access until ${cancelKeepUntil}, and you can come back anytime.`
              : 'Your messages stay safe. You keep access through the date you’ve paid for, and you can come back anytime.'}
          </p>
          {cancelError && <div className="set__field-error">{cancelError}</div>}
          <div className="set__sheet-actions">
            <button type="button" className="set__btn set__btn--primary" onClick={closeOverlay}>
              Keep my subscription
            </button>
            <button
              type="button"
              className="set__btn set__btn--quiet"
              onClick={confirmCancel}
              disabled={cancelPending}
            >
              {cancelPending ? <span className="set__btn-spinner" aria-hidden="true" /> : 'Cancel subscription'}
            </button>
          </div>
        </div>
      </div>

      {/* remove photo */}
      <div
        className={`set__scrim${overlay === 'photo' ? ' is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOverlay();
        }}
      >
        <div
          className="set__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={photoTitleId}
          tabIndex={-1}
        >
          <h3 id={photoTitleId}>Remove your photo?</h3>
          <p>You can add one again later, whenever you like.</p>
          {photoError && <div className="set__field-error">{photoError}</div>}
          <div className="set__sheet-actions">
            <button type="button" className="set__btn set__btn--primary" onClick={closeOverlay}>
              Keep photo
            </button>
            <button
              type="button"
              className="set__btn set__btn--quiet"
              onClick={confirmRemovePhoto}
              disabled={photoPending}
            >
              {photoPending ? <span className="set__btn-spinner" aria-hidden="true" /> : 'Remove photo'}
            </button>
          </div>
        </div>
      </div>

      {/* change email — real surface (magic-link identity change), form → sent */}
      <div
        className={`set__scrim${overlay === 'email' ? ' is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOverlay();
        }}
      >
        <div
          className="set__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={emailTitleId}
          tabIndex={-1}
        >
          <div className="set__delete-stack">
            {/* beat: form */}
            <div className="set__beat" data-active={emailPhase !== 'sent'}>
              <h3 id={emailTitleId}>Change your email</h3>
              <p>
                Enter the new address you’d like to use. We’ll send a link there to confirm it’s
                yours. Until you tap that link, your current email keeps working.
              </p>
              <input
                className={`set__field${emailError ? ' set__field--error' : ''}`}
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-label="New email address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={emailValue}
                onChange={(e) => {
                  setEmailValue(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void submitEmail();
                  }
                }}
              />
              {emailError && <div className="set__field-error">{emailError}</div>}
              <div className="set__sheet-actions">
                <button
                  type="button"
                  className="set__btn set__btn--primary"
                  onClick={() => void submitEmail()}
                  disabled={emailPhase === 'sending'}
                >
                  {emailPhase === 'sending' ? (
                    <span className="set__btn-spinner" aria-hidden="true" />
                  ) : (
                    'Send the link'
                  )}
                </button>
                <button type="button" className="set__btn set__btn--quiet" onClick={closeOverlay}>
                  Not now
                </button>
              </div>
            </div>
            {/* beat: sent (confirmation) */}
            <div className="set__beat" data-active={emailPhase === 'sent'}>
              <h3>Check your inbox</h3>
              <p className="reassure">
                We sent a link to {emailSentTo}. Tap it to confirm. Until you do, your current email
                keeps working, so nothing changes yet.
              </p>
              <div className="set__sheet-actions">
                <button type="button" className="set__btn set__btn--primary" onClick={closeOverlay}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* delete — one scrim, two beats crossfade in place */}
      <div
        className={`set__scrim${overlay === 'delete' ? ' is-open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOverlay();
        }}
      >
        <div
          className="set__sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={deleteTitleId}
          tabIndex={-1}
        >
          <div className="set__delete-stack">
            {/* beat 1 */}
            <div className="set__beat" data-active={deleteStep === 1}>
              <h3 id={`${uid}-delete-1`}>Delete your account?</h3>
              <p className="reassure">
                This erases your account, your voice, and all of your messages.
              </p>
              <p>It can’t be undone. Nothing is kept, and nothing can be brought back.</p>
              <div className="set__sheet-actions">
                <button type="button" className="set__btn set__btn--primary" onClick={closeOverlay}>
                  Keep my account
                </button>
                <button
                  type="button"
                  className="set__btn set__btn--quiet"
                  onClick={() => setDeleteStep(2)}
                >
                  Continue
                </button>
              </div>
            </div>
            {/* beat 2 — type-to-confirm (case-insensitive; word shown lowercase) */}
            <div className="set__beat" data-active={deleteStep === 2}>
              <h3 id={`${uid}-delete-2`}>One last step</h3>
              <p>
                To confirm, type the word <strong>delete</strong> below. This erases everything and
                can’t be undone.
              </p>
              <input
                className="set__field"
                type="text"
                placeholder="delete"
                aria-label="Type delete to confirm"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
              />
              <div className="set__field-hint">
                You’re in control. You can close this and nothing happens.
              </div>
              <div className="set__sheet-actions">
                <button type="button" className="set__btn set__btn--quiet" onClick={closeOverlay}>
                  Keep my account
                </button>
                <button
                  type="button"
                  className="set__btn set__btn--warn"
                  disabled={!deleteReady || deletePending}
                  onClick={() => void confirmDelete()}
                >
                  {deletePending ? (
                    <span className="set__btn-spinner" aria-hidden="true" />
                  ) : (
                    'Delete everything'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── plan card body per variant ────────────────────────────────────────────
  function renderPlan() {
    const card = subscription.card;
    const cardLine = card ? `${card.brand} ending ${card.last4}` : 'No card on file';

    const paymentRow = (
      <div className="set__row">
        <div className="set__row-main">
          <span className="set__row-label">Payment method</span>
          <span className="set__row-value">{cardLine}</span>
        </div>
        <button type="button" className="set__row-action" onClick={onUpdateCard}>
          Update
        </button>
      </div>
    );

    const cancelRow = (
      <div className="set__row">
        <div className="set__row-main">
          <span className="set__row-label">Cancel subscription</span>
        </div>
        <button
          type="button"
          className="set__row-action"
          onClick={() => {
            setCancelError(null);
            openOverlay('cancel');
          }}
        >
          Cancel
        </button>
      </div>
    );

    switch (variant) {
      case 'trial':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill">
                <span className="set__pill-dot" />
                Voice Vault · Trial
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-line">
                {formatDate(subscription.trialEndsAt)
                  ? `Free trial · ends ${formatDate(subscription.trialEndsAt)}`
                  : 'Free trial'}
              </div>
              <div className="set__plan-line sub">
                Your card won’t be charged until then. After that it’s {money} a month.
              </div>
            </div>
            {paymentRow}
            {cancelRow}
            <div className="set__row-foot">
              Cancel during your trial and your card is never charged. Your messages stay safe.
            </div>
          </>
        );
      case 'active-monthly':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill set__pill--protected">
                <span className="set__pill-dot" />
                Voice Vault · Protected
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-line">
                {formatDate(subscription.renewsAt)
                  ? `Renews ${formatDate(subscription.renewsAt)} · ${money} a month`
                  : `${money} a month`}
              </div>
            </div>
            {paymentRow}
            {cancelRow}
            <div className="set__row-foot">
              If you ever cancel, your messages stay safe and you keep access through the date you’ve
              paid for.
            </div>
          </>
        );
      case 'active-annual':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill set__pill--protected">
                <span className="set__pill-dot" />
                Voice Vault · Protected
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-line">
                {formatDate(subscription.renewsAt, true)
                  ? `Renews ${formatDate(subscription.renewsAt, true)} · ${annualMoney} a year`
                  : `${annualMoney} a year`}
              </div>
              <div className="set__plan-line sub">
                That’s about {annualMonthly} a month to keep your voice safe.
              </div>
            </div>
            {paymentRow}
            {cancelRow}
            <div className="set__row-foot">
              If you ever cancel, your messages stay safe and you keep access through the date you’ve
              paid for.
            </div>
          </>
        );
      case 'past_due':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill set__pill--protected">
                <span className="set__pill-dot" />
                Voice Vault · Protected
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-fixable">
                We couldn’t process your last payment. Update your card to keep your voice safe.
              </div>
            </div>
            <div className="set__row">
              <div className="set__row-main">
                <span className="set__row-label">Payment method</span>
                <span className="set__row-value">{cardLine}</span>
              </div>
            </div>
            <div className="set__action-stack">
              <button type="button" className="set__btn set__btn--primary" onClick={onUpdateCard}>
                Update card
              </button>
            </div>
            <div className="set__row-foot">
              Your messages are safe either way. We’ll keep trying gently in the background.
            </div>
          </>
        );
      case 'lapsed':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill set__pill--paused">
                <span className="set__pill-main">Your messages are safe</span>
                <span className="set__pill-sub">Voice Vault · Paused</span>
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-line">
                It’s paused for now. You can bring it back whenever you’re ready.
              </div>
            </div>
            <div className="set__action-stack">
              <button type="button" className="set__btn set__btn--primary" onClick={onResume}>
                Bring it back
              </button>
            </div>
            <div className="set__row-foot">Everything you’ve made is kept just as you left it.</div>
          </>
        );
      case 'cancelled':
        return (
          <>
            <div className="set__plan-head">
              <span className="set__pill set__pill--paused">
                <span className="set__pill-main">Your messages are safe</span>
                <span className="set__pill-sub">
                  {formatDate(subscription.paidThroughAt)
                    ? `Voice Vault · Open until ${formatDate(subscription.paidThroughAt)}`
                    : 'Voice Vault · Open'}
                </span>
              </span>
            </div>
            <div className="set__plan-body">
              <div className="set__plan-line">
                {formatDate(subscription.paidThroughAt)
                  ? `You’ve cancelled. You’ll keep access until ${formatDate(subscription.paidThroughAt)}, and your messages stay safe after that.`
                  : 'You’ve cancelled. Your messages stay safe.'}
              </div>
            </div>
            <div className="set__action-stack">
              <button type="button" className="set__btn set__btn--primary" onClick={onResume}>
                Bring it back
              </button>
            </div>
            <div className="set__row-foot">The door stays open. Come back whenever you’re ready.</div>
          </>
        );
      default:
        return null;
    }
  }
}
