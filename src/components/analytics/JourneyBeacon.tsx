'use client';

import { useEffect, useRef } from 'react';
import { trackJourney, type JourneyEvent } from '@/lib/analytics/journey';

/**
 * Fires a single journey.* event once on mount, then never again for the life
 * of the component. Lets a server component (e.g. the home page) emit a
 * client-side funnel event without becoming a client component itself — it
 * just renders <JourneyBeacon event="app_opened" /> as a thin shuttle.
 *
 * The ref guard makes it idempotent under React 18 StrictMode's double-mount
 * in dev, so a mount never double-counts the event.
 */
export function JourneyBeacon({
  event,
  props,
}: {
  event: JourneyEvent;
  props?: Record<string, unknown>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackJourney(event, props);
    // Fire strictly on mount — event/props are a fixed descriptor for this
    // render, not a reactive dependency we want to re-fire on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
