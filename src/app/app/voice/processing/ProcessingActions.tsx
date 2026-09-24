'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Processing } from '@/components/screens/step3/Processing';
import type { Step3Props } from '@/components/screens/step3/types';
import { ROUTES } from '@/lib/routes';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { TIMING } from '@/lib/config/timing';

// Client wrapper for the Processing wait (spine-wiring S2a). Owns the two side
// effects the pure Processing screen can't: triggering voice creation (now that
// it happens AFTER payment) and polling to `ready`, then handing to the Reveal.
// Poll cadence + give-up are the same constants the old voice-create view used.

const POLL_INTERVAL_MS = TIMING.VOICE_PROFILE_POLL_INTERVAL_MS;
const GIVE_UP_MS = TIMING.VOICE_PROFILE_GIVE_UP_MS;
// Hold the settled 'ready' frame briefly so the vault visibly comes to rest at
// the neutral-handoff before the Reveal builds from it (Motion Spec §7).
const NEUTRAL_HANDOFF_MS = 1400;

type GenStatus = Step3Props['generation']['status'];

// The shape of /start's JSON we act on. The route answers with a terminal
// verdict in several places; the client used to discard all of it.
interface StartResponse {
  status?: string;
  code?: string;
  retry_available?: boolean;
}

// Whether a /start answer describes a condition that polling cannot resolve.
// `retry_available: false` is the route's own verdict (attempt cap reached, or
// backoff exhausted → 429). The listed codes are input/setup problems — too few
// clips, clips too short, the lock failure — none of which change while we wait.
// Everything else (including a retryable vendor 502) stays on the wait, because
// the next attempt genuinely can succeed.
function isTerminalStart(httpStatus: number, body: StartResponse): boolean {
  if (body.retry_available === false) return true;
  if (httpStatus === 429) return true;
  return (
    body.code === 'INSUFFICIENT_CLIPS' ||
    body.code === 'CLIPS_TOO_SHORT' ||
    body.code === 'LOCK_FAILED'
  );
}

// voice_profile status → Processing generation status. The wait degrades by
// elapsed time, not error (handoff §4): a transient `failed` reads as the
// bounded-hold handoff; only give-up escalates to the SLA support tail.
//
// `startTerminal` is the fourth input and the reason this isn't purely
// time-based: when /start has already told us no further attempt is coming, the
// honest register is the support tail *now*, not after the give-up clock runs
// out. Waiting out a budget we know is spent showed users "we'll have it ready
// soon" over a generation that was never going to happen (2026-09-22).
function mapGeneration(profileStatus: string, gaveUp: boolean, startTerminal: boolean): GenStatus {
  if (profileStatus === 'ready') return 'ready';
  if (gaveUp || startTerminal) return 'unrecoverable';
  if (profileStatus === 'failed') return 'failed';
  return 'processing';
}

export function ProcessingActions({ voiceProfileId }: { voiceProfileId: string }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [genStatus, setGenStatus] = useState<GenStatus>('processing');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedRef = useRef(false);
  const navigatedRef = useRef(false);
  // Latched once /start reports a condition polling can't clear. A ref because
  // the poll closure reads it on every tick; the state below is what renders.
  const startTerminalRef = useRef(false);
  const [startTerminal, setStartTerminal] = useState(false);

  // Trigger voice creation once on mount — the /start call moved here from the
  // record flow, so it runs only after payment. /start is long-running and flips
  // the row to `processing` early; we don't await it for the UI (the poll below
  // drives the surface), and its terminal result is observed by that poll.
  //
  // We DO read the response, though. The row status alone can't distinguish "an
  // attempt is running" from "the route refused to start one", so discarding the
  // answer left a refusal reading as the happy-path wait indefinitely. A network
  // error is still swallowed on purpose: that one is genuinely unknown, and the
  // poll is the right authority for it.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const res = await fetch(`/api/voice-profiles/${voiceProfileId}/start`, { method: 'POST' });
      let body: StartResponse = {};
      try {
        body = (await res.json()) as StartResponse;
      } catch {
        // Non-JSON answer — fall through to the HTTP status alone.
      }
      if (isTerminalStart(res.status, body)) {
        startTerminalRef.current = true;
        setStartTerminal(true);
      }
    })().catch(() => {});
  }, [voiceProfileId]);

  // Poll status until ready / give-up.
  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      let profileStatus = 'processing';
      try {
        const res = await fetch(`/api/voice-profiles/${voiceProfileId}`);
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (typeof data.status === 'string') profileStatus = data.status;
        }
      } catch {
        // Network blip — treat as still processing and keep polling.
      }
      if (cancelled) return;

      const elapsed = Date.now() - startTime;
      const gaveUp = elapsed >= GIVE_UP_MS;
      setElapsedMs(elapsed);
      // Keep polling even on a terminal /start: if the operator clears the cause
      // (a freed vendor slot, a re-run) the row flips to `ready` and this page
      // recovers on its own instead of needing a reload.
      setGenStatus(mapGeneration(profileStatus, gaveUp, startTerminalRef.current));

      if (profileStatus === 'ready') {
        if (!navigatedRef.current) {
          navigatedRef.current = true;
          setTimeout(() => {
            if (!cancelled) router.push(ROUTES.vaultReveal);
          }, NEUTRAL_HANDOFF_MS);
        }
        return; // stop polling
      }
      if (gaveUp) return; // rest on the support tail; notify infra owns re-check

      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [voiceProfileId, router]);

  // /start's terminal verdict lands on the surface immediately rather than
  // waiting out a poll interval. A later `ready` from the poll still wins — the
  // operator can clear the cause while this page is open.
  const renderedStatus: GenStatus =
    genStatus === 'ready' ? 'ready' : startTerminal ? 'unrecoverable' : genStatus;

  // Processing reads only generation / a11y / entry (VaultObject is hardcoded
  // `sealed` inside the screen). The other §3 slices are unused defaults here.
  const props: Step3Props = {
    pricing: { plan: 'annual', annualPrice: '', monthlyPrice: '', monthlyEquivalent: '', trialDays: 0 },
    sample: { status: 'skipped', clipUrl: '', label: '' },
    vault: { phase: 'sealed', emberPresent: true, emberState: 'ignited' },
    checkout: { status: 'confirmed' },
    generation: { status: renderedStatus, elapsedMs, budgetMs: GIVE_UP_MS },
    notify: { armed: false, channel: 'email' },
    park: { active: false, recordingId: voiceProfileId },
    a11y: { reducedMotion },
    proof: null,
    component: 'Processing',
  };

  // onNotify: the "email me when it's ready" offer only appears on the give-up
  // tail. The transactional notify infra isn't built yet (see /dev/processing +
  // FOLLOW_UPS) — no-op for now rather than promise a mail that won't send.
  return <Processing {...props} entry="seal" onNotify={() => {}} />;
}
