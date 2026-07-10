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

// voice_profile status → Processing generation status. The wait degrades by
// elapsed time, not error (handoff §4): a transient `failed` reads as the
// bounded-hold handoff; only give-up escalates to the SLA support tail.
function mapGeneration(profileStatus: string, gaveUp: boolean): GenStatus {
  if (profileStatus === 'ready') return 'ready';
  if (gaveUp) return 'unrecoverable';
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

  // Trigger voice creation once on mount — the /start call moved here from the
  // record flow, so it runs only after payment. /start is long-running and flips
  // the row to `processing` early; we don't await it for the UI (the poll below
  // drives the surface), and its terminal result is observed by that poll. A
  // failed trigger surfaces as a non-`ready` status → the give-up handoff; no
  // dead end (Step 10).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    fetch(`/api/voice-profiles/${voiceProfileId}/start`, { method: 'POST' }).catch(() => {});
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
      setGenStatus(mapGeneration(profileStatus, gaveUp));

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

  // Processing reads only generation / a11y / entry (VaultObject is hardcoded
  // `sealed` inside the screen). The other §3 slices are unused defaults here.
  const props: Step3Props = {
    pricing: { plan: 'annual', annualPrice: '', monthlyPrice: '', monthlyEquivalent: '', trialDays: 0 },
    sample: { status: 'skipped', clipUrl: '', label: '' },
    vault: { phase: 'sealed', emberPresent: true, emberState: 'ignited' },
    checkout: { status: 'confirmed' },
    generation: { status: genStatus, elapsedMs, budgetMs: GIVE_UP_MS },
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
