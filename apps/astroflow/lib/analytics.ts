'use client';
import { browserClient } from './supabase';

// Anonymous, privacy-absolute usage signal. We send ONLY an allowlisted event
// name + coarse screen + UI locale — never identity, never free text. The DB
// drops anything unknown. Fire-and-forget: a failed beacon never affects the UI.
//
// This is "collective memory of USE", not of users: it tells us which parts of
// AstralFlow people reach and where they stop, so we can keep improving — and it
// can never be traced back to a person.

// Mirror of the server allowlist so we never even send an unknown event.
export type TrackEvent =
  | 'view_home' | 'view_today' | 'view_chart' | 'view_map' | 'view_systems'
  | 'view_cosmos' | 'view_atlas' | 'view_dashboard' | 'view_dreams' | 'view_privacy'
  | 'view_profile' | 'wheel_opened' | 'wheel_detail' | 'reading_requested'
  | 'sky_read' | 'daily_read' | 'dream_posted' | 'dream_voted' | 'dream_ideate'
  | 'friend_search' | 'bond_requested' | 'flowme_opened' | 'guide_opened' | 'system_viewed';

const localeOf = () =>
  (typeof document !== 'undefined' && document.cookie.match(/(?:^|;\s*)af_lang=(\w+)/)?.[1]) || '';

// De-dupe repeated "view_" events within a session so counts mean "sessions that
// reached X", not "re-renders". Actions are always sent.
const seen = new Set<string>();

export function track(event: TrackEvent, screen = '') {
  try {
    if (event.startsWith('view_')) {
      if (seen.has(event)) return;
      seen.add(event);
    }
    // fire-and-forget; ignore all outcomes
    void browserClient().rpc('track_event', { p_event: event, p_screen: screen, p_locale: localeOf() });
  } catch {
    /* never let telemetry touch the UX */
  }
}

export function sendFeedback(kind: 'love' | 'confusing' | 'bug' | 'idea', note: string, screen = '') {
  return browserClient().rpc('submit_feedback', {
    p_kind: kind,
    p_note: note.slice(0, 1000),
    p_screen: screen,
    p_locale: localeOf(),
  });
}
