'use client';
import { useEffect } from 'react';
import { track, type TrackEvent } from '../../lib/analytics';

// Drop-in anonymous page-view beacon. Server pages render <TrackView event=… />;
// it fires once on mount and renders nothing. No PII, fire-and-forget.
export default function TrackView({ event, screen = '' }: { event: TrackEvent; screen?: string }) {
  useEffect(() => { track(event, screen); }, [event, screen]);
  return null;
}
